// src/routes/devRoutes.js

const router = require("express").Router()

const auth = require("../middlewares/auth")

const { db } = require("../config/firebase")

const admin = require("firebase-admin")

const { enviarNotificacao } = require("../services/notificationService");

/**
 * @swagger
 * tags:
 *   name: Dev
 *   description: Rotas auxiliares para testes de notificações e cron
 */

/**
 * =========================================================
 * TESTAR NOVA LÓGICA DE PRIMEIRA DOSE
 * =========================================================
 */

/**
 * @swagger
 * /dev/medicamentos/{id}/simular-primeira-dose:
 *   patch:
 *     summary: Simular primeira dose do medicamento
 *     description: |
 *       Atualiza a primeiraDoseEm e o ultimoTomadoEm para testar
 *       o cálculo automático das próximas doses baseado na frequência.
 *
 *       Exemplo:
 *       - primeira dose às 08:00
 *       - frequência 8h
 *
 *       Próximas doses:
 *       - 16:00
 *       - 00:00
 *       - 08:00
 *
 *     tags: [Dev]
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: medicamento123
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - primeiraDoseEm
 *             properties:
 *               primeiraDoseEm:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-12T08:00:00.000Z"
 *
 *     responses:
 *       200:
 *         description: Primeira dose atualizada
 *
 *       400:
 *         description: Data inválida
 *
 *       404:
 *         description: Medicamento não encontrado
 *
 *       500:
 *         description: Erro interno
 */
router.patch(
  "/medicamentos/:id/simular-primeira-dose",
  auth,
  async (req, res) => {

    try {

      const { primeiraDoseEm } = req.body

      if (!primeiraDoseEm) {

        return res.status(400).json({
          erro: "primeiraDoseEm obrigatório"
        })
      }

      const dataPrimeiraDose =
        new Date(primeiraDoseEm)

      if (
        isNaN(dataPrimeiraDose.getTime())
      ) {

        return res.status(400).json({
          erro: "primeiraDoseEm inválida"
        })
      }

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

      // atualiza primeira dose
      await ref.update({

        primeiraDoseEm: dataPrimeiraDose,

        ultimoTomadoEm: dataPrimeiraDose,

        ultimoHorarioNotificado: null,

        ultimoHorarioAtrasado: null,

        ultimoHorarioCritico: null
      })

      // calcula próximas doses
      const frequenciaMs =
        (med.frequencia || 1) *
        60 *
        60 *
        1000

      const proximasDoses = []

      let base = new Date(dataPrimeiraDose)

      for (let i = 0; i < 5; i++) {

        proximasDoses.push(
          base.toISOString()
        )

        base = new Date(
          base.getTime() + frequenciaMs
        )
      }

      return res.json({

        mensagem:
          "Primeira dose atualizada com sucesso",

        medicamento: med.nome,

        frequenciaHoras: med.frequencia,

        primeiraDoseEm: dataPrimeiraDose,

        proximasDoses,

        observacao:
          "O cron agora calculará as doses baseado neste horário inicial"
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro:
          "Erro ao simular primeira dose"
      })
    }
  }
)


/**
 * =========================================================
 * TESTE PUSH SIMPLES
 * =========================================================
 */

/**
 * @swagger
 * /dev/notificacoes/teste:
 *   post:
 *     summary: Enviar push simples para o usuário logado
 *     description: Testa se o Firebase Cloud Messaging está funcionando no dispositivo autenticado
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
 * =========================================================
 * TESTE PUSH CUSTOMIZADO
 * =========================================================
 */

/**
 * @swagger
 * /dev/push/custom:
 *   post:
 *     summary: Enviar push customizado
 *     description: Permite enviar um push manual para qualquer token FCM
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
 * =========================================================
 * TESTE ALERTAS MEDICAMENTO
 * =========================================================
 */

/**
 * @swagger
 * /dev/medicamentos/{id}/notificacao:
 *   post:
 *     summary: Disparar notificação manual do medicamento
 *     description: Simula os alertas do cron (hora, atrasado e crítico)
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
 *                   - estoque 
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

      if (tokens.length === 0) {

        return res.status(400).json({
          erro: "Nenhum token FCM encontrado"
        })
      }

      let titulo = ""
      let mensagem = ""
      let type = ""

      if (tipo === "hora") {

        titulo = "Hora do medicamento"

        mensagem =
          `Está na hora de tomar ${med.nome}`

        type = "medicine"

      } else if (tipo === "atrasado") {

        titulo = "Medicamento atrasado"

        mensagem =
          `${med.nome} está atrasado há mais de 10 minutos`

        type = "medicine"

      } else if (tipo === "critico") {

        titulo =
          "Medicamento não confirmado"

        mensagem =
          `${med.nome} não foi confirmado há mais de 30 minutos`

        type = "medicine_critical"

      } else if (tipo === "estoque") {
        titulo = "Estoque baixo"

        mensagem =
          `O estoque de ${med.nome} está baixo`

        type = "low_stock"

      } else {

        return res.status(400).json({
          erro: "Tipo inválido"
        })
      }

      for (const token of tokens) {

        try {

          await admin.messaging().send({

            token,

            notification: {
              title: titulo,
              body: mensagem
            },

            data: {
              type,
              medicineName: med.nome,
              medicineDose: med.dosagem || "",
              title: titulo,
              body: mensagem
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
      console.log(`Notificação ${type} enviada para token:`, token)
        } catch (err) {

          console.log("Erro token:", err.code)
        }
      }

      return res.json({
        mensagem: "Notificação enviada",
        tipo,
        medicamento: med.nome,
        enviados: tokens.length // tokens para os quais a notificação foi tentada de ser enviada
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
 * =========================================================
 * SIMULAR ATRASO
 * =========================================================
 */

