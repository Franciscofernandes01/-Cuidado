const express = require("express")
const router = express.Router()
const { admin, db } = require("../config/firebase")
const auth = require("../middlewares/auth")
const QRCode = require("qrcode")
const crypto = require("crypto")
const checkRole = require("../middlewares/permissao")
const util = require("../utils/horarios")
const { tempoRelativo } = require("../utils/horarios")


/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login com Google e criação de usuário no primeiro acesso
 *     description: |
 *       Realiza autenticação via Firebase Google ID Token.
 *       Caso o usuário não exista, ele é criado com o tipo informado (paciente ou familiar).
 *       Também permite atualizar o token de notificação (FCM).
 *     tags:
 *       - Autenticação
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
 *                 description: Firebase ID Token do Google
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6...
 *               tipo:
 *                 type: string
 *                 enum: [paciente, familiar]
 *                 description: Tipo do usuário (obrigatório no primeiro acesso)
 *                 example: paciente
 *               fcmToken:
 *                 type: string
 *                 description: Token do Firebase Cloud Messaging para notificações push
 *                 example: fcm_token_exemplo_123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Login realizado com sucesso
 *                 uid:
 *                   type: string
 *                   example: uid_do_usuario_firebase
 *
 *       400:
 *         description: Erro de validação (token ou tipo inválido)
 *         content:
 *           application/json:
 *             examples:
 *               TokenFaltando:
 *                 value:
 *                   erro: Token é obrigatório
 *               TipoInvalido:
 *                 value:
 *                   erro: Tipo é obrigatório no primeiro acesso (paciente ou familiar)
 *
 *       401:
 *         description: Token inválido do Firebase
 *         content:
 *           application/json:
 *             example:
 *               erro: Token inválido
 */

// ================= LOGIN GOOGLE =================
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
        criadoEm: new Date(),
        bateria: null,
        online: false,
        ultimoOnline: null
      })
    }

    if (fcmToken) {
      await db.collection("usuarios").doc(uid).update({ fcmToken })
    }

    return res.json({
      mensagem: "Login realizado com sucesso",
      uid
    })

  } catch (err) {
    return res.status(401).json({ erro: "Token inválido" })
  }
})

/**
 * @swagger
 * /auth/status:
 *   patch:
 *     summary: Atualiza status do usuário (online, bateria e último acesso)
 *     description: |
 *       Atualiza informações de status do usuário autenticado, incluindo:
 *       - nível de bateria
 *       - status online/offline
 *       - timestamp do último acesso
 *     tags:
 *       - Autenticação
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bateria:
 *                 type: number
 *                 description: Percentual de bateria do dispositivo
 *                 example: 78
 *               online:
 *                 type: boolean
 *                 description: Status online do usuário
 *                 example: true
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Status atualizado
 *
 *       500:
 *         description: Erro interno ao atualizar status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Erro ao atualizar status
 */
// ================= STATUS =================
router.patch("/status", auth, async (req, res) => {
  try {
    const { bateria, online } = req.body

    await db.collection("usuarios").doc(req.user.uid).update({
      bateria: bateria ?? null,
      online: online ?? false,
      ultimoOnline: new Date()
    })

    return res.json({ mensagem: "Status atualizado" })
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao atualizar status" })
  }
})

/**
 * @swagger
 * /auth/paciente/status:
 *   get:
 *     summary: Retorna o status atual do paciente
 *     description: |
 *       Retorna informações do paciente vinculado ou do próprio paciente,
 *       incluindo status online, bateria e último acesso.
 *     tags:
 *       - Status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status do paciente retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nome:
 *                   type: string
 *                   example: João Silva
 *                 online:
 *                   type: boolean
 *                   example: true
 *                 bateria:
 *                   type: number
 *                   nullable: true
 *                   example: 78
 *                 ultimoOnline:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: "2026-05-09T18:30:00.000Z"
 *                 tempoOffline:
 *                   type: string
 *                   nullable: true
 *                   example: "5 minutos atrás"
 *
 *       400:
 *         description: Paciente não vinculado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Paciente não vinculado
 *
 *       401:
 *         description: Token inválido ou ausente
 *
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
 *
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Erro ao buscar status
 */
