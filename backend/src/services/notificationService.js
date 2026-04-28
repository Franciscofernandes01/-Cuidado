const { admin, db } = require("../config/firebase")

//  envia notificação para um usuário
async function enviarNotificacao(uid, titulo, mensagem) {
  try {
    // busca usuário no Firestore
    const userDoc = await db.collection("usuarios").doc(uid).get()

    if (!userDoc.exists) {
      console.log("Usuário não encontrado")
      return
    }

    const user = userDoc.data()

    // precisa ter o token do celular
    if (!user.fcmToken) {
      console.log("Usuário sem FCM Token")
      return
    }

    const message = {
      notification: {
        title: titulo,
        body: mensagem
      },
      token: user.fcmToken
    }

    await admin.messaging().send(message)

    console.log("Notificação enviada para:", uid)

  } catch (err) {
    console.log("Erro ao enviar notificação:", err.message)
  }
}

module.exports = { enviarNotificacao }