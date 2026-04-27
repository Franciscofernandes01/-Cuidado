const cron = require("node-cron")
const { db } = require("../config/firebase")
const { enviarNotificacao } = require("../services/notificationService")

cron.schedule("* * * * *", async () => {
  console.log("🔎 Verificando horários de medicamentos...")

  const agora = new Date()

  const horaAtual = agora.toTimeString().slice(0, 5) // "HH:MM"

  try {
    const snapshot = await db.collection("medicamentos").get()

    for (const doc of snapshot.docs) {
      const med = doc.data()

      if (!med.horarios || !med.pacienteId) continue

      // verifica se o horário atual bate com algum horário do remédio
      const deveTomarAgora = med.horarios.includes(horaAtual)

      if (!deveTomarAgora) continue

      // evita spam (já tomou hoje?)
      const hoje = agora.toISOString().split("T")[0]

      if (med.tomadasHoje?.includes(hoje)) continue

      // pega paciente
      const userDoc = await db.collection("usuarios").doc(med.pacienteId).get()
      const user = userDoc.data()

      if (!user?.fcmToken) continue
      // 🔥 envia notificação
      await enviarNotificacao(
        user.fcmToken,
        "💊 Hora do remédio",
        `Está na hora de tomar: ${med.nome}`
      )
      // marca que já notificou hoje
      await doc.ref.update({
        notificado: true,
        ultimoHorarioNotificado: horaAtual
      })

      console.log(`✔ Notificação enviada: ${med.nome}`)
    }

  } catch (err) {
    console.log(" Erro no cron:", err)
  }
})