// ================= STATUS PACIENTE =================
router.get("/paciente/status", auth, async (req, res) => {
  try {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get()
    const user = userDoc.data()

    const pacienteId =
      user.tipo === "paciente"
        ? req.user.uid
        : user.pacienteId

    if (!pacienteId) {
      return res.status(400).json({ erro: "Paciente não vinculado" })
    }

    const pacienteDoc = await db.collection("usuarios").doc(pacienteId).get()

    if (!pacienteDoc.exists) {
      return res.status(404).json({ erro: "Paciente não encontrado" })
    }

    const paciente = pacienteDoc.data()

    const ultimo = paciente.ultimoOnline?.toDate?.()
    const agora = new Date()

    const online = ultimo && (agora - ultimo) < 2 * 60 * 1000

    return res.json({
      nome: paciente.nome,
      online,
      bateria: paciente.bateria ?? null,
      ultimoOnline: ultimo,
      tempoOffline: online ? null : tempoRelativo(ultimo)
    })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao buscar status" })
  }
})

/**
 * @swagger
 * /auth/vincularUid:
 *   post:
 *     summary: Vincula um familiar a um paciente via ID
 *     description: |
 *       Permite que um usuário do tipo **familiar** se vincule a um paciente existente no sistema
 *       utilizando o ID do paciente no Firestore.
 *       
 *       Regras:
 *       - Apenas usuários do tipo "familiar" podem vincular
 *       - Um familiar só pode estar vinculado a um paciente
 *       - O paciente deve existir e ser do tipo "paciente"
 *     tags:
 *       - Vínculo
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
 *                 description: ID do paciente no Firestore
 *                 example: "abc123PacienteId"
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
 *
 *       400:
 *         description: Erro de validação ou regra de negócio
 *         content:
 *           application/json:
 *             examples:
 *               SemPacienteId:
 *                 value:
 *                   erro: pacienteId é obrigatório
 *               JaVinculado:
 *                 value:
 *                   erro: Familiar já vinculado
 *               UsuarioInvalido:
 *                 value:
 *                   erro: Usuário informado não é paciente
 *
 *       403:
 *         description: Acesso negado (usuário não é familiar)
 *         content:
 *           application/json:
 *             example:
 *               erro: Apenas familiares podem se vincular
 *
 *       404:
 *         description: Usuário ou paciente não encontrado
 *         content:
 *           application/json:
 *             examples:
 *               UsuarioNaoEncontrado:
 *                 value:
 *                   erro: Usuário não encontrado
 *               PacienteNaoEncontrado:
 *                 value:
 *                   erro: Paciente não encontrado
 *
 *       500:
 *         description: Erro interno no servidor
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao vincular
 */
// ================= VINCULAR UID =================
router.post("/vincularUid", auth, async (req, res) => {
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

    if (user.pacienteId) {
      return res.status(400).json({ erro: "Familiar já vinculado" })
    }

    const pacienteDoc = await db.collection("usuarios").doc(pacienteId).get()

    if (!pacienteDoc.exists) {
      return res.status(404).json({ erro: "Paciente não encontrado" })
    }

    const paciente = pacienteDoc.data()

    if (paciente.tipo !== "paciente") {
      return res.status(400).json({ erro: "Usuário informado não é paciente" })
    }

    await userRef.update({ pacienteId })

    return res.json({ mensagem: "Vinculado com sucesso" })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao vincular" })
  }
})

