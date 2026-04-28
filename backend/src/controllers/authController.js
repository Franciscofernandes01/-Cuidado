
const { admin, db } = require("../config/firebase")

exports.googleLogin = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Token não enviado" })
  }

  try {
    //  valida token do Firebase
    const decoded = await admin.auth().verifyIdToken(token)

    const { uid, email, name, picture } = decoded

    // verifica se já existe no banco
    let userRef = db.collection("usuarios").doc(uid)
    let userDoc = await userRef.get()

    if (!userDoc.exists) {
      // cria usuário automaticamente
      await userRef.set({
        uid,
        email,
        nome: name,
        foto: picture,
        criadoEm: new Date(),
        role: "paciente" // ou "familiar"
      })
    }

    return res.json({
      message: "Login com Google realizado",
      uid
    })

  } catch (err) {
    return res.status(401).json({ error: "Token inválido" })
  }
}

   