require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const app = express()
const checkRole = require("./src/middlewares/permissao")// Importa o middleware de verificação de permissão

app.use("/usuarios", require("./src/routes/authRoutes"))
app.use(cors())
app.use(express.json())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

require("./src/jobs/monitoramento")// Inicia o job de monitoramento de medicamentos

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Mongo conectado"))
.catch(err => console.log(err))

app.use("/auth", require("./src/routes/authRoutes"))
app.use("/medicamentos", require("./src/routes/medRoutes"))

app.listen(3000, () => {
            console.log("Servidor rodando na porta 3000");
            console.log('Swagger em http://localhost:3000/api-docs');
        });