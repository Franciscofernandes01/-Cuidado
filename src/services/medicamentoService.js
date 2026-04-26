const { db } = require("../config/firebase")
const { nanoid } = require("nanoid")

// criar medicamento
exports.criarMedicamento = async (data) => {
  const doc = await db.collection("medicamentos").add({
    publicId: nanoid(6),
    nome: data.nome,
    dosagem: data.dosagem,
    frequencia: data.frequencia,
    userId: data.userId,
    tomado: false,
    criadoEm: new Date()
  })

  return { id: doc.id, ...data }
}

// listar por usuário
exports.listarPorUsuario = async (userId) => {
  const snapshot = await db
    .collection("medicamentos")
    .where("userId", "==", userId)
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