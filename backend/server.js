require("dotenv").config()
const express = require("express")
const cors = require("cors")
const swaggerUi = require("swagger-ui-express")
const swaggerSpec = require("./swagger")


const app = express()

//  MIDDLEWARES 
app.use(cors({origin: "*"}))
app.use(express.json())

//  ROTAS 
// authRoutes agora contém:
// /auth/google
// /auth/status
// /auth/paciente/status
// /auth/vincularUid
// /auth/gerar
// /auth/vincular
// /auth/socorro
app.use("/auth", require("./src/routes/authRoutes"))

// medicamentos 
app.use("/medicamentos", require("./src/routes/medRoutes"))


//  SWAGGER 
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))


//  CRON JOB 
require("./src/jobs/monitoramento")



if (process.env.NODE_ENV !== "test") {
//  START SERVER 
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000")
  console.log("Swagger em http://localhost:3000/api-docs")
})
}

module.exports = app // para testes