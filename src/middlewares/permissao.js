const { db } = require("../config/firebase")

const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      const userDoc = await db
        .collection("usuarios")
        .doc(req.user.uid)
        .get()

      if (!userDoc.exists) {
        return res.status(404).json({ erro: "Usuário não encontrado no sistema" })
      }

      const user = userDoc.data()

      if (!user.tipo) {
        return res.status(400).json({ erro: "Tipo de usuário não definido" })
      }

      if (!roles.includes(user.tipo)) {
        return res.status(403).json({ erro: "Acesso negado" })
      }

      req.userTipo = user.tipo
      req.userData = user // 🔥 melhora muito o sistema

      return next()

    } catch (err) {
      console.log("ERRO CHECKROLE:", err)
      return res.status(500).json({ erro: "Erro ao verificar permissão" })
    }
  }
}

module.exports = checkRole