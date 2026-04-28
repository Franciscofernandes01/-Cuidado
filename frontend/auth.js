import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"


async function loginGoogle() {
  try {
    const auth = getAuth()
    const provider = new GoogleAuthProvider()

    // FORÇA escolher conta
    provider.setCustomParameters({
      prompt: "select_account"
    })

    const result = await signInWithPopup(auth, provider)
    const user = result.user

    console.log("Logado com:", user.email)

    const token = await user.getIdToken()

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

  } catch (error) {
    console.error("Erro login:", error)
  }
}

async function logout() {
  const auth = getAuth()

  await signOut(auth) 

  localStorage.removeItem("token")

  console.log("Deslogado")
}