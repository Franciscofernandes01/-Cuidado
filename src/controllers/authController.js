const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

exports.register = async (req, res) => { // Rota de registro
  try {
    const { nome, email, senha, tipo } = req.body

    //  validação de campos
    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ erro: "Preencha todos os campos" })
    }

    //  verifica se já existe usuário
    const userExistente = await User.findOne({ email })
    if (userExistente) {
      return res.status(400).json({ erro: "Usuário já cadastrado" })
    }

    //  criptografia da senha
    const hash = await bcrypt.hash(senha, 10)

    const user = await User.create({
      nome,
      email,
      senha: hash,
      tipo
    })

    //  remove senha da resposta
    const userSemSenha = user.toObject()
    delete userSemSenha.senha

    res.status(201).json(userSemSenha)

  } catch (err) {
    //  erro de email duplicado no MongoDB
    if (err.code === 11000) {
      return res.status(400).json({ erro: "Email já cadastrado" })
    }

    res.status(500).json({ erro: "Erro ao registrar usuário" })
  }
}

exports.login = async (req, res) => { // Rota de login
  try {
    const { email, senha } = req.body

    //  validação básica
    if (!email || !senha) {
      return res.status(400).json({ erro: "Email e senha são obrigatórios" })
    }

    const user = await User.findOne({ email })// Busca o usuário pelo email
    if (!user) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const valid = await bcrypt.compare(senha, user.senha)
    if (!valid) {
      return res.status(401).json({ erro: "Senha inválida" })
    }

    const token = jwt.sign(
      { id: user._id, tipo: user.tipo },
      process.env.JWT_SECRET
    )

    res.json({ token })

  } catch (err) {
    res.status(500).json({ erro: "Erro ao fazer login" })
  }
}