const router = require("express").Router()
const authController = require("../controllers/authController")
const auth = require("../middlewares/auth")
const User = require("../models/User")

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Rotas de autenticação do sistema
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "João Silva"
 *             email: "joao@email.com"
 *             senha: "123456"
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Erro ao registrar usuário
 */
router.post("/register", authController.register)// Rota de registro

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realizar login
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "joao@email.com"
 *             senha: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
router.post("/login", authController.login)// Rota de login

 /**
 * @swagger
 * /usuarios/vincular:
 *   post:
 *     summary: Vincula um familiar a um paciente
 *     description: Apenas usuários do tipo "familiar" podem se vincular a um paciente existente.
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pacienteId
 *             properties:
 *               pacienteId:
 *                 type: string
 *                 example: 64f1c2a8b2a4f5d123456789
 *     responses:
 *       200:
 *         description: Vínculo realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Vinculado com sucesso
 *       403:
 *         description: Usuário não autorizado (não é familiar)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Apenas familiares podem se vincular
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Paciente não encontrado
 *       500:
 *         description: Erro ao vincular
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Erro ao vincular
 */

router.post("/vincular", auth, async (req, res) => {// Rota para vincular familiar a paciente, protegida por autenticação
  try {
    
    const { pacienteId } = req.body
    console.log("req.body:", req.body)
    const user = await User.findById(req.userId)

    // só familiar pode vincular
    if (user.tipo !== "familiar") {
      return res.status(403).json({ erro: "Apenas familiares podem se vincular" })
    }
    console.log("pacienteId recebido:", pacienteId)
    // verifica se o paciente existe
    const paciente = await User.findById(pacienteId)
    if (!paciente || paciente.tipo !== "paciente") {
      return res.status(404).json({ erro: "Paciente não encontrado" })
    }

    // faz o vínculo
    user.pacienteId = pacienteId
    await user.save()

    res.json({ mensagem: "Vinculado com sucesso" })

  } catch (err) {
  return res.status(500).json({ message: "Erro ao vincular" })
}
})

module.exports = router