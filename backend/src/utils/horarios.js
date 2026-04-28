exports.gerarHorarios = (frequenciaHoras) => {
  const horarios = []

  for (let h = 0; h < 24; h += frequenciaHoras) {
    const hora = String(h).padStart(2, "0") + ":00"
    horarios.push(hora)
  }

  return horarios
}