/**
 * @swagger
 * /dev/medicamentos/{id}/simular-atraso:
 *   patch:
 *     summary: Simular atraso da dose
 *     description: Altera o ultimoTomadoEm para testar o cron automaticamente
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

      const med = doc.data()

      if (!med.frequencia) {

        return res.status(400).json({
          erro: "Medicamento sem frequência"
        })
      }

      const agora = new Date()

      const novaData = new Date(
        agora.getTime() -
        (
          (
            med.frequencia * 60 +
            Number(minutos)
          ) * 60 * 1000
        )
      )

      await ref.update({
        ultimoTomadoEm: novaData
      })

      return res.json({

        mensagem: "Atraso simulado",

        medicamento: med.nome,

        frequenciaHoras: med.frequencia,

        minutosAtraso: minutos,

        ultimoTomadoEm: novaData,

        observacao:
          "O cron irá identificar automaticamente o atraso"
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
 * =========================================================
 * RESET ALERTAS
 * =========================================================
 */

/**
 * @swagger
 * /dev/medicamentos/{id}/reset-alertas:
 *   patch:
 *     summary: Resetar alertas anti-spam
 *     description: Permite reenviar notificações do cron para a mesma dose
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
 * =========================================================
 * STATUS DA DOSE
 * =========================================================
 */

/**
 * @swagger
 * /dev/medicamentos/{id}/status-dose:
 *   get:
 *     summary: Buscar status da dose
 *     description: Mostra como o cron interpreta o medicamento atualmente
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

      let status = "aguardando"

      if (
        diff >= 0 &&
        diff < 5 * 60 * 1000
      ) {

        status = "hora"

      } else if (
        diff >= 10 * 60 * 1000 &&
        diff < 30 * 60 * 1000
      ) {

        status = "atrasado"

      } else if (
        diff >= 30 * 60 * 1000
      ) {

        status = "critico"
      }

      return res.json({

        medicamento: med.nome,

        frequenciaHoras: med.frequencia,

        ultimoTomadoEm: ultimo,

        proximaDose,

        atrasoMinutos:
          diff > 0
            ? Math.floor(diff / 60000)
            : 0,

        status,

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

/**
 * =========================================================
 * SIMULAR OFFLINE
 * =========================================================
 */

/**
 * @swagger
 * /dev/paciente/simular-offline:
 *   patch:
 *     summary: Simular paciente offline
 *     description: Faz o cron entender que o paciente está offline há mais de 30 minutos
 *     tags: [Dev]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Offline simulado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno
 */
router.patch(
  "/paciente/simular-offline",
  auth,
  async (req, res) => {

    try {

      const ref = db
        .collection("usuarios")
        .doc(req.user.uid)

      const userDoc = await ref.get()

      if (!userDoc.exists) {

        return res.status(404).json({
          erro: "Usuário não encontrado"
        })
      }

      const dataOffline = new Date(
        Date.now() - (31 * 60 * 1000)
      )

      await ref.update({
        ultimoOnline: dataOffline,
        alertaOfflineEnviado: null
      })

      return res.json({
        mensagem: "Paciente offline simulado",
        ultimoOnline: dataOffline
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao simular offline"
      })
    }
  }
)

/**
 * =========================================================
 * SIMULAR BATERIA BAIXA
 * =========================================================
 */

/**
 * @swagger
 * /dev/paciente/simular-bateria:
 *   patch:
 *     summary: Simular bateria baixa
 *     description: Faz o cron identificar bateria crítica
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
 *               bateria:
 *                 type: number
 *                 example: 15
 *     responses:
 *       200:
 *         description: Bateria alterada
 *       500:
 *         description: Erro interno
 */
router.patch(
  "/paciente/simular-bateria",
  auth,
  async (req, res) => {

    try {

      const bateria =
        Number(req.body.bateria || 15)

      await db
        .collection("usuarios")
        .doc(req.user.uid)
        .update({
          bateria,
          alertaBateriaEnviado: null
        })

      return res.json({
        mensagem: "Bateria simulada",
        bateria
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao simular bateria"
      })
    }
  }
)

/**
 * =========================================================
 * SIMULAR ESTOQUE BAIXO
 * =========================================================
 */

/**
 * @swagger
 * /dev/medicamentos/{id}/simular-estoque:
 *   patch:
 *     summary: Simular estoque baixo
 *     description: Faz o cron identificar estoque mínimo
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estoque:
 *                 type: number
 *                 example: 1
 *     responses:
 *       200:
 *         description: Estoque alterado
 *       500:
 *         description: Erro interno
 */
router.patch(
  "/medicamentos/:id/simular-estoque",
  auth,
  async (req, res) => {

    try {

      const estoque =
        Number(req.body.estoque || 1)

      const ref = db
        .collection("medicamentos")
        .doc(req.params.id)

      await ref.update({
        estoque,
        alertaEstoqueEnviado: null
      })

      return res.json({
        mensagem: "Estoque simulado",
        estoque
      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({
        erro: "Erro ao simular estoque"
      })
    }
  }
)

module.exports = router