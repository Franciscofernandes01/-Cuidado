const router = require("express").Router();
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/permissao");
const { db } = require("../config/firebase");
const { gerarHorarios } = require("../utils/horarios");
const medicamentoService = require("../services/medicamentoService");

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
 *     summary: Cadastra um novo medicamento
 *     description: |
 *       Permite que um usuário do tipo **familiar** cadastre um medicamento
 *       para o paciente vinculado.
 *
 *       O sistema:
 *       - valida frequência da medicação;
 *       - valida data da primeira dose;
 *       - cria horários automáticos;
 *       - registra estoque e controle de doses;
 *       - associa o medicamento ao paciente vinculado.
 *
 *     tags:
 *       - Medicamentos
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - dosagem
 *               - categoria
 *               - dosePorUso
 *               - frequencia
 *               - primeiraDoseEm
 *               - estoque
 *               - estoqueMinimo
 *               - observacao
 *
 *             properties:
 *
 *               nome:
 *                 type: string
 *                 description: Nome do medicamento
 *                 example: Dipirona
 *
 *               dosagem:
 *                 type: string
 *                 description: Dosagem do medicamento
 *                 example: 500mg
 *
 *               categoria:
 *                 type: string
 *                 description: Categoria/formato do medicamento
 *                 example: comprimido
 *
 *               dosePorUso:
 *                 type: number
 *                 description: Quantidade utilizada por dose
 *                 example: 1
 *
 *               frequencia:
 *                 type: number
 *                 description: Frequência em horas entre as doses
 *                 example: 8
 *
 *               primeiraDoseEm:
 *                 type: string
 *                 format: date-time
 *                 description: Data e horário da primeira dose
 *                 example: "2026-05-12T08:00:00.000Z"
 *
 *               estoque:
 *                 type: number
 *                 description: Quantidade disponível em estoque
 *                 example: 20
 *
 *               estoqueMinimo:
 *                 type: number
 *                 description: Quantidade mínima para alerta de estoque baixo
 *                 example: 5
 *
 *               observacao:
 *                 type: string
 *                 description: Observações sobre o medicamento
 *                 example: Tomar após as refeições
 *
 *     responses:
 *
 *       201:
 *         description: Medicamento cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *
 *                 id:
 *                   type: string
 *                   example: a1b2c3d4
 *
 *                 nome:
 *                   type: string
 *                   example: Dipirona
 *
 *                 dosagem:
 *                   type: string
 *                   example: 500mg
 *
 *                 categoria:
 *                   type: string
 *                   example: comprimido
 *
 *                 frequencia:
 *                   type: number
 *                   example: 8
 *
 *                 estoque:
 *                   type: number
 *                   example: 20
 *
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             examples:
 *
 *               camposObrigatorios:
 *                 value:
 *                   erro: Campos obrigatórios: nome, dosagem, dosePorUso, frequencia,primeiraDoseEm, categoria, estoque, estoque minimo, observacao
 *
 *               frequenciaInvalida:
 *                 value:
 *                   erro: Frequência inválida
 *
 *               primeiraDoseInvalida:
 *                 value:
 *                   erro: primeiraDoseEm inválida
 *
 *               familiarSemPaciente:
 *                 value:
 *                   erro: Familiar não vinculado a paciente
 *
 *       401:
 *         description: Token inválido ou não enviado
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
 *               erro: Acesso negado
 *
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             example:
 *               erro: Usuário não encontrado
 *
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao cadastrar medicamento
 */
router.post("/", auth, checkRole(["familiar"]), async (req, res) => {
  try {
    let {
      nome,
      dosagem,
      categoria,
      dosePorUso,
      frequencia,
      primeiraDoseEm,
      estoque,
      estoqueMinimo,
      observacao,
    } = req.body;

    if (
      !nome ||
      !dosagem ||
      !dosePorUso ||
      !frequencia ||
      !primeiraDoseEm ||
      !categoria ||
      !estoque ||
      !estoqueMinimo ||
      !observacao
    ) {
      return res
        .status(400)
        .json({
          erro: "Campos obrigatórios: nome, dosagem, dosePorUso, frequencia,primeiraDoseEm, categoria, estoque, estoque minimo, observacao",
        });
    }

    frequencia = Number(frequencia);

    if (isNaN(frequencia) || frequencia <= 0 || frequencia > 24) {
      return res.status(400).json({ erro: "Frequência inválida" });
    }

    // valida primeira dose
    const dataPrimeiraDose = new Date(primeiraDoseEm);

    if (isNaN(dataPrimeiraDose.getTime())) {
      return res.status(400).json({
        erro: "primeiraDoseEm inválida",
      });
    }
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const user = userDoc.data();

    if (!user.pacienteId) {
      return res
        .status(400)
        .json({ erro: "Familiar não vinculado a paciente" });
    }

    const medicamento = await medicamentoService.criarMedicamento({
      nome,
      dosagem,
      dosePorUso,
      categoria,
      frequencia,
      primeiraDoseEm: dataPrimeiraDose,
      ultimoTomadoEm: dataPrimeiraDose,
      estoque,
      estoqueMinimo,
      observacao,

      pacienteId: user.pacienteId,

      uid: req.user.uid,
    });

    return res.status(201).json(medicamento);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ erro: "Erro ao cadastrar medicamento" });
  }
});

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
 *         description: Lista de medicamentos
 */
