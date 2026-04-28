const { db } = require("../config/firebase")
const { nanoid } = require("nanoid")
const axios = require("axios")

// criar medicamento
exports.criarMedicamento = async (data) => {
  const doc = await db.collection("medicamentos").add({
    publicId: nanoid(6),
    nome: data.nome,
    dosagem: data.dosagem,
    horarios: data.horarios,
    dias: data.days,
    uid: data.uid,
    tomado: false,
    criadoEm: new Date()
  })

  return { id: doc.id, ...data }
}

exports.buscarMedicamento = async (nome) => {
  const response = await axios.get(
    `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${nome}&limit=5`
  )

  return response.data.results.map(item => ({
    nome: item.openfda?.brand_name?.[0],
    principioAtivo: item.openfda?.generic_name?.[0],
    fabricante: item.openfda?.manufacturer_name?.[0]
  }))
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