jest.mock("../../src/config/firebase")
jest.mock("firebase-admin")

describe("Monitoramento", () => {

  test("Cron deve existir", () => {

    const cron = require("../jobs/monitoramento")

    expect(cron).toBeDefined()
  })

  test("Não deve lançar erro ao importar monitoramento", () => {

    expect(() => {
      require("../jobs/monitoramento")
    }).not.toThrow()
  })

})