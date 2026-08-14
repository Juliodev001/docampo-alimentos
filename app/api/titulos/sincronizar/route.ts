import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sincronizarTituloDoPedido, ehCarteira } from '@/lib/titulo-pedido'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const nfes = await prisma.notaFiscal.findMany({
    where: { status: 'AUTORIZADA', statusFinanceiro: 'A_RECEBER' },
    include: { cliente: true },
  })

  const existentes = await prisma.tituloFinanceiro.findMany({
    where: { nfeId: { not: null } },
    select: { nfeId: true },
  })
  const nfeIdsCadastrados = new Set(existentes.map(t => t.nfeId))

  const novas = nfes.filter(n => !nfeIdsCadastrados.has(n.id))

  if (novas.length > 0) {
    await prisma.tituloFinanceiro.createMany({
      data: novas.map(n => ({
        clienteId: n.clienteId,
        descricao: `NF-e ${n.numero ?? n.id.slice(0, 8)} — ${n.cliente.nome}`,
        valor: n.totalValor,
        dataEmissao: n.dataEmissao,
        dataVenc: n.dataVencimento ?? n.dataEmissao,
        origem: 'NFE' as const,
        nfeId: n.id,
      })),
    })
  }

  /**
   * Vendas na carteira anteriores a este vínculo nunca chegaram em Contas a
   * Receber. A sincronização traz todas de uma vez e continua servindo depois:
   * como cada pedido passa pelo mesmo caminho da criação e da edição, rodar de
   * novo só conserta o que estiver fora do lugar — não duplica.
   */
  const pedidos = await prisma.pedido.findMany({
    where: {
      clienteId: { not: null },
      status: { not: 'CANCELADO' },
      formaPagamento: { not: null },
    },
    select: {
      id: true, numero: true, clienteId: true, formaPagamento: true,
      status: true, totalValor: true, data: true, dataCobranca: true,
    },
  })

  const carteira = pedidos.filter(p => ehCarteira(p.formaPagamento))

  for (const p of carteira) {
    await sincronizarTituloDoPedido({ ...p, totalValor: String(p.totalValor) })
  }

  return NextResponse.json({ criados: novas.length, carteira: carteira.length })
}
