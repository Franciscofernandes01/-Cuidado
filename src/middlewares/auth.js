const { admin } = require("../config/firebase")

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ erro: "Sem token" })
  }

  const parts = authHeader.split(" ")

  if (parts.length !== 2) {
    return res.status(401).json({ erro: "Formato do token inválido" })
  }

  const [scheme, token] = parts

  if (scheme !== "Bearer") {
    return res.status(401).json({ erro: "Use Bearer token" })
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)

    req.user = decoded // 🔥 padrão único
    return next()

  } catch (err) {
    console.log("ERRO FIREBASE:", err)
    return res.status(401).json({
      erro: "Token inválido ou expirado",
      detalhes: err.message
    })
  }
}