router.get("/status", auth, async (req, res) => {
  try {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const user = userDoc.data();

    const pacienteId =
      user.tipo === "paciente" ? req.user.uid : user.pacienteId;

    if (!pacienteId) {
      return res.status(400).json({ erro: "Paciente não definido" });
    }

    const snapshot = await db
      .collection("medicamentos")
      .where("pacienteId", "==", pacienteId)
      .get();

    const tomados = [];
    const pendentes = [];

    snapshot.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() };
      data.tomado ? tomados.push(data) : pendentes.push(data);
    });

    return res.json({ tomados, pendentes });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ erro: "Erro ao buscar medicamentos" });
  }
});

/**
 * @swagger
 * /medicamentos/{id}:
 *   put:
 *     summary: Atualizar medicamento
 *     description: Atualiza os dados de um medicamento pertencente ao paciente vinculado ao familiar logado.
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
 *           example: abc123medicamentoId
 *     requestBody:
 *       required: true
 *       description: Campos que serão atualizados no medicamento
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Dipirona
 *               dosagem:
 *                 type: string
 *                 example: 500mg
 *               frequencia:
 *                 type: string
 *                 example: 8h em 8h
 *               horario:
 *                 type: string
 *                 example: 08:00
 *     responses:
 *       200:
 *         description: Medicamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Atualizado com sucesso
 *       400:
 *         description: Requisição inválida (body vazio ou dados incorretos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Body vazio
 *       403:
 *         description: Sem permissão para atualizar este medicamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: Sem permissão
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
 *                   example: Erro ao atualizar
 */
router.put("/:id", auth, checkRole(["familiar"]), async (req, res) => {
  try {
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get();
    const user = userDoc.data();

    const ref = db.collection("medicamentos").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ erro: "Medicamento não encontrado" });
    }

    if (doc.data().pacienteId !== user.pacienteId) {
      return res.status(403).json({ erro: "Sem permissão" });
    }

    await ref.update(req.body);

    return res.json({ mensagem: "Atualizado com sucesso" });
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao atualizar" });
  }
});

/**
 * @swagger
 * /medicamentos/{id}:
 *   delete:
 *     summary: Deletar medicamento
 *     description: Permite que o paciente dono ou o familiar vinculado exclua um medicamento
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
 *           example: abc123
 *     responses:
 *       200:
 *         description: Medicamento deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 mensagem: Medicamento deletado com sucesso
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Medicamento não encontrado
 *       500:
 *         description: Erro interno
 */

router.delete("/:id", auth, async (req, res) => {
  try {
    const ref = db.collection("medicamentos").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ erro: "Medicamento não encontrado" });
    }

    const data = doc.data();

    //busca paciente
    const pacienteId = data.pacienteId;

    if (!pacienteId) {
      return res.status(400).json({ erro: "Medicamento sem pacienteId" });
    }

    // usuário logado
    const userId = req.user.uid;

    // busca paciente no banco
    const pacienteDoc = await db.collection("usuarios").doc(pacienteId).get();

    if (!pacienteDoc.exists) {
      return res.status(404).json({ erro: "Paciente não encontrado" });
    }

    const paciente = pacienteDoc.data();

    // regra de permissão
    const podeDeletar =
      userId === pacienteId || // paciente dono
      userId === paciente.familiarId; // familiar vinculado

    if (!podeDeletar) {
      return res.status(403).json({ erro: "Sem permissão" });
    }

    // deleta medicamento
    await ref.delete();

    return res.json({
      mensagem: "Medicamento deletado com sucesso",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ erro: "Erro ao deletar medicamento" });
  }
});

/**
 * @swagger
 * /medicamentos/{id}/historico:
 *   get:
 *     summary: Listar histórico com resumo das doses
 *     description: |
 *       Retorna o histórico completo do medicamento junto com um resumo das doses:
 *       - pendentes
 *       - atrasadas
 *       - tomadas
 *       - notificadas
 *     tags:
 *       - Medicamentos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Histórico com resumo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 medicamento:
 *                   type: string
 *                   example: Dipirona
 *                 resumo:
 *                   type: object
 *                   properties:
 *                     pendentes:
 *                       type: number
 *                       example: 1
 *                     atrasadas:
 *                       type: number
 *                       example: 2
 *                     tomadas:
 *                       type: number
 *                       example: 3
 *                     notificadas:
 *                       type: number
 *                       example: 2
 *                 historico:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       horarioPrevisto:
 *                         type: string
 *                         format: date-time
 *                       dataRegistro:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [pendente, atrasado, notificado, tomado]
 */
