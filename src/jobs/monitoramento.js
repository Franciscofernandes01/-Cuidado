const cron = require("node-cron")
const { db } = require("../config/firebase")
const { enviarNotificacao } = require("../services/notificationService")

cron.schedule("* * * * *", async () => {
  console.log("Verificando medicamentos...")

  const agora = new Date()

  try {
    const snapshot = await db
      .collection("medicamentos")
      .where("tomado", "==", false)
      .get()

    for (const doc of snapshot.docs) {
      const med = doc.data()

      if (!med.createdAt) continue

      // simulação simples de horário (ajuste se tiver horário real depois)
      const criadoEm = med.createdAt.toDate
        ? med.createdAt.toDate()
        : new Date(med.createdAt)

      // 🔥 lógica simples: alerta se passou do tempo (exemplo)
      const limite = new Date(criadoEm.getTime() + 60 * 60 * 1000)

      if (agora >= limite) {

        const userDoc = await db
          .collection("usuarios")
          .doc(med.pacienteId)
          .get()

        const user = userDoc.data()

        if (user?.fcmToken) {
          await enviarNotificacao(
            user.fcmToken,
            "Hora do remédio 💊",
            `Não esqueça de tomar: ${med.nome}`
          )
        }

        await doc.ref.update({ notificado: true })

        console.log(`Notificação enviada para medicamento ${doc.id}`)
      }
    }

  } catch (err) {
    console.log("Erro no monitoramento:", err)
  }
})