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

  const vendaWhere = {
    tipo: 'VENDA',
    ...(dateFilter ? { data: dateFilter } : {}),
  }

  const saidaLavourWhere = {
    ...(dateFilter ? { data: dateFilter } : {}),
  }

  const [comprasMesArr, nfesMesArr, pdvMesArr, vendaMesArr, totalPagoAll, totalRecebidoAll, saidaLavouraAgg, fechamentosProdutor, fechamentosMeeiro] = await Promise.all([
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
    prisma.pedido.findMany({
      where: vendaWhere,
      select: { totalValor: true, status: true },
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
    prisma.fechamentoPagamento.findMany({
      select: {
        id: true, produtorId: true, dataInicio: true, dataFim: true, status: true,
        combustivel: true, bandejaEmbalagem: true, valesDinheiro: true, creditos: true, debitosAnteriores: true,
      },
    }),
    prisma.fechamentoMeeiro.findMany({
      select: { id: true, valorPago: true, status: true },
    }),
  ])

  const VENDA_CONFIRMADOS = ['CONFIRMADO', 'ENTREGUE', 'PAGO']

  /* ── COMPETÊNCIA ── */
  const comprasMesTotal  = comprasMesArr.reduce((s, c) => s + Number(c.totalValor), 0)
  const pdvMesTotal      = pdvMesArr.reduce((s, p) => s + Number(p.totalValor), 0)
  const vendaMesConfirmados = vendaMesArr.filter(p => VENDA_CONFIRMADOS.includes(p.status as string))
  const vendaMesTotal    = vendaMesConfirmados.reduce((s, p) => s + Number(p.totalValor), 0)
  const vendasMesTotal   = nfesMesArr.reduce((s, n) => s + Number(n.totalValor), 0) + pdvMesTotal + vendaMesTotal
  const vendaLavouraTotal = Number(saidaLavouraAgg._sum.totalValor ?? 0)

  /* ── CAIXA ── */
  const comprasPaga     = comprasMesArr.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.totalValor), 0)
  const pdvRecebido     = pdvMesArr.filter(p => p.formaPagamento !== 'FIADO' || p.status === 'PAGO').reduce((s, p) => s + Number(p.totalValor), 0)
  const vendaRecebida   = vendaMesConfirmados.reduce((s, p) => s + Number(p.totalValor), 0)
  const vendasRecebida  = nfesMesArr.filter(n => n.statusFinanceiro === 'RECEBIDO').reduce((s, n) => s + Number(n.totalValor), 0) + pdvRecebido + vendaRecebida
  const carteiraPendente = pdvMesArr.filter(p => p.formaPagamento === 'FIADO' && p.status !== 'PAGO' && p.status !== 'CANCELADO').reduce((s, p) => s + Number(p.totalValor), 0)

  /* ── TOTAIS (all-time) ── */
  const totalPago     = totalPagoAll._sum.totalValor    ?? 0
  const totalRecebido = totalRecebidoAll._sum.totalValor ?? 0

  /* ── LAVOURA: a pagar / pago a produtores e meeiros ── */
  const produtorIds = Array.from(new Set(fechamentosProdutor.map(f => f.produtorId)))
  const colheitasLavoura = produtorIds.length > 0
    ? await prisma.colheitaDiaria.findMany({
        where: { produtorId: { in: produtorIds } },
        select: { produtorId: true, data: true, quantidadeTotal: true, descarte: true, preco: true, parceiroId: true, percParceiro: true },
      })
    : []

  let aPagarProdutor = 0
  let pagoProdutor = 0
  for (const f of fechamentosProdutor) {
    const cx = colheitasLavoura.filter(c =>
      c.produtorId === f.produtorId && c.data >= f.dataInicio && c.data <= f.dataFim,
    )
    const totalBruto = cx.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * Number(c.preco), 0)
    const meeiroBruto = cx.reduce((s, c) => {
      if (!c.parceiroId) return s
      return s + (c.quantidadeTotal - c.descarte) * Number(c.preco) * (c.percParceiro / 100)
    }, 0)
    const donoBruto = totalBruto - meeiroBruto
    const totalDed = Number(f.combustivel) + Number(f.bandejaEmbalagem) + Number(f.valesDinheiro) + Number(f.creditos) + Number(f.debitosAnteriores)
    const fracao = totalBruto > 0 ? donoBruto / totalBruto : 0
    const aReceberProdutor = donoBruto - totalDed * fracao
    if (f.status === 'PAGO') pagoProdutor += aReceberProdutor
    else aPagarProdutor += aReceberProdutor
  }

  let aPagarMeeiro = 0
  let pagoMeeiro = 0
  for (const f of fechamentosMeeiro) {
    if (f.status === 'PAGO') pagoMeeiro += Number(f.valorPago)
    else aPagarMeeiro += Number(f.valorPago)
  }

  const lavoura = {
    aPagar: aPagarProdutor + aPagarMeeiro,
    pago: pagoProdutor + pagoMeeiro,
  }

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
    caixa:       { comprasPaga, vendasRecebida, carteiraPendente },
    totais:      { totalPago, totalRecebido },
    lavoura,
    dre:         { vendas: dreVendasTotal, compras: comprasMesTotal, fornecedores },
  })
}
