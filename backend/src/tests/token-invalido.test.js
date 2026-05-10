jest.mock("../config/firebase", () => ({
  admin: {
    auth: () => ({
      verifyIdToken: jest.fn().mockRejectedValue(
        new Error("Token inválido")
      )
    })
  },

  db: {}
}))

const request = require("supertest")
const app = require("../../server")

describe("Token inválido", () => {

  test("Deve bloquear token inválido", async () => {

    const response = await request(app)
      .patch("/auth/status")
      .set("Authorization", "Bearer token-invalido")

    expect(response.statusCode).toBe(401)
  })

})