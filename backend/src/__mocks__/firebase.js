const verifyIdToken = jest.fn().mockResolvedValue({
  uid: "usuario-fake"
})

const send = jest.fn().mockResolvedValue(true)

const add = jest.fn().mockResolvedValue({
  id: "fake-id"
})

const get = jest.fn().mockResolvedValue({
  exists: true,

  data: () => ({
    nome: "Usuário Fake",
    tipo: "paciente",
    pacienteId: "paciente123",
    familiarId: "familiar123",
    fcmToken: "tokenfake",
    ultimoOnline: {
      toDate: () => new Date()
    }
  }),

  docs: []
})

const update = jest.fn().mockResolvedValue(true)

const where = jest.fn(() => ({
  get
}))

const doc = jest.fn(() => ({
  get,
  update
}))

const collection = jest.fn(() => ({
  add,
  doc,
  get,
  where
}))

const firestore = jest.fn(() => ({
  collection
}))

const admin = {
  initializeApp: jest.fn(),

  credential: {
    cert: jest.fn()
  },

  firestore,

  auth: () => ({
    verifyIdToken
  }),

  messaging: () => ({
    send
  })
}

const db = {
  collection
}

module.exports = {
  admin,
  db
}