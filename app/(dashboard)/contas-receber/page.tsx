import { prisma } from '@/lib/prisma'
import ContasReceberClient from './contas-receber-client'

export default async function ContasReceberPage() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

  const titulos = await prisma.tituloFinanceiro.findMany({
    include: { cliente: true },
    orderBy: { dataVenc: 'asc' },
  })

  const totalAReceber = titulos
    .filter(t => t.status !== 'RECEBIDO')
    .reduce((s, t) => s + Number(t.valor), 0)

  const valorRecebido = titulos
    .filter(t => t.status === 'RECEBIDO')
    .reduce((s, t) => s + Number(t.valor), 0)

  const vencidas = titulos.filter(t => {
    const v = new Date(t.dataVenc); v.setHours(0, 0, 0, 0)
    return t.status !== 'RECEBIDO' && v < hoje
  }).length

  const vencendoHoje = titulos.filter(t => {
    const v = new Date(t.dataVenc); v.setHours(0, 0, 0, 0)
    return t.status === 'A_RECEBER' && v.getTime() === hoje.getTime()
  }).length

  const vencendoMes = titulos.filter(t => {
    const v = new Date(t.dataVenc)
    return t.status === 'A_RECEBER' && v >= inicioMes && v <= fimMes && v >= hoje
  }).length

  return (
    <ContasReceberClient
      titulos={titulos.map(t => ({
        id:           t.id,
        cliente:      t.cliente.nome,
        descricao:    t.descricao,
        valor:        Number(t.valor),
        valorPago:    t.status === 'RECEBIDO' ? Number(t.valor) : 0,
        dataVenc:     t.dataVenc.toISOString(),
        dataPagamento: t.dataPagamento?.toISOString() ?? null,
        status:       t.status !== 'RECEBIDO' && new Date(t.dataVenc) < hoje
                        ? 'VENCIDO'
                        : t.status,
      }))}
      totalAReceber={totalAReceber}
      valorRecebido={valorRecebido}
      vencidas={vencidas}
      vencendoHoje={vencendoHoje}
      vencendoMes={vencendoMes}
    />
  )
}
