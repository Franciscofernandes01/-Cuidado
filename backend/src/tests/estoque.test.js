describe("Estoque baixo", () => {

  test("Deve identificar estoque baixo", () => {

    const estoque = 2
    const estoqueMinimo = 5

    expect(estoque <= estoqueMinimo).toBe(true)
  })

})