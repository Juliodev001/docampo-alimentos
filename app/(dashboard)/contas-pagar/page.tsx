import { prisma } from '@/lib/prisma'
import ContasPagarClient from './contas-pagar-client'

export default async function ContasPagarPage() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

  const compras = await prisma.compra.findMany({
    include: { fornecedor: true, itens: true, centroCusto: true },
    orderBy: { vencimento: 'asc' },
  })

  const totalAPagar  = compras.filter(c => c.status !== 'PAGO').reduce((s, c) => s + c.totalValor, 0)
  const totalPago    = compras.filter(c => c.status === 'PAGO').reduce((s, c) => s + c.totalValor, 0)

  const vencidas = compras.filter(c => {
    const v = new Date(c.vencimento); v.setHours(0, 0, 0, 0)
    return c.status !== 'PAGO' && v < hoje
  }).length

  const vencendoHoje = compras.filter(c => {
    const v = new Date(c.vencimento); v.setHours(0, 0, 0, 0)
    return c.status === 'A_PAGAR' && v.getTime() === hoje.getTime()
  }).length

  const vencendoMes = compras.filter(c => {
    const v = new Date(c.vencimento)
    return c.status === 'A_PAGAR' && v >= inicioMes && v <= fimMes && v >= hoje
  }).length

  return (
    <ContasPagarClient
      contas={compras.map(c => ({
        id:           c.id,
        tipo:         c.categoria,
        fornecedor:   c.fornecedor.nome,
        roca:         c.centroCusto?.nome ?? null,
        valor:        c.totalValor,
        vencimento:   c.vencimento.toISOString(),
        status:       c.status !== 'PAGO' && new Date(c.vencimento) < hoje ? 'VENCIDO' : c.status,
        observacao:   c.observacao,
      }))}
      totalAPagar={totalAPagar}
      totalPago={totalPago}
      vencidas={vencidas}
      vencendoHoje={vencendoHoje}
      vencendoMes={vencendoMes}
    />
  )
}
