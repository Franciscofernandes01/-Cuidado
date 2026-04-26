const router = require("express").Router()
const auth = require("../middlewares/auth")
const checkRole = require("../middlewares/permissao")
const { db } = require("../config/firebase")
/**
 * @swagger
 * tags:
 *   name: Medicamentos
 *   description: Gerenciamento de medicamentos (paciente e familiar)
 */
/**
 * @swagger
 * /medicamentos:
 *   post:
 *     summary: Criar medicamento (somente familiar vinculado)
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - dosagem
 *               - frequencia
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Dipirona
 *               dosagem:
 *                 type: string
 *                 example: 500mg
 *               frequencia:
 *                 type: string
 *                 example: 8/8h
 *     responses:
 *       201:
 *         description: Medicamento criado com sucesso
 *       400:
 *         description: Erro de validação ou familiar sem vínculo
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno
 */
// =======================
// CRIAR MEDICAMENTO
// =======================
router.post("/", auth, checkRole(["familiar"]), async (req, res) => {
  try {
    const { nome, dosagem, frequencia } = req.body

    if (!nome || !dosagem || !frequencia) {
      return res.status(400).json({ erro: "Preencha todos os campos" })
    }

    const userDoc = await db.collection("usuarios").doc(req.user.uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const user = userDoc.data()

    if (!user.pacienteId) {
      return res.status(400).json({ erro: "Familiar não vinculado a paciente" })
    }

    const doc = await db.collection("medicamentos").add({
      nome,
      dosagem,
      frequencia,
      pacienteId: user.pacienteId,
      criadoPor: req.user.uid,
      tomado: false,
      createdAt: new Date()
    })

    return res.status(201).json({
      id: doc.id,
      nome,
      dosagem,
      frequencia
    })

  } catch (err) {
    console.log(err)
    return res.status(500).json({ erro: "Erro ao cadastrar medicamento" })
  }
})

/**
 * @swagger
 * /medicamentos/status:
 *   get:
 *     summary: Listar medicamentos (tomados e pendentes)
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de medicamentos separada por status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tomados:
 *                   type: array
 *                 pendentes:
 *                   type: array
 *       400:
 *         description: Paciente não definido
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno
 */
// =======================
// LISTAR MEDICAMENTOS
// =======================
router.get("/status", auth, async (req, res) => {
  try {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const user = userDoc.data()

    const pacienteId =
      user.tipo === "paciente"
        ? req.user.uid
        : user.pacienteId

    if (!pacienteId) {
      return res.status(400).json({ erro: "Paciente não definido" })
    }

    const snapshot = await db
      .collection("medicamentos")
      .where("pacienteId", "==", pacienteId)
      .get()

    const tomados = []
    const pendentes = []

    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() }

      if (data.tomado) tomados.push(data)
      else pendentes.push(data)
    })

    return res.json({ tomados, pendentes })

  } catch (err) {
    console.log(err)
    return res.status(500).json({ erro: "Erro ao buscar medicamentos" })
  }
})

/**
 * @swagger
 * /medicamentos/{id}:
 *   put:
 *     summary: Atualizar medicamento (somente familiar do paciente)
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do medicamento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Atualizado com sucesso
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Medicamento não encontrado
 */
// =======================
// ATUALIZAR
// =======================
router.put("/:id", auth, checkRole(["familiar"]), async (req, res) => {
  try {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get()
    const user = userDoc.data()

    const ref = db.collection("medicamentos").doc(req.params.id)
    const doc = await ref.get()

    if (!doc.exists) {
      return res.status(404).json({ erro: "Medicamento não encontrado" })
    }

    if (doc.data().pacienteId !== user.pacienteId) {
      return res.status(403).json({ erro: "Sem permissão" })
    }

    await ref.update(req.body)

    return res.json({ mensagem: "Atualizado com sucesso" })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao atualizar" })
  }
})

/**
 * @swagger
 * /medicamentos/{id}:
 *   delete:
 *     summary: Deletar medicamento (somente familiar do paciente)
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do medicamento
 *     responses:
 *       200:
 *         description: Deletado com sucesso
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Medicamento não encontrado
 */
// =======================
// DELETAR
// =======================
router.delete("/:id", auth, checkRole(["familiar"]), async (req, res) => {
  try {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get()
    const user = userDoc.data()

    const ref = db.collection("medicamentos").doc(req.params.id)
    const doc = await ref.get()

    if (!doc.exists) {
      return res.status(404).json({ erro: "Medicamento não encontrado" })
    }

    if (doc.data().pacienteId !== user.pacienteId) {
      return res.status(403).json({ erro: "Sem permissão" })
    }

    await ref.delete()

    return res.json({ mensagem: "Deletado com sucesso" })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao deletar" })
  }
})

/**
 * @swagger
 * /medicamentos/{id}/tomei:
 *   patch:
 *     summary: Marcar medicamento como tomado (somente paciente)
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do medicamento
 *     responses:
 *       200:
 *         description: Medicamento marcado como tomado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Medicamento não encontrado
 *       500:
 *         description: Erro interno
 */
// =======================
// MARCAR COMO TOMADO
// =======================
router.patch("/:id/tomei", auth, checkRole(["paciente"]), async (req, res) => {
  try {
    const ref = db.collection("medicamentos").doc(req.params.id)
    const doc = await ref.get()

    if (!doc.exists) {
      return res.status(404).json({ erro: "Medicamento não encontrado" })
    }

    const data = doc.data()

    if (data.pacienteId !== req.user.uid) {
      return res.status(403).json({ erro: "Sem permissão" })
    }

    await ref.update({ tomado: true })

    return res.json({
      id: doc.id,
      ...data,
      tomado: true
    })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao confirmar medicamento" })
  }
})

module.exports = router