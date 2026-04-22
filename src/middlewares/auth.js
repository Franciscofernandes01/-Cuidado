/*const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {// Middleware de autenticação
  const token = req.headers.authorization

  if (!token) return res.status(401).json("Sem token")

  const token1 = token.split(" ")[1];

  try { // Verifica o token e extrai o ID do usuário
    const decoded = jwt.verify(token1, process.env.JWT_SECRET)
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json("Token inválido")
  }
}*/
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Sem token" });
  }

  // Verifica se está no formato correto: "Bearer token"
  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({ erro: "Formato do token inválido" });
  }

  const [scheme, token] = parts;

  if (scheme !== "Bearer") {
    return res.status(401).json({ erro: "Formato inválido, use Bearer" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userTipo = decoded.tipo; // Armazena o tipo do usuário no objeto de requisição
    return next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
};

