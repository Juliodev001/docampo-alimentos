import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mesParam = req.nextUrl.searchParams.get('mes') ?? ''
  const rocaId   = req.nextUrl.searchParams.get('rocaId') || null

  /* ── intervalo de datas ── */
  let dateFilter: { gte: Date; lte: Date } | undefined
  if (mesParam) {
    const [ano, m] = mesParam.split('-').map(Number)
    dateFilter = {
      gte: new Date(ano, m - 1, 1),
      lte: new Date(ano, m, 0, 23, 59, 59),
    }
  }

  const comprasWhere = {
    ...(dateFilter ? { data: dateFilter } : {}),
    ...(rocaId     ? { centroCustoId: rocaId } : {}),
  }

  const nfesWhere = {
    ...(dateFilter ? { dataEmissao: dateFilter } : {}),
  }

  const pdvWhere = {
    tipo: 'PDV',
    ...(dateFilter ? { data: dateFilter } : {}),
  }

  const saidaLavourWhere = {
    ...(dateFilter ? { data: dateFilter } : {}),
  }

  const [comprasMesArr, nfesMesArr, pdvMesArr, totalPagoAll, totalRecebidoAll, saidaLavouraAgg] = await Promise.all([
    prisma.compra.findMany({
      where: comprasWhere,
      select: {
        status: true,
        totalValor: true,
        fornecedor: { select: { nome: true } },
      },
    }),
    prisma.notaFiscal.findMany({
      where: nfesWhere,
      select: { statusFinanceiro: true, totalValor: true },
    }),
    prisma.pedido.findMany({
      where: pdvWhere,
      select: { totalValor: true, formaPagamento: true, status: true },
    }),
    prisma.compra.aggregate({
      where: { status: 'PAGO', ...(rocaId ? { centroCustoId: rocaId } : {}) },
      _sum: { totalValor: true },
    }),
    prisma.notaFiscal.aggregate({
      where: { statusFinanceiro: 'RECEBIDO' },
      _sum: { totalValor: true },
    }),
    prisma.saidaLavoura.aggregate({
      where: saidaLavourWhere,
      _sum: { totalValor: true },
    }),
  ])

  /* ── COMPETÊNCIA ── */
  const comprasMesTotal  = comprasMesArr.reduce((s, c) => s + Number(c.totalValor), 0)
  const pdvMesTotal      = pdvMesArr.reduce((s, p) => s + Number(p.totalValor), 0)
  const vendasMesTotal   = nfesMesArr.reduce((s, n) => s + Number(n.totalValor), 0) + pdvMesTotal
  const vendaLavouraTotal = Number(saidaLavouraAgg._sum.totalValor ?? 0)

  /* ── CAIXA ── */
  const comprasPaga     = comprasMesArr.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.totalValor), 0)
  const pdvRecebido     = pdvMesArr.filter(p => p.formaPagamento !== 'FIADO' || p.status === 'PAGO').reduce((s, p) => s + Number(p.totalValor), 0)
  const vendasRecebida  = nfesMesArr.filter(n => n.statusFinanceiro === 'RECEBIDO').reduce((s, n) => s + Number(n.totalValor), 0) + pdvRecebido

  /* ── TOTAIS (all-time) ── */
  const totalPago     = totalPagoAll._sum.totalValor    ?? 0
  const totalRecebido = totalRecebidoAll._sum.totalValor ?? 0

  /* ── DRE – agrupar por fornecedor ── */
  const fornMap: Record<string, number> = {}
  comprasMesArr.forEach(c => {
    fornMap[c.fornecedor.nome] = (fornMap[c.fornecedor.nome] ?? 0) + Number(c.totalValor)
  })
  const fornecedores = Object.entries(fornMap)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)

  const dreVendasTotal = vendasMesTotal + vendaLavouraTotal

  return NextResponse.json({
    competencia: { comprasMes: comprasMesTotal, vendasMes: vendasMesTotal, vendaLavoura: vendaLavouraTotal },
    caixa:       { comprasPaga, vendasRecebida },
    totais:      { totalPago, totalRecebido },
    dre:         { vendas: dreVendasTotal, compras: comprasMesTotal, fornecedores },
  })
}
