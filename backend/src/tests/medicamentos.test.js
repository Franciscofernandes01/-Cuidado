jest.mock("../../src/config/firebase")
jest.mock("firebase-admin")

const request = require("supertest")
const app = require("../../server")

describe("Medicamentos", () => {

  test("Deve bloquear sem token", async () => {

    const response = await request(app)
      .post("/medicamentos")
      .send({})

    expect(response.statusCode).toBe(401)
  })

  test("Deve validar campos obrigatórios", async () => {

    const response = await request(app)
      .post("/medicamentos")
      .set("Authorization", "Bearer tokenfake")
      .send({
        nome: "Dipirona"
      })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

})