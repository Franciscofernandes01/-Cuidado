jest.mock("../../src/config/firebase")
jest.mock("firebase-admin")

const request = require("supertest")
const app = require("../../server")

describe("SOS", () => {

  test("Deve bloquear sem token", async () => {

    const response = await request(app)
      .post("/auth/sos")

    expect(response.statusCode).toBe(401)
  })

  test("Deve retornar erro com token inválido", async () => {

    const response = await request(app)
      .post("/auth/sos")
      .set("Authorization", "Bearer tokenfake")

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

})