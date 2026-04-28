const express = require("express")
const router = express.Router()
const { admin, db } = require("../config/firebase")
const auth = require("../middlewares/auth")


/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Login com Google e vínculo de usuários
 */


/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login com Google e definição de tipo no primeiro acesso
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: TOKEN_FIREBASE
 *               tipo:
 *                 type: string
 *                 enum: [paciente, familiar]
 *                 example: paciente
 *               fcmToken:
 *                 type: string
 *                 example: TOKEN_DO_CELULAR
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       400:
 *         description: Tipo obrigatório no primeiro acesso
 *       401:
 *         description: Token inválido
 */
router.post("/google", async (req, res) => {
  try {
    const { token, tipo, fcmToken } = req.body

    if (!token) {
      return res.status(400).json({ erro: "Token é obrigatório" })
    }

    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    const userRef = db.collection("usuarios").doc(uid)
    const userDoc = await userRef.get()

    // PRIMEIRO LOGIN
    if (!userDoc.exists) {

      if (!tipo || !["paciente", "familiar"].includes(tipo)) {
        return res.status(400).json({
          erro: "Tipo é obrigatório no primeiro acesso (paciente ou familiar)"
        })
      }

      await userRef.set({
        nome: decoded.name || "Usuário Google",
        email: decoded.email,
        tipo,
        pacienteId: null,
        criadoEm: new Date()
      })
    }

    // salva FCM token se vier
    if (fcmToken) {
      await userRef.set({ fcmToken }, { merge: true })
    }

    return res.json({
      mensagem: "Login realizado com sucesso",
      uid
    })

  } catch (err) {
    console.log(err)
    return res.status(401).json({ erro: "Token inválido" })
  }
})


/**
 * @swagger
 * /auth/vincular:
 *   post:
 *     summary: Vincular familiar a paciente
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
 *         description: Já vinculado ou erro de validação
 *       403:
 *         description: Apenas familiares podem se vincular
 *       404:
 *         description: Usuário ou paciente não encontrado
 */
router.post("/vincular", auth, async (req, res) => {
  try {
    const { pacienteId } = req.body

    if (!pacienteId) {
      return res.status(400).json({ erro: "pacienteId é obrigatório" })
    }
// busca usuário logado
    const userRef = db.collection("usuarios").doc(req.user.uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const user = userDoc.data()

    if (user.tipo !== "familiar") {
      return res.status(403).json({
        erro: "Apenas familiares podem se vincular"
      })
    }

    if (user.pacienteId) {
      return res.status(400).json({
        erro: "Familiar já vinculado"
      })
    }
// busca paciente a ser vinculado
    const pacienteDoc = await db.collection("usuarios").doc(pacienteId).get()

    if (!pacienteDoc.exists) {
      return res.status(404).json({ erro: "Paciente não encontrado" })
    }

    const paciente = pacienteDoc.data()

    if (paciente.tipo !== "paciente") {
      return res.status(400).json({
        erro: "Usuário informado não é paciente"
      })
    }

    await userRef.update({ pacienteId })

    return res.json({ mensagem: "Vinculado com sucesso" })

  } catch (err) {
    console.log(err)
    return res.status(500).json({ erro: "Erro ao vincular" })
  }
})

module.exports = router