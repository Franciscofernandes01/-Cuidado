const admin = require("firebase-admin")
const serviceAccount = require("../../firebase-key.json")

admin.initializeApp({// Inicializa o Firebase Admin SDK com as credenciais do serviço
  credential: admin.credential.cert(serviceAccount)
})

const message = {
  notification: {
    title: "Hora do remédio 💊",
    body: "Você esqueceu de tomar seu medicamento!"
  },
  token: "TOKEN_DO_USUARIO"
}

admin.messaging().send(message)

module.exports = admin