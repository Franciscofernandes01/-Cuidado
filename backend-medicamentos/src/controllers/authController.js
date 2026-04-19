const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

exports.register = async (req, res) => {
  const { nome, email, senha, tipo } = req.body

  const hash = await bcrypt.hash(senha, 10)

  const user = await User.create({
    nome,
    email,
    senha: hash,
    tipo
  })

  res.json(user)
}

exports.login = async (req, res) => {
  const { email, senha } = req.body

  const user = await User.findOne({ email })
  if (!user) return res.status(404).json("Usuário não encontrado")

  const valid = await bcrypt.compare(senha, user.senha)
  if (!valid) return res.status(401).json("Senha inválida")

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

  res.json({ token })
}