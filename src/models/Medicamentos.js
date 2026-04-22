const mongoose = require("mongoose")
const { nanoid } = require("nanoid")//utilizada versão nanoid@3.3.11

const MedicamentoSchema = new mongoose.Schema({
  publicId: {// ID público para o medicamento, gerado automaticamente
    type: String,
    default: () => nanoid(6),
    unique: true
  },
    nome: { type: String },
    dosagem: { type: String, required: true },
    frequencia: { type: String, required: true },
    userId: { type: String },// ID do usuário que cadastrou o medicamento
    tomado: { type: Boolean, default: false }
  })

module.exports = mongoose.model("Medicamento", MedicamentoSchema)