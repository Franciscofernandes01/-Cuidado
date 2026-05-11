const admin = require("firebase-admin")

let db = null

if (process.env.NODE_ENV !== "test") {

  const serviceAccount = require(("../../firebase-key.json"))

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
  }

  db = admin.firestore()
}

module.exports = { admin, db }