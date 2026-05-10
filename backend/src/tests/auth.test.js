const request = require("supertest")
const app = require("../../server")

describe("Auth", () => {

  test("Deve bloquear rota protegida sem token", async () => {

    const response = await request(app)
      .patch("/auth/status")

    expect(response.statusCode).toBe(401)
  })

  test("Deve retornar erro sem token no login google", async () => {

    const response = await request(app)
      .post("/auth/google")
      .send({})

    expect(response.statusCode).toBe(400)
  })

})