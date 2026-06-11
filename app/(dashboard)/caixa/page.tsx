import { prisma } from '@/lib/prisma'
import CaixaClient from './caixa-client'

export default async function CaixaPage() {
  const [contas, clientes, fornecedores, centrosCusto] = await Promise.all([
    prisma.contaBancaria.findMany({
      include: { movimentacoes: { orderBy: { data: 'desc' } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.fornecedor.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.centroCusto.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ])

  const contasSerializadas = contas.map((c) => ({
    ...c,
    saldoInicial: Number(c.saldoInicial),
    movimentacoes: c.movimentacoes.map((m) => ({ ...m, valor: Number(m.valor) })),
  }))

  const todasMovimentacoes = contasSerializadas
    .flatMap((c) => c.movimentacoes.map((m) => ({ ...m, contaNome: c.nome })))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  const saldoTotal = contasSerializadas.reduce((s, c) => {
    const entradas = c.movimentacoes.filter((m) => m.tipo === 'ENTRADA').reduce((acc, m) => acc + m.valor, 0)
    const saidas   = c.movimentacoes.filter((m) => m.tipo === 'SAIDA').reduce((acc, m) => acc + m.valor, 0)
    return s + c.saldoInicial + entradas - saidas
  }, 0)

  const entradPeriodo = todasMovimentacoes.filter((m) => m.tipo === 'ENTRADA').reduce((s, m) => s + m.valor, 0)
  const saidPeriodo   = todasMovimentacoes.filter((m) => m.tipo === 'SAIDA').reduce((s, m) => s + m.valor, 0)
  const pendentes     = todasMovimentacoes.filter((m) => !m.conciliado).length

  return (
    <CaixaClient
      contas={contasSerializadas}
      todasMovimentacoes={todasMovimentacoes}
      saldoTotal={saldoTotal}
      entradPeriodo={entradPeriodo}
      saidPeriodo={saidPeriodo}
      pendentes={pendentes}
      clientes={clientes}
      fornecedores={fornecedores}
      centrosCusto={centrosCusto}
    />
  )
}
