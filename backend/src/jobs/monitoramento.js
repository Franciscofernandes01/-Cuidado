const cron = require("node-cron");
const { db } = require("../config/firebase");
const { enviarNotificacao } = require("../services/notificationService");

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
        if ((med.estoque ?? 0) <= 5) {
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

        let proximo = new Date(ultimo);
        let dosesPendentes = 0;
        let historicoAtualizado = [...(med.historico || [])];

        while (proximo <= agora) {
          const diff = agora - proximo;

          let status = "pendente";

          if (diff > 300000) {
            status = "atrasado";
          }

          // conta pendentes (mantém comportamento antigo)
          if (diff >= 0) {
            dosesPendentes++;
          }

          const jaExiste = historicoAtualizado.find(
            (h) => h.horarioPrevisto === proximo.toISOString(),
          );

          if (!jaExiste) {
            historicoAtualizado.push({
              horarioPrevisto: proximo.toISOString(),
              dataRegistro: agora,
              status,
            });
          }

          proximo = new Date(proximo.getTime() + freqMs);
        }

        // remove o último tomado da contagem
        dosesPendentes = Math.max(dosesPendentes - 1, 0);

        console.log(`${med.nome} → doses pendentes:`, dosesPendentes);

        if (dosesPendentes === 0) {
          await doc.ref.update({ historico: historicoAtualizado });
          continue;
        }

        // próxima dose futura
        const proximaDose = proximo;
        const diff = agora - proximaDose;

        const deveNotificar = diff >= 0 && diff < 300000;

        const identificador = proximaDose.toISOString();

        if (
          med.ultimoHorarioNotificado === identificador &&
          med.ultimoDiaNotificado === hoje
        ) {
          await doc.ref.update({ historico: historicoAtualizado });
          continue;
        }

        const mensagem =
          dosesPendentes === 1
            ? `Está na hora de tomar: ${med.nome}`
            : `Você tem ${dosesPendentes} doses pendentes de ${med.nome}`;

        for (const token of tokens) {
          console.log("Enviando para:", token);

          await enviarNotificacao(token, "Lembrete de medicamento", mensagem);
        }

        historicoAtualizado.push({
          horarioPrevisto: proximaDose.toISOString(),
          dataRegistro: agora,
          status: "notificado",
        });

        await doc.ref.update({
          ultimoHorarioNotificado: identificador,
          ultimoDiaNotificado: hoje,
          historico: historicoAtualizado,
        });

        console.log(`Notificação enviada: ${med.nome}`);
      }
    }
  } catch (err) {
    console.log("Erro no cron:", err);
  }
});
