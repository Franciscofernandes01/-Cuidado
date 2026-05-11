// src/routes/devRoutes.js

const router = require("express").Router()

const auth = require("../middlewares/auth")

const { db } = require("../config/firebase")

const admin = require("firebase-admin")

const {
  enviarNotificacao
} = require("../services/notificationService")

/**
 * @swagger
 * tags:
 *   name: Dev
 *   description: Rotas auxiliares para testes de notificações e cron
 */

/**
 * @swagger
 * /dev/notificacoes/teste:
 *   post:
 *     summary: Enviar push simples para o usuário logado
 *     tags: [Dev]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: Teste
 *               mensagem:
 *                 type: string
 *                 example: Push funcionando
 *     responses:
 *       200:
 *         description: Notificação enviada
 *       400:
 *         description: Usuário sem token FCM
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno
 */
router.post(
  "/notificacoes/teste",
  auth,
  async (req, res) => {

    try {

      const {
        titulo,
        mensagem
      } = req.body

      const userDoc = await db
        .collection("usuarios")
        .doc(req.user.uid)
        .get()

      if (!userDoc.exists) {

        return res.status(404).json({
          erro: "Usuário não encontrado"
        })
      }

      const user = userDoc.data()

      if (!user.fcmToken) {

        return res.status(400).json({
          erro: "Usuário sem token FCM"
        })
      }

      await enviarNotificacao(
        user.fcmToken,
        titulo || "Teste",
        mensagem || "Notificação funcionando"
      )

      return res.json({
        mensagem: "Notificação enviada com sucesso"
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao enviar notificação"
      })
    }
  }
)

/**
 * @swagger
 * /dev/push/custom:
 *   post:
 *     summary: Enviar push customizado
 *     tags: [Dev]
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
 *                 example: fcm_token
 *               title:
 *                 type: string
 *                 example: Push teste
 *               body:
 *                 type: string
 *                 example: Mensagem personalizada
 *               data:
 *                 type: object
 *                 example:
 *                   screen: medicamento
 *                   id: "123"
 *     responses:
 *       200:
 *         description: Push enviado
 *       400:
 *         description: Token obrigatório
 *       500:
 *         description: Erro interno
 */
router.post(
  "/push/custom",
  auth,
  async (req, res) => {

    try {

      const {
        token,
        title,
        body,
        data
      } = req.body

      if (!token) {

        return res.status(400).json({
          erro: "Token obrigatório"
        })
      }

      await admin.messaging().send({

        token,

        notification: {
          title: title || "Teste",
          body: body || "Mensagem teste"
        },

        data: data || {},

        android: {
          priority: "high"
        },

        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1
            }
          }
        }
      })

      return res.json({
        mensagem: "Push customizado enviado"
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao enviar push"
      })
    }
  }
)

/**
 * @swagger
 * /dev/medicamentos/{id}/notificacao:
 *   post:
 *     summary: Disparar notificação manual do medicamento
 *     tags: [Dev]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: medicamento123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipo
 *             properties:
 *               tipo:
 *                 type: string
 *                 enum:
 *                   - hora
 *                   - atrasado
 *                   - critico
 *                 example: atrasado
 *     responses:
 *       200:
 *         description: Notificação enviada
 *       400:
 *         description: Tipo inválido
 *       404:
 *         description: Medicamento não encontrado
 *       500:
 *         description: Erro interno
 */
router.post(
  "/medicamentos/:id/notificacao",
  auth,
  async (req, res) => {

    try {

      const { tipo } = req.body

      const ref = db
        .collection("medicamentos")
        .doc(req.params.id)

      const doc = await ref.get()

      if (!doc.exists) {

        return res.status(404).json({
          erro: "Medicamento não encontrado"
        })
      }

      const med = doc.data()

      const pacienteDoc = await db
        .collection("usuarios")
        .doc(med.pacienteId)
        .get()

      const paciente = pacienteDoc.data()

      let tokens = []

      if (paciente?.fcmToken) {
        tokens.push(paciente.fcmToken)
      }

      if (paciente?.familiarId) {

        const famDoc = await db
          .collection("usuarios")
          .doc(paciente.familiarId)
          .get()

        const familiar = famDoc.data()

        if (familiar?.fcmToken) {
          tokens.push(familiar.fcmToken)
        }
      }

      let titulo = ""
      let mensagem = ""

      if (tipo === "hora") {

        titulo = "Hora do medicamento"

        mensagem =
          `Está na hora de tomar ${med.nome}`

      } else if (tipo === "atrasado") {

        titulo = "Medicamento atrasado"

        mensagem =
          `${med.nome} está atrasado`

      } else if (tipo === "critico") {

        titulo =
          "Medicamento não confirmado"

        mensagem =
          `${med.nome} não foi confirmado`

      } else {

        return res.status(400).json({
          erro: "Tipo inválido"
        })
      }

      for (const token of tokens) {

        await admin.messaging().send({

          token,

          notification: {
            title: titulo,
            body: mensagem
          },

          data: {
            type: tipo,
            medicineName: med.nome
          },

          android: {
            priority: "high"
          },

          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1
              }
            }
          }
        })
      }

      return res.json({
        mensagem: "Notificação enviada"
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao disparar notificação"
      })
    }
  }
)

