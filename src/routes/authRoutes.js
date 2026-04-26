const express = require("express")
const router = express.Router()
const { admin, db } = require("../config/firebase")
const axios = require("axios")
const auth = require("../middlewares/auth")

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Rotas de autenticação
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar novo usuário (paciente ou familiar)
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *               - tipo
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 example: joao@email.com
 *               senha:
 *                 type: string
 *                 example: "123456"
 *               tipo:
 *                 type: string
 *                 enum: [paciente, familiar]
 *                 example: paciente
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Erro de validação
 *       500:
 *         description: Erro interno
 */
router.post("/register", async (req, res) => {
  try {
    const { nome, email, senha, tipo } = req.body

    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ erro: "Preencha todos os campos" })
    }

    if (!["paciente", "familiar"].includes(tipo)) {
      return res.status(400).json({ erro: "Tipo inválido" })
    }

    // 🔥 cria usuário no Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password: senha,
      displayName: nome
    })

    const uid = userRecord.uid

    // 🔥 salva usuário no Firestore (PADRÃO FIXO)
    await db.collection("usuarios").doc(uid).set({
      nome,
      email,
      tipo,
      pacienteId: null, // 🔥 IMPORTANTE PARA EVITAR BUGS
      criadoEm: new Date()
    })

    return res.status(201).json({
      mensagem: "Usuário criado com sucesso",
      uid
    })

  } catch (err) {
    console.log(err)
    return res.status(500).json({ erro: err.message })
  }
})

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login e geração de token Firebase
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: joao@email.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *                 uid:
 *                   type: string
 *       401:
 *         description: Falha no login
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ erro: "Email e senha obrigatórios" })
  }

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true
      }
    )

    const { idToken, refreshToken, expiresIn, localId } = response.data

    return res.json({
      token: idToken,
      refreshToken,
      expiresIn,
      uid: localId // 🔥 PADRÃO CONSISTENTE
    })

  } catch (err) {
    return res.status(401).json({
      erro: "Falha no login",
      detalhe: err.response?.data || err.message
    })
  }
})

/**
 * @swagger
 * /auth/vincular:
 *   post:
 *     summary: Vincular um familiar a um paciente
 *     tags: [Autenticação]
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
 *                 example: UID_DO_PACIENTE
 *     responses:
 *       200:
 *         description: Vinculado com sucesso
 *       400:
 *         description: Erro de validação ou vínculo existente
 *       403:
 *         description: Apenas familiares podem se vincular
 *       404:
 *         description: Usuário ou paciente não encontrado
 *       500:
 *         description: Erro interno
 */
router.post("/vincular", auth, async (req, res) => {
  try {
    const { pacienteId } = req.body

    if (!pacienteId) {
      return res.status(400).json({ erro: "pacienteId é obrigatório" })
    }

    const userRef = db.collection("usuarios").doc(req.user.uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const user = userDoc.data()

    if (user.tipo !== "familiar") {
      return res.status(403).json({ erro: "Apenas familiares podem se vincular" })
    }

    // 🔥 impede sobrescrever vínculo existente
    if (user.pacienteId) {
      return res.status(400).json({ erro: "Familiar já está vinculado a um paciente" })
    }

    const pacienteRef = db.collection("usuarios").doc(pacienteId)
    const pacienteDoc = await pacienteRef.get()

    if (!pacienteDoc.exists) {
      return res.status(404).json({ erro: "Paciente não encontrado" })
    }

    const paciente = pacienteDoc.data()

    if (paciente.tipo !== "paciente") {
      return res.status(400).json({ erro: "Usuário informado não é paciente" })
    }

    // 🔥 cria vínculo
    await userRef.update({
      pacienteId
    })

    return res.json({ mensagem: "Vinculado com sucesso" })

  } catch (err) {
    console.log(err)
    return res.status(500).json({ erro: "Erro ao vincular" })
  }
})

module.exports = router