/**
 * @swagger
 * /auth/gerar:
 *   get:
 *     summary: Gera QR Code para vínculo entre paciente e familiar
 *     description: |
 *       Gera um QR Code contendo um token temporário para permitir que um familiar
 *       se vincule ao paciente autenticado.
 *       
 *       Regras:
 *       - Apenas usuários do tipo "paciente" podem gerar
 *       - O token expira em 10 minutos
 *       - O QR Code contém o token em formato JSON
 *     tags:
 *       - Vínculo
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
 *                   description: QR Code em formato base64 (DataURL)
 *                   example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *                 token:
 *                   type: string
 *                   description: Token de vínculo gerado
 *                   example: "a3f9c1d2e5b8f9c1d2e5b8a1c3d4e5f6"
 *
 *       403:
 *         description: Acesso negado (usuário não é paciente)
 *         content:
 *           application/json:
 *             example:
 *               erro: Apenas pacientes podem acessar esta rota
 *
 *       500:
 *         description: Erro interno ao gerar QR Code
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao gerar QR Code
 */
// ================= GERAR QR =================
router.get("/gerar", auth, checkRole(["paciente"]), async (req, res) => {
  try {
    const token = crypto.randomBytes(20).toString("hex")

    await db.collection("vinculos").doc(token).set({
      pacienteId: req.user.uid,
      criadoEm: new Date(),
      expiraEm: new Date(Date.now() + 10 * 60 * 1000)
    })

    const qr = await QRCode.toDataURL(JSON.stringify({ token }))

    return res.json({ qr, token })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao gerar QR Code" })
  }
})

/**
 * @swagger
 * /auth/vincular:
 *   post:
 *     summary: Vincula familiar ao paciente via QR Code
 *     description: |
 *       Realiza o vínculo entre um familiar autenticado e um paciente
 *       utilizando um token gerado por QR Code.
 *       
 *       Fluxo:
 *       - Recebe o token gerado pelo paciente
 *       - Valida existência do token
 *       - Verifica expiração (10 minutos)
 *       - Cria vínculo entre familiar e paciente
 *       - Remove o token (uso único)
 *     tags:
 *       - Vínculo
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
 *                 description: Token gerado pelo QR Code do paciente
 *                 example: "a8f9c1b2d3e4f5g6h7i8"
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
 *                   example: Vínculo realizado com sucesso
 *
 *       400:
 *         description: Erro de validação (token inválido ou expirado)
 *         content:
 *           application/json:
 *             examples:
 *               TokenObrigatorio:
 *                 value:
 *                   erro: Token obrigatório
 *               TokenInvalido:
 *                 value:
 *                   erro: Token inválido
 *               TokenExpirado:
 *                 value:
 *                   erro: QR Code expirado
 *
 *       403:
 *         description: Acesso negado (usuário não é familiar)
 *         content:
 *           application/json:
 *             example:
 *               erro: Acesso negado
 *
 *       500:
 *         description: Erro interno ao vincular
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao vincular
 */
// ================= VINCULAR QR =================
router.post("/vincular", auth, checkRole(["familiar"]), async (req, res) => {// Vincula usando token do QR Code
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

    if (new Date() > data.expiraEm.toDate()) {
      return res.status(400).json({ erro: "QR Code expirado" })
    }

    await db.collection("usuarios").doc(req.user.uid).update({
      pacienteId: data.pacienteId
    })

    await db.collection("usuarios").doc(data.pacienteId).update({
      familiarId: req.user.uid
    })

    await ref.delete()

    return res.json({ mensagem: "Vínculo realizado com sucesso" })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao vincular" })
  }
})

