jest.mock("../config/firebase", () => ({
  admin: {
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: "fake-user-id"
      })
    })
  },

  db: {
    collection: jest.fn(() => ({
      add: jest.fn(),

      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            tipo: "paciente"
          })
        })
      }))
    }))
  }
}))

const request = require("supertest")
const app = require("../../server")

describe("Medicamento inválido", () => {

  test("Deve falhar sem nome do medicamento", async () => {

    const response = await request(app)
      .post("/medicamentos")
      .set("Authorization", "Bearer fake-token")
      .send({
        dosagem: "500mg"
      })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

})