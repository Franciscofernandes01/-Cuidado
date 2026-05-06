exports.gerarHorarios = (frequenciaHoras) => {
  const horarios = []

  for (let h = 0; h < 24; h += frequenciaHoras) {// gera horários no formato "HH:00"
    const hora = String(h).padStart(2, "0") + ":00"
    horarios.push(hora)
  }

  return horarios
}
// função para exibir tempo relativo (ex: "há 5 min", "há 2 h")
function tempoRelativo(data) {
  if (!data) return null

  const diff = new Date() - data
  const min = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)

  if (min < 1) return "agora mesmo"
  if (min < 60) return `há ${min} min`
  if (h < 24) return `há ${h} h`
  return `há ${d} dias`
}

exports.tempoRelativo = tempoRelativo