/**
 * @swagger
 * /auth/sos:
 *   post:
 *     summary: Envia um alerta SOS entre paciente e cuidador
 *     description: |
 *       Permite que:
 *       - pacientes enviem SOS para seus cuidadores;
 *       - cuidadores enviem SOS para seus pacientes.
 *
 *       A rota também:
 *       - registra o evento no Firestore;
 *       - envia uma notificação FCM Data Message;
 *       - dispara alertas sonoros/vibração no aplicativo.
 *
 *     tags:
 *       - SOS
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: SOS enviado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               mensagem: SOS enviado com sucesso
 *
 *       400:
 *         description: Usuário sem vínculo
 *         content:
 *           application/json:
 *             examples:
 *
 *               pacienteSemCuidador:
 *                 summary: Paciente sem cuidador vinculado
 *                 value:
 *                   erro: Paciente sem cuidador vinculado
 *
 *               cuidadorSemPaciente:
 *                 summary: Cuidador sem paciente vinculado
 *                 value:
 *                   erro: Cuidador sem paciente vinculado
 *
 *       401:
 *         description: Token inválido ou ausente
 *         content:
 *           application/json:
 *             example:
 *               erro: Token inválido
 *
 *       403:
 *         description: Usuário sem permissão
 *         content:
 *           application/json:
 *             example:
 *               erro: Usuário sem permissão
 *
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             examples:
 *
 *               usuarioNaoEncontrado:
 *                 summary: Usuário autenticado não encontrado
 *                 value:
 *                   erro: Usuário não encontrado
 *
 *               pacienteNaoEncontrado:
 *                 summary: Paciente não encontrado
 *                 value:
 *                   erro: Paciente não encontrado
 *
 *               destinoNaoEncontrado:
 *                 summary: Usuário destino não encontrado
 *                 value:
 *                   erro: Usuário destino não encontrado
 *
 *       500:
 *         description: Erro interno ao enviar SOS
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao enviar SOS
 */
router.post("/sos", auth, async (req, res) => {
  try {

    // usuário autenticado
    const userDoc =
      await db.collection("usuarios")
      .doc(req.user.uid)
      .get()

    if (!userDoc.exists) {
      return res.status(404).json({
        erro: "Usuário não encontrado"
      })
    }

    const user = userDoc.data()

    let destinoId = null
    let patientName = null

    // PACIENTE -> CUIDADOR
    if (user.tipo === "paciente") {

      if (!user.familiarId) {
        return res.status(400).json({
          erro: "Paciente sem cuidador vinculado"
        })
      }

      destinoId = user.familiarId

      // nome do paciente
      patientName = user.nome
    }

    // CUIDADOR -> PACIENTE
    else if (user.tipo === "familiar") {

      if (!user.pacienteId) {
        return res.status(400).json({
          erro: "Cuidador sem paciente vinculado"
        })
      }

      destinoId = user.pacienteId

      // busca nome do paciente
      const pacienteDoc =
        await db.collection("usuarios")
        .doc(user.pacienteId)
        .get()

      if (!pacienteDoc.exists) {
        return res.status(404).json({
          erro: "Paciente não encontrado"
        })
      }

      const paciente = pacienteDoc.data()

      patientName = paciente.nome
    }


    // BLOQUEIO
    else {

      return res.status(403).json({
        erro: "Usuário sem permissão"
      })
    }

    // BUSCA DESTINO
    const destinoDoc =
      await db.collection("usuarios")
      .doc(destinoId)
      .get()

    if (!destinoDoc.exists) {
      return res.status(404).json({
        erro: "Usuário destino não encontrado"
      })
    }

    const destino = destinoDoc.data()

    // REGISTRA EVENTO
    await db.collection("eventos").add({

      tipo: "sos",

      enviadoPor: req.user.uid,

      destinoId,

      patientName,

      criadoEm: new Date(),

      status: "ativo"
    })

    // ENVIA PUSH
    if (destino?.fcmToken) {

      try {

        await admin.messaging().send({

          token: destino.fcmToken,

          // DATA MESSAGE
          data: {

            type: "sos",

            patientName: patientName,

            title: "🚨 SOS",

            body: `${user.nome} acionou o botão SOS!`
          },

          android: {

            priority: "high"
          },

          apns: {

            payload: {

              aps: {

                contentAvailable: true,

                sound: "default",

                badge: 1
              }
            }
          }
        })

      } catch (e) {

        console.log("Erro push:", e)
      }
    }

    return res.json({
      mensagem: "SOS enviado com sucesso"
    })

  } catch (err) {

    console.log(err)

    return res.status(500).json({
      erro: "Erro ao enviar SOS"
    })
  }
})


module.exports = router