const cron = require("node-cron");
const { db } = require("../config/firebase");
const { enviarNotificacao } = require("../services/notificationService");
const admin = require("firebase-admin");


cron.schedule("* * * * *", async () => {
  console.log("Verificando por usuários...");

  const agora = new Date();
  const hoje = agora.toISOString().split("T")[0];

  try {
    const usuariosSnap = await db.collection("usuarios").get();

    for (const userDoc of usuariosSnap.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;

      if (user.tipo !== "paciente") continue;

      // ================= TOKENS =================
      let tokens = [];

      if (user.fcmToken) tokens.push(user.fcmToken);

      if (user.familiarId) {
        const famDoc = await db
          .collection("usuarios")
          .doc(user.familiarId)
          .get();
        const familiar = famDoc.data();

        if (familiar?.fcmToken) {
          tokens.push(familiar.fcmToken);
        }
      }

      if (tokens.length === 0) continue;

      // ================= STATUS DO PACIENTE =================

      const ultimo = user.ultimoOnline?.toDate?.();
      const agora = new Date();

      const tempoOffline = ultimo ? agora - ultimo : null;

      const offline = tempoOffline && tempoOffline > 30 * 60 * 1000; // 30 min
      const bateriaBaixa = (user.bateria ?? 100) <= 20;

      // controle para evitar spam
      const hoje = agora.toISOString().split("T")[0];

      // ================= ALERTA OFFLINE =================
      if (offline) {
        if (user.alertaOfflineEnviado !== hoje) {
          console.log(`Paciente offline: ${user.nome}`);

          for (const token of tokens) {
            await enviarNotificacao(
              token,
              "Paciente offline",
              `${user.nome} está offline há mais de 30 minutos`,
            );
          }

          await userDoc.ref.update({
            alertaOfflineEnviado: hoje,
          });
        }
      }

      // ================= ALERTA BATERIA =================
      if (bateriaBaixa) {
        if (user.alertaBateriaEnviado !== hoje) {
          console.log(`Bateria baixa: ${user.nome}`);

          for (const token of tokens) {
            await enviarNotificacao(
              token,
              "Bateria baixa",
              `${user.nome} está com bateria em ${user.bateria || 0}%`,
            );
          }

          await userDoc.ref.update({
            alertaBateriaEnviado: hoje,
          });
        }
      }

      // ================= MEDICAMENTOS =================
      const medsSnap = await db
        .collection("medicamentos")
        .where("pacienteId", "==", userId)
        .get();

      for (const doc of medsSnap.docs) {
        const med = doc.data();

        // ================= ESTOQUE =================
        if ((med.estoque ?? 0) <= (med.estoqueMinimo ?? 0)) {
          if (med.alertaEstoqueEnviado !== hoje) {
            console.log(`Estoque baixo: ${med.nome}`);

            for (const token of tokens) {
              await enviarNotificacao(
                token,
                "Estoque baixo!",
                `O medicamento ${med.nome} está acabando`,
              );
            }

            await doc.ref.update({
              alertaEstoqueEnviado: hoje,
            });
          }
        }

        // ================= FREQUÊNCIA =================
        if (!med.frequencia || !med.ultimoTomadoEm) continue;

        const ultimo = med.ultimoTomadoEm.toDate();

        const freqMs = med.frequencia * 60 * 60 * 1000;

        let horarioDose = new Date(ultimo.getTime() + freqMs);

        const diff = agora - horarioDose;

        // ainda não chegou a próxima dose
        if (diff < 0) continue;

        const identificador = horarioDose.toISOString();// para controle anti-spam

        let historicoAtualizado = [...(med.historico || [])];// para manter histórico de notificações e atrasos

        let tipoNotificacao = null;// para controle do tipo de notificação a ser enviada

        let titulo = "";
        let mensagem = "";

        // NA HORA DO REMÉDIO
        if (
          diff >= 0 &&
          diff < 60000 &&
          med.ultimoHorarioNotificado !== identificador
        ) {
          tipoNotificacao = "medicine";

          titulo = "Hora do medicamento";

          mensagem = `Está na hora de tomar ${med.nome}`;
        }

        // ATRASADO 10 MIN
        else if (
          diff >= 10 * 60 * 1000 &&
          med.ultimoHorarioAtrasado !== identificador
        ) {
          tipoNotificacao = "medicine";

          titulo = " Medicamento atrasado";

          mensagem = `${med.nome} está atrasado há mais de 10 minutos`;
        }

        // sem notificação
        if (!tipoNotificacao) continue;

        // ENVIA DATA MESSAGE
        for (const token of tokens) {
          console.log("Enviando para:", token);

          await admin.messaging().send({
            token,

            data: {
              type: "medicine",

              medicineName: med.nome,

              medicineDose: med.dosagem,

              title: titulo,

              body: mensagem,
            },

            android: {
              priority: "high",
            },

            apns: {
              payload: {
                aps: {
                  contentAvailable: true,

                  sound: "default",

                  badge: 1,
                },
              },
            },
          });
        }

        // HISTÓRICO
        historicoAtualizado.push({
          horarioPrevisto: identificador,

          dataRegistro: agora,

          status: titulo.includes("atrasado") ? "atrasado" : "notificado",
        });

        // CONTROLE ANTI-SPAM
        const updateData = {
          historico: historicoAtualizado,
        };

        if (titulo.includes("atrasado")) {
          updateData.ultimoHorarioAtrasado = identificador;
        } else {
          updateData.ultimoHorarioNotificado = identificador;
        }

        await doc.ref.update(updateData);

        console.log(`Notificação enviada: ${med.nome}`);
      }
    }
  } catch (err) {
    console.log("Erro no cron:", err);
  }
});
