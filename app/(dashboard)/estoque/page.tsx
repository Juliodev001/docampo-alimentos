import { prisma } from '@/lib/prisma'
import EstoqueClient from './estoque-client'

export type MovimentoItem = {
  id: string
  tipo: string
  sku: string | null
  produto: string
  produtoId: string
  qtd: number
  dataHora: string
  motivo: string | null
}

export type KpisMovimento = {
  balanco: number
  entrada: number
  saida: number
  ajuste: number
  devolucao: number
  perda: number
  transferencia: number
}

export type ProdutoCadastrado = { id: string; nome: string; sku: string | null; unidade: string }

export default async function EstoquePage() {
  const [entradas, produtos] = await Promise.all([
    prisma.entradaEstoque.findMany({
      include: { produto: { select: { nome: true, sku: true } } },
      orderBy: { data: 'desc' },
    }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])

  const movimentos: MovimentoItem[] = entradas.map(e => ({
    id:       e.id,
    tipo:     'Entrada',
    sku:      e.produto.sku,
    produto:  e.produto.nome,
    produtoId: e.produtoId,
    qtd:      e.quantidade,
    dataHora: e.data.toISOString(),
    motivo:   e.observacao,
  }))

  const totalEntrada = entradas.reduce((s, e) => s + e.quantidade, 0)

  const kpis: KpisMovimento = {
    balanco:      totalEntrada,
    entrada:      totalEntrada,
    saida:        0,
    ajuste:       0,
    devolucao:    0,
    perda:        0,
    transferencia: 0,
  }

  return (
    <EstoqueClient
      movimentos={movimentos}
      kpis={kpis}
      produtosCadastrados={produtos.map(p => ({ id: p.id, nome: p.nome, sku: p.sku, unidade: p.unidade }))}
    />
  )
}
