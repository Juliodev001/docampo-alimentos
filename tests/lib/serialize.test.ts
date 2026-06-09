import { describe, it, expect } from 'vitest'
import { s } from '@/lib/serialize'

// Simula o tipo Decimal do Prisma
function makeDecimal(value: number) {
  return {
    constructor: { name: 'Decimal' },
    toNumber: () => value,
  }
}

describe('s() — serialização de Decimal para number', () => {
  it('converte um Decimal para number', () => {
    const result = s(makeDecimal(19.99))
    expect(result).toBe(19.99)
  })

  it('converte Decimal zero', () => {
    expect(s(makeDecimal(0))).toBe(0)
  })

  it('converte Decimal negativo', () => {
    expect(s(makeDecimal(-5.5))).toBe(-5.5)
  })

  it('não altera strings', () => {
    expect(s('texto')).toBe('texto')
  })

  it('não altera numbers', () => {
    expect(s(42)).toBe(42)
  })

  it('não altera null', () => {
    expect(s(null)).toBeNull()
  })

  it('não altera undefined', () => {
    expect(s(undefined)).toBeUndefined()
  })

  it('não altera boolean', () => {
    expect(s(true)).toBe(true)
  })

  it('não altera Date', () => {
    const d = new Date('2026-01-01')
    expect(s(d)).toBe(d)
  })

  it('converte campo Decimal dentro de objeto', () => {
    const obj = { nome: 'Produto', preco: makeDecimal(9.9) }
    const result = s(obj) as { nome: string; preco: number }
    expect(result.preco).toBe(9.9)
    expect(result.nome).toBe('Produto')
  })

  it('converte múltiplos campos Decimal no mesmo objeto', () => {
    const obj = {
      totalValor: makeDecimal(100),
      frete: makeDecimal(15.5),
      desconto: makeDecimal(0),
    }
    const result = s(obj) as typeof obj
    expect(result.totalValor).toBe(100)
    expect(result.frete).toBe(15.5)
    expect(result.desconto).toBe(0)
  })

  it('converte Decimal em array de objetos', () => {
    const arr = [
      { id: '1', valor: makeDecimal(10) },
      { id: '2', valor: makeDecimal(20) },
    ]
    const result = s(arr) as typeof arr
    expect(result[0].valor).toBe(10)
    expect(result[1].valor).toBe(20)
  })

  it('converte Decimal em objetos aninhados', () => {
    const obj = {
      pedido: {
        id: 'p-1',
        total: makeDecimal(200),
        itens: [{ produto: 'X', valorUnit: makeDecimal(50) }],
      },
    }
    const result = s(obj) as typeof obj
    expect(result.pedido.total).toBe(200)
    expect(result.pedido.itens[0].valorUnit).toBe(50)
  })

  it('preserva campos não-Decimal em objeto misto', () => {
    const obj = {
      id: 'abc',
      numero: 42,
      ativo: true,
      data: new Date('2026-06-01'),
      preco: makeDecimal(99),
    }
    const result = s(obj) as typeof obj
    expect(result.id).toBe('abc')
    expect(result.numero).toBe(42)
    expect(result.ativo).toBe(true)
    expect(result.preco).toBe(99)
  })
})
