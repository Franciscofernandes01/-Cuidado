require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())
app.use("/perfil", require("./src/routes/profileRoutes"))

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Mongo conectado"))
.catch(err => console.log(err))

app.use("/auth", require("./src/routes/authRoutes"))
app.use("/medicamentos", require("./src/routes/medRoutes"))

app.listen(3000, () => console.log("Servidor rodando na porta 3000"))