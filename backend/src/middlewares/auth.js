const { admin } = require("../config/firebase")

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json("Sem token")
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)

    req.user = decoded
    next()

  } catch (err) {
    return res.status(401).json("Token inválido")
  }
}