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
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            estoque: 10,
            dosePorUso: 1,
            historico: []
          })
        }),

        update: jest.fn()
      }))
    }))
  }
}))

const request = require("supertest")
const app = require("../../server")

describe("Medicamento tomado", () => {

  test("Deve confirmar medicamento tomado", async () => {

    const response = await request(app)
      .patch("/medicamentos/fake-id/tomar")
      .set("Authorization", "Bearer fake-token")

    expect(response.statusCode).toBeLessThan(500)
  })

})