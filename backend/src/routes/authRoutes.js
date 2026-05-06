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
// status inicial offline e bateria cheia
        bateria: null,
        online: false,
        ultimoOnline: null
      })
    }
// atualiza token de notificação
    if (fcmToken) {
      await db.collection("usuarios").doc(uid).update({
        fcmToken
      })
    }

    return res.json({
      mensagem: "Login realizado com sucesso",
      uid
    })

  } catch (err) {
    return res.status(401).json({ erro: "Token inválido" })
  }
})

// ================= STATUS =================
router.patch("/status", auth, async (req, res) => {// atualiza status do paciente (online, bateria e último online)
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
 *     summary: Consultar status do paciente (online, bateria e tempo offline)
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status do paciente retornado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               nome: João
 *               online: false
 *               bateria: 78
 *               ultimoOnline: 2026-05-06T12:00:00Z
 *               tempoOffline: há 5 min
 *       400:
 *         description: Paciente não vinculado
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno
 */
router.get("/paciente/status", auth, async (req, res) => {// busca status do paciente vinculado (para familiares)
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
 * /auth/vincular:
 *   post:
 *     summary: Vincular familiar a paciente
 *     tags: [Autenticação]
 */
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
 * tags:
 *   name: Vínculo
 */
router.get("/gerar", auth, checkRole(["paciente"]), async (req, res) => {
  try {
    const token = require("crypto").randomBytes(20).toString("hex")

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
 * /vinculo/vincular:
 *   post:
 *     summary: Vincular familiar ao paciente via QR Code
 *     description: |
 *       Permite que um usuário do tipo **familiar** se vincule a um paciente utilizando um token gerado por QR Code.
 *       
 *       Fluxo:
 *       - Recebe um token gerado previamente pelo paciente
 *       - Valida se o token existe
 *       - Verifica se o token não expirou
 *       - Vincula o familiar ao paciente
 *       - Atualiza o paciente com o ID do familiar
 *       - Remove o token (uso único)
 *     tags:
 *       - Vínculo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Token gerado pelo QR Code do paciente
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
 *         content:
 *           application/json:
 *             example:
 *               mensagem: Vínculo realizado com sucesso
 *       400:
 *         description: Erro de validação (token ausente, inválido ou expirado)
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
 *       403:
 *         description: Acesso negado (não é familiar)
 *         content:
 *           application/json:
 *             example:
 *               erro: Acesso negado
 *       500:
 *         description: Erro interno no servidor
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao vincular
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
 * /auth/socorro:
 *   post:
 *     summary: Acionar botão de socorro (paciente)
 *     description: |
 *       Permite que um usuário do tipo **paciente** acione um alerta de emergência.
 *       
 *       Fluxo:
 *       - Verifica se o usuário existe
 *       - Valida se é do tipo paciente
 *       - Verifica se possui um familiar vinculado
 *       - Cria um evento de socorro no banco
 *       - Envia notificação push para o familiar (se houver FCM token)
 *     tags:
 *       - Autenticação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alerta enviado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               mensagem: Alerta de socorro enviado
 *       400:
 *         description: Paciente sem familiar vinculado
 *         content:
 *           application/json:
 *             example:
 *               erro: Paciente sem familiar vinculado
 *       403:
 *         description: Usuário não é paciente
 *         content:
 *           application/json:
 *             example:
 *               erro: Apenas pacientes podem acionar socorro
 *       404:
 *         description: Usuário ou familiar não encontrado
 *         content:
 *           application/json:
 *             examples:
 *               UsuarioNaoEncontrado:
 *                 value:
 *                   erro: Usuário não encontrado
 *               FamiliarNaoEncontrado:
 *                 value:
 *                   erro: Familiar não encontrado
 *       500:
 *         description: Erro interno ao enviar socorro
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao enviar socorro
 */
router.post("/socorro", auth, async (req, res) => {
  try {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const user = userDoc.data();

    // só paciente pode disparar
    if (user.tipo !== "paciente") {
      return res.status(403).json({
        erro: "Apenas pacientes podem acionar socorro",
      });
    }

    if (!user.familiarId) {
      return res.status(400).json({
        erro: "Paciente sem familiar vinculado",
      });
    }

    // busca familiar
    const familiarDoc = await db
      .collection("usuarios")
      .doc(user.familiarId)
      .get();

    if (!familiarDoc.exists) {
      return res.status(404).json({
        erro: "Familiar não encontrado",
      });
    }

    const familiar = familiarDoc.data();

    // salva evento no banco
    await db.collection("eventos").add({
      tipo: "socorro",
      pacienteId: req.user.uid,
      familiarId: user.familiarId,
      criadoEm: new Date(),
      status: "ativo",
    });

    // envia notificação (sem função separada)
    if (familiar?.fcmToken) {
      try {
        await admin.messaging().send({
          token: familiar.fcmToken,
          notification: {
            title: "🚨 SOCORRO",
            body: `${user.nome} acionou o botão de emergência!`,
          },
        });
      } catch (pushError) {
        console.log("Erro ao enviar push:", pushError);
      }
    } else {
      console.log("Familiar sem FCM token");
    }

    return res.json({
      mensagem: "Alerta de socorro enviado",
    });

  } catch (err) {
    console.log("ERRO SOCORRO:", err);
    return res.status(500).json({
      erro: "Erro ao enviar socorro",
    });
  }
});


module.exports = router