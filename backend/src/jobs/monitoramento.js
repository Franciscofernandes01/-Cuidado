const cron = require("node-cron")
const { db } = require("../config/firebase")
const { enviarNotificacao } = require("../services/notificationService")

cron.schedule("* * * * *", async () => {
  console.log("🔎 Verificando horários de medicamentos...")

  const agora = new Date()
  const horaAtual = agora.toTimeString().slice(0, 5) // "HH:MM"
  const hoje = agora.toISOString().split("T")[0]

  try {
    const snapshot = await db.collection("medicamentos").get()

    for (const doc of snapshot.docs) {
      const med = doc.data()

      if (!med.pacienteId) continue

      // 🔥 pega paciente UMA vez só
      const userDoc = await db.collection("usuarios").doc(med.pacienteId).get()
      const user = userDoc.data()

      if (!user?.fcmToken) continue

      // =========================
      // 🔥 ALERTA DE ESTOQUE (ANTI-SPAM)
      // =========================
      if ((med.estoque ?? 0) <= 5) {
        if (med.alertaEstoqueEnviado !== hoje) {
          await enviarNotificacao(
            user.fcmToken,
            "⚠ Estoque baixo",
            `O medicamento ${med.nome} está acabando`
          )

          await doc.ref.update({
            alertaEstoqueEnviado: hoje
          })

          console.log(`⚠ Alerta de estoque enviado: ${med.nome}`)
        }
      }

      // =========================
      // 🔥 HORÁRIO DO REMÉDIO
      // =========================
      if (!med.horarios || !Array.isArray(med.horarios)) continue

      const deveTomarAgora = med.horarios.includes(horaAtual)

      if (!deveTomarAgora) continue

      // 🔥 evita spam por horário/dia
      if (
        med.ultimoHorarioNotificado === horaAtual &&
        med.ultimoDiaNotificado === hoje
      ) continue

      // 🔥 envia notificação
      await enviarNotificacao(
        user.fcmToken,
        "💊 Hora do remédio",
        `Está na hora de tomar: ${med.nome}`
      )

      // 🔥 salva controle
      await doc.ref.update({
        ultimoHorarioNotificado: horaAtual,
        ultimoDiaNotificado: hoje
      })

      console.log(`✔ Notificação enviada: ${med.nome}`)
    }

  } catch (err) {
    console.log("❌ Erro no cron:", err)
  }
})