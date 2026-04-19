const mongoose = require("mongoose")

const MedicamentoSchema = new mongoose.Schema({
  nome: String,
  dosagem: String,
  frequencia: String,
  userId: String
})

module.exports = mongoose.model("Medicamento", MedicamentoSchema)