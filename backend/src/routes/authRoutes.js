const express = require("express")
const router = express.Router()
const { admin, db } = require("../config/firebase")
const auth = require("../middlewares/auth")
const QRCode = require("qrcode")
const crypto = require("crypto")
const checkRole = require("../middlewares/permissao")


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
    const { token, tipo, fcmToken } = req.body// token obrigatório para verificar identidade do usuário

    if (!token) {
      return res.status(400).json({ erro: "Token é obrigatório" })
    }

    const decoded = await admin.auth().verifyIdToken(token)// token válido, pega UID do usuário
    const uid = decoded.uid// verifica se usuário já existe no Firestore

    const userRef = db.collection("usuarios").doc(uid)// se não existir, cria novo documento com tipo e dados do Google
    const userDoc = await userRef.get()// se for primeiro login, tipo é obrigatório para definir se é paciente ou familiar

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
router.post("/vincularUid", auth, async (req, res) => {//vincula com uid do paciente
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
/**
 * @swagger
 * tags:
 *   name: Vínculo
 *   description: Vinculação entre paciente e cuidador via QR Code
 */

/**
 * @swagger
 * /vinculo/gerar:
 *   get:
 *     summary: Gerar QR Code para vínculo (paciente)
 *     tags: [Vínculo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR Code gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qr:
 *                   type: string
 *                   example: data:image/png;base64,iVBORw0KGgoAAAANS...
 *       403:
 *         description: Acesso negado
 */
router.get("/gerar", auth, checkRole(["paciente"]), async (req, res) => {
  try {
    const token = require("crypto").randomBytes(20).toString("hex")

    // salva token no banco
    await db.collection("vinculos").doc(token).set({
      pacienteId: req.user.uid,
      criadoEm: new Date(),
      expiraEm: new Date(Date.now() + 10 * 60 * 1000) // 10 min
    })

    // gera QR Code com o token
    const qr = await QRCode.toDataURL(
      JSON.stringify({
        token
      })
    )

    return res.json({ qr, token})

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao gerar QR Code" })
  }
})
/**
 * @swagger
 * /vinculo/vincular:
 *   post:
 *     summary: Vincular cuidador ao paciente via QR Code
 *     tags: [Vínculo]
 *     security:
 *       - bearerAuth: []
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
 *                 example: a8f9c1b2d3e4f5g6h7i8
 *     responses:
 *       200:
 *         description: Vínculo realizado com sucesso
 *       400:
 *         description: Token inválido ou expirado
 *       403:
 *         description: Acesso negado
 */
router.post("/vincular", auth, checkRole(["familiar"]), async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ erro: "Token obrigatório" })
    }

    const ref = db.collection("vinculos").doc(token)
    const doc = await ref.get()

    if (!doc.exists) {
      return res.status(400).json({ erro: "Token inválido" })
    }

    const data = doc.data()

    // verifica expiração
    if (new Date() > data.expiraEm.toDate()) {
      return res.status(400).json({ erro: "QR Code expirado" })
    }

    // cria vínculo
    await db.collection("usuarios").doc(req.user.uid).update({
      pacienteId: data.pacienteId
    })

    // opcional: marcar no paciente
    await db.collection("usuarios").doc(data.pacienteId).update({
      familiarId: req.user.uid
    })

    // remove token (uso único)
    await ref.delete()

    return res.json({ mensagem: "Vínculo realizado com sucesso" })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao vincular" })
  }
})


module.exports = router