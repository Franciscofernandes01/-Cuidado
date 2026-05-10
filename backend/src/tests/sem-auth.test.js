const request = require("supertest")
const app = require("../../server")

describe("Sem autenticação", () => {

  test("Deve bloquear rota protegida", async () => {

    const response = await request(app)
      .patch("/auth/status")

    expect(response.statusCode).toBe(401)
  })

})