const mockCollection = jest.fn()
const mockEnviarNotificacao = jest.fn().mockResolvedValue(true)

jest.mock("../config/firebase", () => ({
  db: {
    collection: mockCollection
  }
}))

jest.mock("../services/notificationService", () => ({
  enviarNotificacao: mockEnviarNotificacao
}))

jest.mock("firebase-admin", () => ({
  messaging: () => ({
    send: jest.fn().mockResolvedValue(true)
  })
}))

describe("Monitoramento", () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("Não deve lançar erro ao importar monitoramento", () => {

    expect(() => {
      require("../jobs/monitoramento")
    }).not.toThrow()

  })
// Teste para verificar se o monitoramento detecta pacientes offline e envia notificações
  test("Deve enviar alerta de bateria baixa", async () => {

    const updateMock = jest.fn()

    mockCollection.mockImplementation((collectionName) => {

      if (collectionName === "usuarios") {

        return {

          get: jest.fn().mockResolvedValue({

            docs: [

              {
                id: "paciente1",

                data: () => ({
                  nome: "João",
                  tipo: "paciente",
                  bateria: 15,
                  fcmToken: "token-paciente",

                  ultimoOnline: {
                    toDate: () => new Date()
                  }
                }),

                ref: {
                  update: updateMock
                }
              }

            ]

          }),

          doc: jest.fn(() => ({
            get: jest.fn()
          }))

        }

      }

      if (collectionName === "medicamentos") {

        return {

          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              docs: []
            })
          }))

        }

      }

    })

    const {
      executarMonitoramento
    } = require("../jobs/monitoramento")

    await executarMonitoramento()

    expect(mockEnviarNotificacao).toHaveBeenCalledWith(
      "token-paciente",
      "Bateria baixa",
      expect.stringContaining("15")
    )

  })
