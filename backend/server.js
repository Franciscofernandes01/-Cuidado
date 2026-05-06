require("dotenv").config()
const express = require("express")
const cors = require("cors")
const swaggerUi = require("swagger-ui-express")
const swaggerSpec = require("./swagger")

const app = express()

// middlewares
app.use(cors())
app.use(express.json())

// rotas
app.use("/auth", require("./src/routes/authRoutes"))
app.use("/medicamentos", require("./src/routes/medRoutes"))

// swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// cron (monitoramento)
require("./src/jobs/monitoramento")


// start server
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000")
  console.log("Swagger em http://localhost:3000/api-docs")
})