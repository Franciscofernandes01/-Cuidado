const router = require("express").Router()
const auth = require("../middlewares/auth")
const checkRole = require("../middlewares/permissao")
const { db } = require("../config/firebase")
const { gerarHorarios } = require("../utils/horarios")
const { buscarMedicamento } = require("../services/medicamentoService")

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
 */
router.post("/", auth, checkRole(["familiar"]), async (req, res) => {
  try {
    let { nome, dosagem, frequencia, estoque } = req.body

    if (!nome || !dosagem || !frequencia) {
      return res.status(400).json({ erro: "Campos obrigatórios: nome, dosagem, frequencia" })
    }

    frequencia = Number(frequencia)

    if (isNaN(frequencia) || frequencia <= 0 || frequencia > 24) {
      return res.status(400).json({ erro: "Frequência inválida" })
    }

    const userDoc = await db.collection("usuarios").doc(req.user.uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const user = userDoc.data()

    if (!user.pacienteId) {
      return res.status(400).json({ erro: "Familiar não vinculado a paciente" })
    }

    const horarios = gerarHorarios(frequencia)

    const doc = await db.collection("medicamentos").add({
      nome,
      dosagem,
      frequencia,
      horarios,
      estoque: Number(estoque) || 0,
      pacienteId: user.pacienteId,
      criadoPor: req.user.uid,
      tomado: false,
      tomadasHoje: [],
      createdAt: new Date()
    })

    return res.status(201).json({
      id: doc.id,
      nome,
      dosagem,
      frequencia,
      horarios
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
 */
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
      data.tomado ? tomados.push(data) : pendentes.push(data)
    })

    return res.json({ tomados, pendentes })

  } catch (err) {
    console.log(err)
    return res.status(500).json({ erro: "Erro ao buscar medicamentos" })
  }
})

/**
 * @swagger
 * /medicamentos/buscar:
 *   get:
 *     summary: Buscar medicamento em API externa
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 */
router.get("/buscar", auth, async (req, res) => {
  try {
    const { nome } = req.query

    if (!nome) {
      return res.status(400).json({ erro: "Informe o nome do medicamento" })
    }

    const resultado = await buscarMedicamento(nome)

    return res.json(resultado)

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao buscar medicamento" })
  }
})

/**
 * @swagger
 * /medicamentos/{id}:
 *   put:
 *     summary: Atualizar medicamento
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 */
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
 *     summary: Deletar medicamento
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 */
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
 *     summary: Marcar medicamento como tomado
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 */
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

    const hoje = new Date().toISOString().split("T")[0]

    await ref.update({
      tomado: true,
      estoque: Math.max((data.estoque || 0) - 1, 0),
      tomadasHoje: [...(data.tomadasHoje || []), hoje]
    })

    return res.json({ mensagem: "Medicamento tomado com sucesso" })

  } catch (err) {
    return res.status(500).json({ erro: "Erro ao confirmar medicamento" })
  }
})

module.exports = router