// teste para verificar se o monitoramento envia alerta de paciente offline após 30 minutos sem conexão
  test("Deve enviar alerta de paciente offline", async () => {

    const updateMock = jest.fn()

    mockCollection.mockImplementation((collectionName) => {

      if (collectionName === "usuarios") {

        return {

          get: jest.fn().mockResolvedValue({

            docs: [

              {
                id: "paciente1",

                data: () => ({
                  nome: "João",
                  tipo: "paciente",
                  bateria: 90,
                  fcmToken: "token-paciente",

                  ultimoOnline: {
                    toDate: () =>
                      new Date(
                        Date.now() - (31 * 60 * 1000)
                      )
                  }
                }),

                ref: {
                  update: updateMock
                }
              }

            ]

          }),

          doc: jest.fn(() => ({
            get: jest.fn()
          }))

        }

      }

      if (collectionName === "medicamentos") {

        return {

          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              docs: []
            })
          }))

        }

      }

    })

    const {
      executarMonitoramento
    } = require("../jobs/monitoramento")

    await executarMonitoramento()

    expect(mockEnviarNotificacao).toHaveBeenCalledWith(
      "token-paciente",
      "Paciente offline",
      expect.stringContaining("30 minutos")
    )

  })

})
// teste para verificar se o monitoramento detecta pacientes que estão atrasados para tomar o medicamento e envia notificações
test("Deve enviar alerta de estoque baixo", async () => {

  const sendMock = jest.fn().mockResolvedValue(true)

  const admin = require("firebase-admin")

  admin.messaging = () => ({
    send: sendMock
  })

  mockCollection.mockImplementation((collectionName) => {

    if (collectionName === "usuarios") {

      return {

        get: jest.fn().mockResolvedValue({

          docs: [

            {
              id: "paciente1",

              data: () => ({
                nome: "João",
                tipo: "paciente",
                fcmToken: "token-paciente",

                ultimoOnline: {
                  toDate: () => new Date()
                }
              }),

              ref: {
                update: jest.fn()
              }
            }

          ]

        }),

        doc: jest.fn(() => ({
          get: jest.fn()
        }))
      }
    }

    if (collectionName === "medicamentos") {

      return {

        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({

            docs: [

              {
                data: () => ({
                  nome: "Dipirona",
                  dosagem: "500mg",
                  estoque: 2,
                  estoqueMinimo: 5
                }),

                ref: {
                  update: jest.fn()
                }
              }

            ]

          })
        }))
      }
    }
  })

  const {
    executarMonitoramento
  } = require("../jobs/monitoramento")

  await executarMonitoramento()

  expect(sendMock).toHaveBeenCalled()

})
// teste para verificar se o monitoramento envia alerta de hora do medicamento
test("Deve enviar alerta de hora do medicamento", async () => {

  const sendMock = jest.fn().mockResolvedValue(true)

  const admin = require("firebase-admin")

  admin.messaging = () => ({
    send: sendMock
  })

  const agora = new Date()

  const ultimaDose =
    new Date(
      agora.getTime() - (8 * 60 * 60 * 1000)
    )

  mockCollection.mockImplementation((collectionName) => {

    if (collectionName === "usuarios") {

      return {

        get: jest.fn().mockResolvedValue({

          docs: [

            {
              id: "paciente1",

              data: () => ({
                nome: "João",
                tipo: "paciente",
                fcmToken: "token-paciente",

                ultimoOnline: {
                  toDate: () => new Date()
                }
              }),

              ref: {
                update: jest.fn()
              }
            }

          ]

        }),

        doc: jest.fn(() => ({
          get: jest.fn()
        }))
      }
    }

    if (collectionName === "medicamentos") {

      return {

        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({

            docs: [

              {
                data: () => ({
                  nome: "Dipirona",
                  dosagem: "500mg",

                  frequencia: 8,

                  ultimoTomadoEm: {
                    toDate: () => ultimaDose
                  }
                }),

                ref: {
                  update: jest.fn()
                }
              }

            ]

          })
        }))
      }
    }

  })

  const {
    executarMonitoramento
  } = require("../jobs/monitoramento")

  await executarMonitoramento()

  expect(sendMock).toHaveBeenCalled()

})
// teste para verificar se o monitoramento detecta pacientes que estão atrasados para tomar o medicamento e envia notificações
test("Deve enviar alerta de medicamento atrasado", async () => {

  const sendMock = jest.fn().mockResolvedValue(true)

  const admin = require("firebase-admin")

  admin.messaging = () => ({
    send: sendMock
  })

  const ultimaDose = new Date(
    Date.now() -
    ((8 * 60 * 60 * 1000) + (15 * 60 * 1000))
  )

  mockCollection.mockImplementation((collectionName) => {

    if (collectionName === "usuarios") {

      return {

        get: jest.fn().mockResolvedValue({

          docs: [

            {
              id: "paciente1",

              data: () => ({
                nome: "João",
                tipo: "paciente",
                fcmToken: "token-paciente",

                ultimoOnline: {
                  toDate: () => new Date()
                }
              }),

              ref: {
                update: jest.fn()
              }
            }

          ]

        }),

        doc: jest.fn(() => ({
          get: jest.fn()
        }))

      }

    }

    if (collectionName === "medicamentos") {

      return {

        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({

            docs: [

              {
                data: () => ({
                  nome: "Dipirona",
                  dosagem: "500mg",

                  frequencia: 8,

                  ultimoTomadoEm: {
                    toDate: () => ultimaDose
                  }

                }),

                ref: {
                  update: jest.fn()
                }

              }

            ]

          })
        }))

      }

    }

  })

  const {
    executarMonitoramento
  } = require("../jobs/monitoramento")

  await executarMonitoramento()

  expect(sendMock).toHaveBeenCalled()

})
// teste para verificar se o monitoramento detecta pacientes que estão atrasados para tomar o medicamento e envia notificações
test("Deve enviar alerta de medicamento não confirmado", async () => {

  const sendMock = jest.fn().mockResolvedValue(true)

  const admin = require("firebase-admin")

  admin.messaging = () => ({
    send: sendMock
  })

  const ultimaDose = new Date(
    Date.now() -
    ((8 * 60 * 60 * 1000) + (35 * 60 * 1000))
  )

  mockCollection.mockImplementation((collectionName) => {

    if (collectionName === "usuarios") {

      return {

        get: jest.fn().mockResolvedValue({

          docs: [

            {
              id: "paciente1",

              data: () => ({
                nome: "João",
                tipo: "paciente",
                fcmToken: "token-paciente",

                ultimoOnline: {
                  toDate: () => new Date()
                }
              }),

              ref: {
                update: jest.fn()
              }
            }

          ]

        }),

        doc: jest.fn(() => ({
          get: jest.fn()
        }))

      }

    }

    if (collectionName === "medicamentos") {

      return {

        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({

            docs: [

              {
                data: () => ({
                  nome: "Dipirona",
                  dosagem: "500mg",

                  frequencia: 8,

                  ultimoTomadoEm: {
                    toDate: () => ultimaDose
                  }

                }),

                ref: {
                  update: jest.fn()
                }

              }

            ]

          })
        }))

      }

    }

  })

  const {
    executarMonitoramento
  } = require("../jobs/monitoramento")

  await executarMonitoramento()

  expect(sendMock).toHaveBeenCalled()

})
// teste para verificar se o monitoramento não reenvia alerta de bateria baixa no mesmo dia
test("Não deve reenviar alerta de bateria no mesmo dia", async () => {

  mockEnviarNotificacao.mockClear()

  const hoje =
    new Date().toISOString().split("T")[0]

  mockCollection.mockImplementation((collectionName) => {

    if (collectionName === "usuarios") {

      return {

        get: jest.fn().mockResolvedValue({

          docs: [

            {
              id: "paciente1",

              data: () => ({
                nome: "João",

                tipo: "paciente",

                bateria: 15,

                alertaBateriaEnviado: hoje,

                fcmToken: "token-paciente",

                ultimoOnline: {
                  toDate: () => new Date()
                }

              }),

              ref: {
                update: jest.fn()
              }

            }

          ]

        }),

        doc: jest.fn(() => ({
          get: jest.fn()
        }))

      }

    }

    if (collectionName === "medicamentos") {

      return {

        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: []
          })
        }))

      }

    }

  })

  const {
    executarMonitoramento
  } = require("../jobs/monitoramento")

  await executarMonitoramento()

  expect(mockEnviarNotificacao)
    .not.toHaveBeenCalled()

})
// teste para verificar se o monitoramento remove tokens inválidos após falha no envio de notificação
test("Deve remover token inválido", async () => {

  const updateMock = jest.fn()

  const admin = require("firebase-admin")

  admin.messaging = () => ({
    send: jest.fn().mockRejectedValue({
      code:
        "messaging/registration-token-not-registered"
    })
  })

  mockCollection.mockImplementation((collectionName) => {

    if (collectionName === "usuarios") {

      return {

        get: jest.fn().mockResolvedValue({

          docs: [

            {
              id: "paciente1",

              data: () => ({
                nome: "João",
                tipo: "paciente",

                fcmToken: "token-invalido",

                ultimoOnline: {
                  toDate: () => new Date()
                }

              }),

              ref: {
                update: updateMock
              }

            }

          ]

        }),

        doc: jest.fn(() => ({
          get: jest.fn()
        }))

      }

    }

    if (collectionName === "medicamentos") {

      return {

        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({

            docs: [

              {
                data: () => ({
                  nome: "Dipirona",

                  estoque: 1,

                  estoqueMinimo: 5

                }),

                ref: {
                  update: jest.fn()
                }

              }

            ]

          })
        }))

      }

    }

  })

  const {
    executarMonitoramento
  } = require("../jobs/monitoramento")

  await executarMonitoramento()

  expect(updateMock).toHaveBeenCalled()

})