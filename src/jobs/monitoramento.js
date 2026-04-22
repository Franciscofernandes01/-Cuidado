const cron = require("node-cron")
const Medicamento = require("../models/Medicamentos")

cron.schedule("* * * * *", async () => {
  console.log("Verificando medicamentos...")

  const agora = new Date()

  const meds = await Medicamento.find()

  meds.forEach(med => {
    if (!med.tomado && med.horario <= agora) {
      console.log(`Alerta: ${med.nome}`)
      // aqui você chama o Firebase depois
    }
  })
})