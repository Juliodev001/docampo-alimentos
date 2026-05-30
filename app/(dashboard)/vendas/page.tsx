import { prisma } from '@/lib/prisma'
import VendasClient from './vendas-client'

export default async function VendasPage() {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [nfes, romaneios] = await Promise.all([
    prisma.notaFiscal.findMany({
      include: { cliente: true, itens: true },
      orderBy: { dataEmissao: 'desc' },
    }),
    prisma.romaneio.findMany({
      include: { cliente: true, itens: true },
      where: { status: 'EMITIDO' },
      orderBy: { data: 'desc' },
    }),
  ])

  const receitaNfe = nfes
    .filter((n) => n.status === 'AUTORIZADA')
    .reduce((s, n) => s + n.totalValor, 0)
  const aReceberNfe = nfes
    .filter((n) => n.status === 'AUTORIZADA' && n.statusFinanceiro === 'A_RECEBER')
    .reduce((s, n) => s + n.totalValor, 0)
  const recebidoNfe = nfes
    .filter((n) => n.status === 'AUTORIZADA' && n.statusFinanceiro === 'RECEBIDO')
    .reduce((s, n) => s + n.totalValor, 0)

  const receitaRomaneios = romaneios.reduce((s, r) => s + r.totalValor, 0)
  const receitaMes = [
    ...nfes.filter((n) => n.status === 'AUTORIZADA' && new Date(n.dataEmissao) >= inicioMes),
    ...romaneios.filter((r) => new Date(r.data) >= inicioMes),
  ].reduce((s, v) => s + v.totalValor, 0)

  return (
    <VendasClient
      nfes={nfes.map((n) => ({
        id: n.id,
        dataEmissao: n.dataEmissao.toISOString(),
        numero: n.numero,
        totalValor: n.totalValor,
        statusFinanceiro: n.statusFinanceiro,
        status: n.status,
        cliente: { nome: n.cliente.nome },
        itensCount: n.itens.length,
      }))}
      romaneios={romaneios.map((r) => ({
        id: r.id,
        numero: r.numero,
        data: r.data.toISOString(),
        totalValor: r.totalValor,
        status: r.status,
        cliente: { nome: r.cliente.nome },
        itensCount: r.itens.length,
      }))}
      stats={{
        receitaNfe,
        aReceberNfe,
        recebidoNfe,
        receitaRomaneios,
        receitaMes,
        totalNfes: nfes.filter((n) => n.status === 'AUTORIZADA').length,
        totalRomaneios: romaneios.length,
      }}
    />
  )
}
