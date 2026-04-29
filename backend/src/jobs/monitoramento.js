const cron = require("node-cron")
const { db } = require("../config/firebase")
const { enviarNotificacao } = require("../services/notificationService")

cron.schedule("* * * * *", async () => {
  console.log("Verificando horários de medicamentos...")

  const agora = new Date()// pega hora atual no formato "HH:MM" e data atual "YYYY-MM-DD"
  const horaAtual = agora.toTimeString().slice(0, 5) // "HH:MM"
  const hoje = agora.toISOString().split("T")[0]// "YYYY-MM-DD"

  try {
    const snapshot = await db.collection("medicamentos").get()// pega todos os medicamentos

    for (const doc of snapshot.docs) {// para cada medicamento
      const med = doc.data()// se não tiver pacienteId, ignora

      if (!med.pacienteId) continue

      // pega paciente uma vez só
      const userDoc = await db.collection("usuarios").doc(med.pacienteId).get()
      const user = userDoc.data()

      if (!user?.fcmToken) continue// se paciente não tiver token, ignora

      //alerta de estoque baixo
      if ((med.estoque ?? 0) <= 5) {
        if (med.alertaEstoqueEnviado !== hoje) {// evita spam diário do alerta de estoque baixo
          await enviarNotificacao(
            user.fcmToken,
            "Estoque baixo!",
            `O medicamento ${med.nome} está acabando`
          )

          await doc.ref.update({
            alertaEstoqueEnviado: hoje
          })

          console.log(`Alerta de estoque enviado: ${med.nome}`)
        }
      }

      //horário de tomar o remédio
      if (!med.horarios || !Array.isArray(med.horarios)) continue// se não tiver horários, ignora

      const deveTomarAgora = med.horarios.includes(horaAtual)// se o horário atual estiver na lista de horários do medicamento

      if (!deveTomarAgora) continue// se não for para tomar agora, ignora

      // evita spam por horário/dia
      if (
        med.ultimoHorarioNotificado === horaAtual &&
        med.ultimoDiaNotificado === hoje
      ) continue

      // envia notificação
      await enviarNotificacao(
        user.fcmToken,
        "Hora do remédio",
        `Está na hora de tomar: ${med.nome}`
      )

      //salva controle
      await doc.ref.update({
        ultimoHorarioNotificado: horaAtual,
        ultimoDiaNotificado: hoje
      })

      console.log(`Notificação enviada: ${med.nome}`)
    }

  } catch (err) {
    console.log("Erro no cron:", err)
  }
})