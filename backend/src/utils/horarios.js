exports.gerarHorarios = (frequenciaHoras) => {
  const horarios = []

  for (let h = 0; h < 24; h += frequenciaHoras) {// gera horários no formato "HH:00"
    const hora = String(h).padStart(2, "0") + ":00"
    horarios.push(hora)
  }

  return horarios
}