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
          exists: false
        }),

        update: jest.fn(),

        delete: jest.fn()
      }))
    }))
  }
}))

const request = require("supertest")
const app = require("../../server")

describe("Vínculo QR", () => {

  test("Deve falhar com token inválido", async () => {

    const response = await request(app)
      .post("/auth/vincular")
      .set("Authorization", "Bearer fake-token")
      .send({
        token: "token-falso"
      })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

})