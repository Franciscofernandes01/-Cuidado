const cron = require("node-cron");
const { db } = require("../config/firebase");
const { enviarNotificacao } = require("../services/notificationService");
const admin = require("firebase-admin");

async function executarMonitoramento() { //
    console.log("Verificando por usuários...");

    const agora = new Date();
    const hoje = agora.toISOString().split("T")[0];

    try {
      const usuariosSnap = await db.collection("usuarios").get();// busca todos os usuários

      for (const userDoc of usuariosSnap.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;

        if (user.tipo !== "paciente") continue;// só monitora pacientes

        // ================= TOKENS =================

        let tokens = [];

        if (user.fcmToken) {
          tokens.push(user.fcmToken);
        }

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


        const tempoOffline = ultimo ? agora - ultimo : null;

        const offline = tempoOffline && tempoOffline > 30 * 60 * 1000;

        const bateriaBaixa = (user.bateria ?? 100) <= 20;

        // controle anti-spam
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
            // evita spam diário
            if (med.alertaEstoqueEnviado !== hoje) {
              console.log(`Estoque baixo: ${med.nome}`);

              // remove tokens duplicados
              tokens = [...new Set(tokens)];

              for (const token of tokens) {
                try {
                  console.log("Enviando alerta estoque para:", token);

                  await admin.messaging().send({
                    // envia notificação push de estoque baixo para paciente e familiar
                    token,

                    notification: {
                      title: "Estoque baixo!",

                      body: `O medicamento ${med.nome} está acabando`,
                    },

                    data: {
                      type: "low_stock",

                      medicineName: med.nome,

                      medicineDose: med.dosagem ?? "",

                      title: "Estoque baixo!",

                      body: `O medicamento ${med.nome} está acabando`,
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
                } catch (err) {
                  console.log("Erro ao enviar alerta estoque:", err.code);

                  // token inválido/removido
                  if (
                    err.code === "messaging/registration-token-not-registered"
                  ) {
                    console.log("Token inválido removido");

                    // remove token do paciente
                    if (user.fcmToken === token) {
                      await userDoc.ref.update({
                        fcmToken: null,
                      });
                    }

                    // remove token do familiar
                    if (user.familiarId) {
                      const famRef = db
                        .collection("usuarios")
                        .doc(user.familiarId);

                      const famDoc = await famRef.get();

                      if (famDoc.exists) {
                        const familiar = famDoc.data();

                        if (familiar?.fcmToken === token) {
                          await famRef.update({
                            fcmToken: null,
                          });
                        }
                      }
                    }
                  }
                }
              }

              // marca envio do dia
              await doc.ref.update({
                alertaEstoqueEnviado: hoje,
              });

              console.log(`Alerta de estoque enviado: ${med.nome}`);
            }
          }

          // ================= FREQUÊNCIA =================

          if (!med.frequencia || !med.ultimoTomadoEm) continue;

          const ultimo = med.ultimoTomadoEm.toDate(); // data do último registro de tomada

          const freqMs = med.frequencia * 60 * 60 * 1000; // frequência em milissegundos

          // calcula horário esperado
          let horarioDose = new Date(ultimo.getTime() + freqMs);

          // diferença entre agora e horário
          const diff = agora - horarioDose;

          // ainda não chegou a próxima dose
          if (diff < 0) continue;

          // identificador único da dose
          const identificador = horarioDose.toISOString();

          // verifica se esta dose já foi confirmada
          const doseConfirmada = (med.historico || []).some(
            (h) => h.horarioPrevisto === identificador && h.status === "tomado",
          );

          // se já tomou, não envia mais nenhum alerta
          if (doseConfirmada) {
            continue;
          }

          // histórico
          let historicoAtualizado = [...(med.historico || [])];

          let tipoNotificacao = null;

          let titulo = "";

          let mensagem = "";

          // ================= HORA DO REMÉDIO =================
          // 1. HORA DO REMÉDIO: Se já passou do horário e a primeira notificação não foi enviada
          if (
            med.ultimoHorarioNotificado !== identificador &&
            diff < 10 * 60 * 1000
          ) {
            tipoNotificacao = "medicine";
            titulo = "Hora do medicamento";
            mensagem = `Está na hora de tomar ${med.nome}`;
          }
          // 2. ATRASADO 10 MIN: Se já passou de 10 min, não foi enviado o alerta de atraso, mas ainda não deu 30 min
          else if (
            diff >= 10 * 60 * 1000 &&
            diff < 30 * 60 * 1000 &&
            med.ultimoHorarioAtrasado !== identificador
          ) {
            tipoNotificacao = "medicine";
            titulo = "Medicamento atrasado";
            mensagem = `${med.nome} está atrasado há mais de 10 minutos`;
          }
          // 3. NÃO CONFIRMADO 30 MIN: Se já passou de 30 min e o crítico não foi enviado
          else if (
            diff >= 30 * 60 * 1000 &&
            med.ultimoHorarioCritico !== identificador
          ) {
            tipoNotificacao = "medicine_urgent";
            titulo = "Medicamento não confirmado";
            mensagem = `${med.nome} não foi confirmado há mais de 30 minutos`;
          }

          // sem notificação (caso caia nas brechas após já ter enviado)
          if (!tipoNotificacao) continue;

          // ================= ENVIA PUSH =================

          for (const token of tokens) {
            try {
              console.log("Enviando para:", token);

              await admin.messaging().send({
                // envia notificação push de horário do medicamento para paciente e familiar
                token,

                notification: {
                  title: titulo,
                  body: mensagem,
                },

                data: {
                  type: tipoNotificacao,

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
            } catch (err) {
              console.log("Erro ao enviar push:", err.code);

              // token inválido
              if (err.code === "messaging/registration-token-not-registered") {
                console.log("Token inválido removido");

                // remove token do paciente
                if (user.fcmToken === token) {
                  await userDoc.ref.update({
                    fcmToken: null,
                  });
                }

                // remove token do familiar
                if (user.familiarId) {
                  const famRef = db.collection("usuarios").doc(user.familiarId);

                  const famDoc = await famRef.get();

                  const familiar = famDoc.data();

                  if (familiar?.fcmToken === token) {
                    await famRef.update({
                      fcmToken: null,
                    });
                  }
                }
              }
            }
          }

          // ================= HISTÓRICO =================

          historicoAtualizado.push({
            horarioPrevisto: identificador,

            dataRegistro: agora,

            status: titulo.includes("atrasado")
              ? "atrasado"
              : titulo.includes("não confirmado")
                ? "critico"
                : "notificado",
          });

          // ================= CONTROLE ANTI-SPAM =================

          const updateData = {
            historico: historicoAtualizado,
          };

          if (titulo.includes("não confirmado")) {
            updateData.ultimoHorarioCritico = identificador;
          } else if (titulo.includes("atrasado")) {
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
}

if (process.env.NODE_ENV !== "test") { // roda a cada minuto
  cron.schedule("* * * * *", executarMonitoramento);
}

module.exports = {
  executarMonitoramento,
};