/**
 * @swagger
 * /dev/medicamentos/{id}/simular-atraso:
 *   patch:
 *     summary: Simular atraso da dose
 *     tags: [Dev]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: medicamento123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - minutos
 *             properties:
 *               minutos:
 *                 type: number
 *                 example: 40
 *     responses:
 *       200:
 *         description: Atraso simulado
 *       404:
 *         description: Medicamento não encontrado
 *       500:
 *         description: Erro interno
 */
router.patch(
  "/medicamentos/:id/simular-atraso",
  auth,
  async (req, res) => {

    try {

      const { minutos } = req.body

      const ref = db
        .collection("medicamentos")
        .doc(req.params.id)

      const doc = await ref.get()

      if (!doc.exists) {

        return res.status(404).json({
          erro: "Medicamento não encontrado"
        })
      }

      const agora = new Date()

      const novaData = new Date(
        agora.getTime() -
        (Number(minutos) * 60 * 1000)
      )

      await ref.update({
        ultimoTomadoEm: novaData
      })

      return res.json({

        mensagem: "Atraso simulado",

        ultimoTomadoEm: novaData
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao simular atraso"
      })
    }
  }
)

/**
 * @swagger
 * /dev/medicamentos/{id}/reset-alertas:
 *   patch:
 *     summary: Resetar alertas anti-spam
 *     tags: [Dev]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: medicamento123
 *     responses:
 *       200:
 *         description: Alertas resetados
 *       404:
 *         description: Medicamento não encontrado
 *       500:
 *         description: Erro interno
 */
router.patch(
  "/medicamentos/:id/reset-alertas",
  auth,
  async (req, res) => {

    try {

      const ref = db
        .collection("medicamentos")
        .doc(req.params.id)

      const doc = await ref.get()

      if (!doc.exists) {

        return res.status(404).json({
          erro: "Medicamento não encontrado"
        })
      }

      await ref.update({

        ultimoHorarioNotificado: null,

        ultimoHorarioAtrasado: null,

        ultimoHorarioCritico: null
      })

      return res.json({
        mensagem: "Alertas resetados"
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao resetar alertas"
      })
    }
  }
)

/**
 * @swagger
 * /dev/medicamentos/{id}/status-dose:
 *   get:
 *     summary: Buscar status da dose
 *     tags: [Dev]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: medicamento123
 *     responses:
 *       200:
 *         description: Status da dose
 *       400:
 *         description: Medicamento sem frequência
 *       404:
 *         description: Medicamento não encontrado
 *       500:
 *         description: Erro interno
 */
router.get(
  "/medicamentos/:id/status-dose",
  auth,
  async (req, res) => {

    try {

      const ref = db
        .collection("medicamentos")
        .doc(req.params.id)

      const doc = await ref.get()

      if (!doc.exists) {

        return res.status(404).json({
          erro: "Medicamento não encontrado"
        })
      }

      const med = doc.data()

      if (
        !med.frequencia ||
        !med.ultimoTomadoEm
      ) {

        return res.status(400).json({
          erro: "Medicamento sem frequência"
        })
      }

      const agora = new Date()

      const ultimo =
        med.ultimoTomadoEm.toDate()

      const freqMs =
        med.frequencia *
        60 *
        60 *
        1000

      const proximaDose = new Date(
        ultimo.getTime() + freqMs
      )

      const diff = agora - proximaDose

      return res.json({

        medicamento: med.nome,

        proximaDose,

        atrasoMinutos:
          diff > 0
            ? Math.floor(diff / 60000)
            : 0,

        atrasado:
          diff >= 10 * 60 * 1000,

        critico:
          diff >= 30 * 60 * 1000
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao buscar status"
      })
    }
  }
)

module.exports = router