router.get("/:id/historico", auth, async (req, res) => {
  try {
    const ref = db.collection("medicamentos").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ erro: "Medicamento não encontrado" });
    }

    const data = doc.data();

    // AQUI: busca o usuário logado
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get();
    const user = userDoc.data();

    // valida acesso (paciente OU familiar vinculado)
    if (
      data.pacienteId !== req.user.uid &&
      user.pacienteId !== data.pacienteId
    ) {
      return res.status(403).json({ erro: "Sem permissão" });
    }

    const historico = data.historico || [];

    // resumo das doses
    const resumo = {
      pendentes: 0,
      atrasadas: 0,
      tomadas: 0,
      notificadas: 0,
    };

    for (const h of historico) {
      if (h.status === "pendente") resumo.pendentes++;
      if (h.status === "atrasado") resumo.atrasadas++;
      if (h.status === "tomado") resumo.tomadas++;
      if (h.status === "notificado") resumo.notificadas++;
    }

    return res.json({
      medicamento: data.nome,
      resumo,
      historico,
    });
  } catch (err) {
    return res.status(500).json({ erro: "Erro ao buscar histórico" });
  }
});

/**
 * @swagger
 * /medicamentos/{id}/tomei:
 *   patch:
 *     summary: Confirmar tomada do medicamento
 *     description: Marca o medicamento como tomado, atualiza o histórico e reduz o estoque com base na dose por uso.
 *     tags:
 *       - Medicamentos
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
 *         description: ID do medicamento
 *         example: abc123xyz
 *
 *     responses:
 *       200:
 *         description: Medicamento confirmado como tomado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Medicamento tomado com sucesso
 *
 *       401:
 *         description: Token inválido ou ausente
 *
 *       403:
 *         description: Usuário sem permissão para confirmar este medicamento
 *         content:
 *           application/json:
 *             example:
 *               erro: Sem permissão
 *
 *       404:
 *         description: Medicamento não encontrado
 *         content:
 *           application/json:
 *             example:
 *               erro: Medicamento não encontrado
 *
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               erro: Erro ao confirmar medicamento
 */
router.patch("/:id/tomei", auth, async (req, res) => {
  try {
    const ref = db.collection("medicamentos").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ erro: "Medicamento não encontrado" });
    }

    const data = doc.data();

    //busca usuário logado
    const userDoc = await db.collection("usuarios").doc(req.user.uid).get();
    const user = userDoc.data();

    //regra de permissão
    const ehPaciente = data.pacienteId === req.user.uid;
    const ehFamiliarDoPaciente = user?.pacienteId === data.pacienteId;

    if (!ehPaciente && !ehFamiliarDoPaciente) {
      return res.status(403).json({ erro: "Sem permissão" });
    }

    const agora = new Date();
    const hoje = new Date().toISOString().split("T")[0];

    const historico = data.historico || [];
    const freqMs = (data.frequencia || 1) * 60 * 60 * 1000;

    // encontra o horário previsto mais próximo
    let horarioBase = data.ultimoTomadoEm
      ? data.ultimoTomadoEm.toDate()
      : new Date(agora.getTime() - freqMs);

    let horarioPrevisto = new Date(horarioBase);

    while (horarioPrevisto < agora) {
      horarioPrevisto = new Date(horarioPrevisto.getTime() + freqMs);
    }

    // volta um passo pra pegar o horário correto
    horarioPrevisto = new Date(horarioPrevisto.getTime() - freqMs);

    // atualiza histórico (evita duplicar)
    const historicoAtualizado = historico.filter(
      (h) => h.horarioPrevisto !== horarioPrevisto.toISOString(),
    );

    historicoAtualizado.push({
      horarioPrevisto: horarioPrevisto.toISOString(),
      dataRegistro: agora.toISOString(),
      status: "tomado",
    });
    // atualiza medicamento
    await ref.update({
      estoque: Math.max((data.estoque || 0) - (data.dosePorUso || 1), 0),
      tomadasHoje: [...(data.tomadasHoje || []), hoje],
      ultimoTomadoEm: agora,
      historico: historicoAtualizado,
      ultimoHorarioNotificado: null,
      ultimoHorarioAtrasado: null,
    });
    return res.json({ mensagem: "Medicamento tomado com sucesso" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ erro: "Erro ao confirmar medicamento" });
  }
});

module.exports = router;
