jest.mock("../config/firebase", () => ({
  admin: {
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: "fake-user-id"
      })
    }),

    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              tipo: "familiar"
            })
          })
        }))
      }))
    }))
  },

  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            tipo: "familiar"
          })
        })
      }))
    }))
  }
}))

const request = require("supertest")
const app = require("../../server")

describe("Permissões", () => {

  test("Deve bloquear paciente em rota de familiar", async () => {

    const response = await request(app)
      .get("/auth/gerar")

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

})