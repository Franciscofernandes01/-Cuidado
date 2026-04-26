exports.register = async (req, res) => {
  try {
    const { nome, email, senha, tipo, pacienteId } = req.body

    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ erro: "Preencha todos os campos" })
    }

    const userRecord = await admin.auth().createUser({
      email,
      password: senha,
      displayName: nome
    })

    const uid = userRecord.uid

    const userData = {
      nome,
      email,
      tipo,
      criadoEm: new Date()
    }

    // 🔥 SE FOR FAMILIAR → PRECISA VINCULAR PACIENTE
    if (tipo === "familiar") {
      if (!pacienteId) {
        return res.status(400).json({ erro: "Familiar precisa de pacienteId" })
      }

      userData.pacienteId = pacienteId
    }

    await db.collection("usuarios").doc(uid).set(userData)

    res.status(201).json({
      mensagem: "Usuário registrado com sucesso",
      uid
    })

  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
}