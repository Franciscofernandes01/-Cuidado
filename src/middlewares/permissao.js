const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userTipo)) {
      return res.status(403).json("Acesso negado")
    }
    next()
  }
}

module.exports = checkRole