module.exports = {
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: "usuario-fake"
    })
  }),

  messaging: () => ({
    send: jest.fn().mockResolvedValue(true)
  })
}