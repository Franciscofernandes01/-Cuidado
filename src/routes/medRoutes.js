const router = require("express").Router()
const auth = require("../middlewares/auth")
const checkRole = require("../middlewares/permissao")
const Medicamento = require("../models/Medicamentos")

/**
 * @swagger
 * tags:
 *   name: Medicamentos
 *   description: Gerenciamento de medicamentos (requer autenticação)
 */

 /**
 * @swagger
 * /medicamentos:
 *   post:
 *     summary: Cria um novo medicamento para o paciente (ou via familiar vinculado)
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
 *                 example: 8 em 8 horas
 *     responses:
 *       201:
 *         description: Medicamento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 dosagem:
 *                   type: string
 *                 frequencia:
 *                   type: string
 *                 userId:
 *                   type: string
 *       400:
 *         description: Erro de validação ou familiar não vinculado a paciente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Preencha todos os campos
 *       500:
 *         description: Erro ao cadastrar medicamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Erro ao cadastrar medicamento
 */
router.post("/", auth, async (req, res) => {
  try {
    const { nome, dosagem, frequencia } = req.body

    if (!nome || !dosagem || !frequencia) {
      return res.status(400).json({ erro: "Preencha todos os campos" })
    }

    const user = await User.findById(req.userId)

    let pacienteId

    if (user.tipo === "paciente") {
      pacienteId = user._id
    } else if (user.tipo === "familiar") {
      if (!user.pacienteId) {
        return res.status(400).json({ erro: "Familiar não vinculado a paciente" })
      }
      pacienteId = user.pacienteId
    }

    const med = await Medicamento.create({
      nome,
      dosagem,
      frequencia,
      userId: pacienteId // pertence ao paciente
    })

    res.status(201).json(med)
    console.log(`Usuário ${req.userId} criou o medicamento ${med.nome}`)
  } catch (err) {
    res.status(500).json({ erro: "Erro ao cadastrar medicamento" })
  }
  
})

 /**
 * @swagger
 * /medicamentos/status:
 *   get:
 *     summary: Retorna medicamentos tomados e pendentes do paciente
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de medicamentos separados por status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tomados:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       nome:
 *                         type: string
 *                       dosagem:
 *                         type: string
 *                       frequencia:
 *                         type: string
 *                       tomado:
 *                         type: boolean
 *                 pendentes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       nome:
 *                         type: string
 *                       dosagem:
 *                         type: string
 *                       frequencia:
 *                         type: string
 *                       tomado:
 *                         type: boolean
 *       500:
 *         description: Erro ao buscar medicamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Erro ao buscar medicamentos
 */
router.get("/status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)

    const pacienteId =
      user.tipo === "paciente" ? user._id : user.pacienteId

    const tomados = await Medicamento.find({
      userId: pacienteId,
      tomado: true
    })

    const pendentes = await Medicamento.find({
      userId: pacienteId,
      tomado: false
    })

    res.json({ tomados, pendentes })

  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar medicamentos" })
  }
})

/**
 * @swagger
 * /medicamentos/{id}:
 *   put:
 *     summary: Atualizar um medicamento
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do medicamento
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Paracetamol"
 *             quantidade: 15
 *             horario: "10:00"
 *     responses:
 *       200:
 *         description: Medicamento atualizado
 *       404:
 *         description: Medicamento não encontrado
 */
router.put("/:id", auth, async (req, res) => {
  const med = await Medicamento.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(med)
  console.log(`Usuário ${req.userId} atualizou o medicamento ${med.nome}`)
})

/**
 * @swagger
 * /medicamentos/{id}:
 *   delete:
 *     summary: Deletar um medicamento
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do medicamento
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medicamento deletado
 *       404:
 *         description: Medicamento não encontrado
 */
router.delete("/:id", auth, async (req, res) => {
  await Medicamento.findByIdAndDelete(req.params.id)
  res.json("Deletado")
  console.log(`Usuário ${req.userId} deletou o medicamento ${req.params.id}`)
})

/**
 * @swagger
 * /medicamentos/{id}/tomei:
 *   patch:
 *     summary: Confirma que o paciente tomou o medicamento
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do medicamento
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medicamento marcado como tomado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 dosagem:
 *                   type: string
 *                 frequencia:
 *                   type: string
 *                 tomado:
 *                   type: boolean
 *       403:
 *         description: Apenas pacientes podem confirmar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Apenas pacientes podem confirmar
 *       404:
 *         description: Medicamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Medicamento não encontrado
 *       500:
 *         description: Erro interno no servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Erro ao confirmar medicamento
 */
router.patch("/:id/tomei", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)

    if (user.tipo !== "paciente") {
      return res.status(403).json({ erro: "Apenas pacientes podem confirmar" })
    }

    const med = await Medicamento.findOneAndUpdate(
      { _id: req.params.id, userId: user._id },
      { tomado: true },
      { new: true }
    )

    if (!med) {
      return res.status(404).json({ erro: "Medicamento não encontrado" })
    }

    res.json(med)

  } catch (err) {
    res.status(500).json({ erro: "Erro ao confirmar medicamento" })
  }
})


/**
 * @swagger
 * /medicamentos/status:
 *   get:
 *     summary: Listar medicamentos por status (tomados e pendentes)
 *     tags: [Medicamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de medicamentos separados por status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tomados:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       nome:
 *                         type: string
 *                       tomado:
 *                         type: boolean
 *                 pendentes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       nome:
 *                         type: string
 *                       tomado:
 *                         type: boolean
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao buscar medicamentos
 */
router.get("/status", auth,checkRole(["paciente"]), async (req, res) => {
  try {
    const tomados = await Medicamento.find({
      userId: req.userId,
      tomado: true
    })

    const pendentes = await Medicamento.find({
      userId: req.userId,
      tomado: false
    })

    res.json({ tomados, pendentes })

  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar medicamentos" })
  }
})

module.exports = router