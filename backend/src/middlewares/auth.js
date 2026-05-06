const { admin } = require("../config/firebase")
// middleware de autenticação, verifica token do Firebase e adiciona dados do usuário na requisição
module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json("Token não enviado")
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)

    req.user = decoded
    next()

  } catch (err) {
    return res.status(401).json("Token inválido")
  }
}