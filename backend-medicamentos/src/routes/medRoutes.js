const router = require("express").Router()
const auth = require("../middlewares/auth")
const Medicamento = require("../models/Medicamentos")

// Criar
router.post("/", auth, async (req, res) => {
  const med = await Medicamento.create({
    ...req.body,
    userId: req.userId
  })
  res.json(med)
})

// Listar
router.get("/", auth, async (req, res) => {
  const meds = await Medicamento.find({ userId: req.userId })
  res.json(meds)
})

// Atualizar
router.put("/:id", auth, async (req, res) => {
  const med = await Medicamento.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(med)
})

// Deletar
router.delete("/:id", auth, async (req, res) => {
  await Medicamento.findByIdAndDelete(req.params.id)
  res.json("Deletado")
})

module.exports = router