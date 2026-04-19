const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {// Middleware de autenticação
  const token = req.headers.authorization
  
  if (!token) return res.status(401).json("Sem token")

  try { // Verifica o token e extrai o ID do usuário
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json("Token inválido")
  }
}