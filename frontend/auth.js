import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"

let intervalStatus = null // controla o intervalo

// ================= LOGIN =================
async function loginGoogle() {
  try {
    const auth = getAuth()
    const provider = new GoogleAuthProvider()

    provider.setCustomParameters({
      prompt: "select_account"
    })
// abre popup para login
    const result = await signInWithPopup(auth, provider)
    const user = result.user

    console.log("Logado com:", user.email)

    const token = await user.getIdToken()

    // LOGIN NO BACKEND
    const response = await fetch("http://localhost:3000/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        tipo: "familiar"
      })
    })

    const data = await response.json()
    console.log("Backend:", data)

    localStorage.setItem("token", token)

    // Atualiza status imediatamente
    await atualizarStatus()

    // Inicia atualização automática
    iniciarAtualizacaoAutomatica()

  } catch (error) {
    console.error("Erro login:", error)
  }
}

// ================= ATUALIZAR STATUS =================
async function atualizarStatus() {
  try {
    const token = localStorage.getItem("token")
    if (!token) return

    //simulação de bateria (0 a 100)
    const bateria = Math.floor(Math.random() * 100)

    await fetch("http://localhost:3000/usuarios/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        bateria,
        online: true
      })
    })

    console.log("Status atualizado:", bateria + "%")

  } catch (err) {
    console.log("Erro ao atualizar status:", err)
  }
}

// ================= LOOP AUTOMÁTICO =================
function iniciarAtualizacaoAutomatica() {
  if (intervalStatus) return // evita duplicar

  intervalStatus = setInterval(() => {
    atualizarStatus()
  }, 60000) // 1 minuto

  console.log("Monitoramento iniciado")
}

// ================= LOGOUT =================
async function logout() {
  try {
    const auth = getAuth()
    const token = localStorage.getItem("token")

    //marca offline antes de sair
    if (token) {
      await fetch("http://localhost:3000/usuarios/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          online: false
        })
      })
    }

    // para o monitoramento
    if (intervalStatus) {
      clearInterval(intervalStatus)
      intervalStatus = null
    }

    await signOut(auth)
    localStorage.removeItem("token")

    console.log("Deslogado")

  } catch (err) {
    console.log("Erro logout:", err)
  }
}

async function enviarSocorro() {
    try {
  const token = localStorage.getItem("token")

  await fetch("http://localhost:3000/auth/sos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()

     console.log(data)

   } catch (err) {

     console.log(err)
   }
}
