const { admin, db } = require("../config/firebase")

// envia notificação diretamente usando o FCM Token
async function enviarNotificacao(fcmToken, titulo, mensagem) {
  try {
    if (!fcmToken) {
      console.log("Token FCM inválido ou inexistente")
      return
    }

    const message = {
      token: fcmToken,
      notification: {
        title: titulo,
        body: mensagem
      }
    }

    const response = await admin.messaging().send(message)

    console.log("Notificação enviada com sucesso:", response)

  } catch (err) {
    console.log("Erro ao enviar notificação:", err.message)
  }
}

module.exports = { enviarNotificacao }