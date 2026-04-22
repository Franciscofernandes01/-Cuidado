const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  senha: { type: String, required: true },

  tipo: {
    type: String,
    enum: ["paciente", "familiar"],
    required: true
  },

  //relação com paciente
  pacienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
})

module.exports = mongoose.model("User", UserSchema)