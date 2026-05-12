const { db } = require("../config/firebase")
const { nanoid } = require("nanoid")
const axios = require("axios")
const { gerarHorarios } = require("../utils/horarios")

// criar medicamento
/*exports.criarMedicamento = async (data) => {
  const doc = await db.collection("medicamentos").add({
    publicId: nanoid(6),
    nome: data.nome,
    dosagem: data.dosagem,
    categoria: data.categoria,// ex: comprimido, xarope, injeção
    frequencia: data.frequencia,
    estoque: Number(data.estoque) || 0,
    estoqueMinimo: Number(data.estoqueMinimo) || 0,//pode ter min ou não
    observacao: data.observacao || "",// para observação do medicamento
    //dias: data.days, para quais dias da semana o remédio deve ser tomado
    uid: data.uid,// id do usuário dono do medicamento
    tomado: false,
    criadoEm: new Date()// para controle de notificações
  })

  return { id: doc.id, ...data }
}*/

// criar medicamento
exports.criarMedicamento = async (data) => {
  const categoriaConfig = categoriasConfig[data.categoria]

  if (!categoriaConfig) {
    throw new Error("Categoria inválida")
  }

  const horarios = gerarHorarios(data.frequencia)

  const medicamento = {
    publicId: nanoid(6),
    nome: data.nome,
    dosagem: data.dosagem,
    dosePorUso: data.dosePorUso,
    categoria: data.categoria, // ex: comprimido, xarope, injeção
    unidade: categoriaConfig.unidade,
    fatorConversao: categoriaConfig.fatorConversao,
    frequencia: data.frequencia,
    primeiraDoseEm: data.primeiraDoseEm || new Date().toISOString(), // para controle de notificações, pode ser a data de criação ou uma data futura
    horarios,
    estoque: Number(data.estoque) || 0,
    estoqueMinimo: Number(data.estoqueMinimo) || 0,
    observacao: data.observacao || "",// para observação do medicamento
    pacienteId: data.pacienteId, // id do paciente (pode ser diferente do uid do usuário, para permitir que familiares controlem os medicamentos)
    uid: data.uid,// id do usuário dono do medicamento
    tomado: false,
    criadoEm: new Date().toISOString()
  }


  const doc = await db.collection("medicamentos").add(medicamento)

  return { id: doc.id, ...medicamento }
}

const categoriasConfig = { // para controle de estoque e notificações
  Comprimido: {
    unidade: "un",
    fatorConversao: 1
  },

  Cápsula: {
    unidade: "un",
    fatorConversao: 1
  },

  Gotas: {
    unidade: "gotas",
    fatorConversao: 20 // 1 ml = 20 gotas (varia conforme o medicamento, mas é uma média comum)
  },

  Xarope: {
    unidade: "ml",
    fatorConversao: 1
  },

  Injeção: {
    unidade: "ampola",
    fatorConversao: 1 // pode ser ampola, seringa, etc. Depende do medicamento específico
  },

  Pomada: {
    unidade: "g",
    fatorConversao: 1 // pode ser grama, tubo, etc. Depende do medicamento específico
  }
}

// listar por usuário
exports.listarPorUsuario = async (uid) => {
  const snapshot = await db
    .collection("medicamentos")
    .where("uid", "==", uid)
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

// atualizar
exports.atualizarMedicamento = async (id, data) => {
  await db.collection("medicamentos").doc(id).update(data)
}

// deletar
exports.deletarMedicamento = async (id) => {
  await db.collection("medicamentos").doc(id).delete()
}

// marcar como tomado
exports.marcarComoTomado = async (id) => {
  await db.collection("medicamentos").doc(id).update({
    tomado: true
  })
}