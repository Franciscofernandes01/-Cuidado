/*const cron = require("node-cron")
const { db } = require("../config/firebase")
const { enviarNotificacao } = require("../services/notificationService")

cron.schedule("* * * * *", async () => {
  console.log("Verificando por usuários...")

  const agora = new Date()
  const hoje = agora.toISOString().split("T")[0]

  try {
    // pega todos os usuários
    const usuariosSnap = await db.collection("usuarios").get()

    for (const userDoc of usuariosSnap.docs) {
      const user = userDoc.data()
      const userId = userDoc.id

      // só pacientes
      if (user.tipo !== "paciente") continue

      //tokens (paciente + familiar)
      let tokens = []

      if (user.fcmToken) {
        tokens.push(user.fcmToken)
      }

      if (user.familiarId) {// busca token do familiar vinculado
        const famDoc = await db.collection("usuarios").doc(user.familiarId).get()
        const familiar = famDoc.data()

        if (familiar?.fcmToken) {
          tokens.push(familiar.fcmToken)
        }
      }

      if (tokens.length === 0) continue

      //busca medicamentos DO USUÁRIO
      const medsSnap = await db
        .collection("medicamentos")
        .where("pacienteId", "==", userId)
        .get()

      for (const doc of medsSnap.docs) {
        const med = doc.data()

        if (!med.frequencia || !med.ultimoTomadoEm) continue

        // ================= ESTOQUE =================
        if ((med.estoque ?? 0) <= 5) {
          if (med.alertaEstoqueEnviado !== hoje) {

            console.log(`Estoque baixo: ${med.nome}`)

            for (const token of tokens) {
              await enviarNotificacao(
                token,
                "Estoque baixo!",
                `O medicamento ${med.nome} está acabando`
              )
            }

            await doc.ref.update({// atualiza para não enviar mais de um alerta por dia
              alertaEstoqueEnviado: hoje
            })
          } else {
            console.log("ALERTA ESTOQUE JÁ ENVIADO HOJE!!")
          }
        }

        // ================= FREQUÊNCIA =================
        
        const ultimo = med.ultimoTomadoEm.toDate()// calcula horário do próximo medicamento baseado no último tomado + frequência

        const proximoHorario = new Date(
          ultimo.getTime() + med.frequencia * 60 * 60 * 1000
        )

        const diff = agora - proximoHorario
        console.log("⏱️ DIFF:", diff)
        const deveNotificar = diff >= 0 && diff < 300000// notifica se estiver entre 0 e 5 minutos atrasado

        if (!deveNotificar) continue

        const identificador = proximoHorario.toISOString()// usa horário do próximo medicamento como identificador único para evitar notificações duplicadas

        if (
          med.ultimoHorarioNotificado === identificador &&
          med.ultimoDiaNotificado === hoje
        ) continue

        console.log(`Hora do remédio: ${med.nome}`)

        for (const token of tokens) {// envia para paciente e familiar
          console.log("Enviando para:", token)

          await enviarNotificacao(
            token,
            "Hora do remédio",
            `Está na hora de tomar: ${med.nome}`
          )
        }

        await doc.ref.update({
          ultimoHorarioNotificado: identificador,
          ultimoDiaNotificado: hoje
        })

        console.log(`Notificação enviada: ${med.nome}`)
      }
    }

  } catch (err) {
    console.log("Erro no cron:", err)
  }

})*/
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
