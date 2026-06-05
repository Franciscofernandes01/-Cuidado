importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyCbZqAiPeIFl2XDDLyNqk21JCv9UN44Fqg",
  authDomain: "maiscuidado-8e767.firebaseapp.com",
  projectId: "maiscuidado-8e767",
  messagingSenderId: "837424163135",
  appId: "1:837424163135:web:26a73889255c684aab4b8a"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(function (payload) {// quando receber mensagem em background (app fechada ou em segundo plano)
  console.log("Mensagem em background:", payload)// mostra notificação mesmo com app fechado

  self.registration.showNotification(payload.notification.title, {// exibe notificação
    body: payload.notification.body// texto da notificação
  })
})