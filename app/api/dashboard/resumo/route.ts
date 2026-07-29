import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Periodo = 'dia' | 'semana' | 'mes' | 'ano'

// O "dia" do negócio é o dia de CALENDÁRIO escolhido (o cliente resolve no fuso
// do Brasil e manda AAAA-MM-DD). Aqui tudo é ancorado em UTC — não no fuso do
// servidor (o VPS roda em UTC) — para o corte não escorregar. Cada registro é
// agrupado pela sua data UTC, que é exatamente o dia gravado: compra e colheita
// à meia-noite UTC, venda PDV ao meio-dia UTC, ambos caindo no mesmo dia.
function startOfDay(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) }
function endOfDay(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)) }

function mondayOf(d: Date) {
  const x = startOfDay(d)
  const diff = (x.getUTCDay() + 6) % 7 // 0 = segunda
  x.setUTCDate(x.getUTCDate() - diff)
  return x
}

// Interpreta o parâmetro `ref` (AAAA-MM-DD) como uma data de calendário, fixada
// ao meio-dia UTC — longe das bordas do dia, para não haver arredondamento.
function refParaData(refParam: string | null): Date {
  const ymd = (refParam ?? '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const d = new Date(`${ymd}T12:00:00.000Z`)
    if (!isNaN(d.getTime())) return d
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12))
}

function getRange(periodo: Periodo, ref: Date) {
  if (periodo === 'dia') {
    return { inicio: startOfDay(ref), fim: endOfDay(ref) }
  }
  if (periodo === 'semana') {
    const inicio = mondayOf(ref)
    const fim = new Date(inicio)
    fim.setUTCDate(fim.getUTCDate() + 6)
    return { inicio, fim: endOfDay(fim) }
  }
  if (periodo === 'mes') {
    const inicio = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1))
    const fim = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0, 23, 59, 59, 999))
    return { inicio, fim }
  }
  const inicio = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1))
  const fim = new Date(Date.UTC(ref.getUTCFullYear(), 11, 31, 23, 59, 59, 999))
  return { inicio, fim }
}

function getPeriodoAnterior(periodo: Periodo, ref: Date) {
  const anterior = new Date(ref)
  if (periodo === 'dia') anterior.setUTCDate(anterior.getUTCDate() - 1)
  else if (periodo === 'semana') anterior.setUTCDate(anterior.getUTCDate() - 7)
  else if (periodo === 'mes') anterior.setUTCMonth(anterior.getUTCMonth() - 1)
  else anterior.setUTCFullYear(anterior.getUTCFullYear() - 1)
  return anterior
}

const LABELS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const LABELS_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function bucketInfo(periodo: Periodo, range: { inicio: Date; fim: Date }) {
  if (periodo === 'dia') {
    return { n: 24, label: (i: number) => `${String(i).padStart(2, '0')}h`, index: (d: Date) => d.getUTCHours() }
  }
  if (periodo === 'semana') {
    return {
      n: 7,
      label: (i: number) => LABELS_SEMANA[i],
      index: (d: Date) => Math.round((startOfDay(d).getTime() - range.inicio.getTime()) / 86400000),
    }
  }
  if (periodo === 'mes') {
    const dias = new Date(Date.UTC(range.fim.getUTCFullYear(), range.fim.getUTCMonth() + 1, 0)).getUTCDate()
    return { n: dias, label: (i: number) => `${i + 1}`, index: (d: Date) => d.getUTCDate() - 1 }
  }
  return { n: 12, label: (i: number) => LABELS_MES[i], index: (d: Date) => d.getUTCMonth() }
}

async function somarPeriodo(periodo: Periodo, range: { inicio: Date; fim: Date }, rocaId: string | null) {
  const comprasWhere = { data: { gte: range.inicio, lte: range.fim }, ...(rocaId ? { centroCustoId: rocaId } : {}) }
  const nfesWhere = { dataEmissao: { gte: range.inicio, lte: range.fim } }
  const pdvWhere = { tipo: 'PDV', status: { not: 'CANCELADO' as never }, data: { gte: range.inicio, lte: range.fim } }
  const lavouraWhere = { data: { gte: range.inicio, lte: range.fim } }
  const colheitasWhere = { data: { gte: range.inicio, lte: range.fim } }

  const [compras, nfes, pdv, lavoura, colheitas] = await Promise.all([
    prisma.compra.findMany({ where: comprasWhere, select: { data: true, totalValor: true, status: true, fornecedor: { select: { nome: true } } } }),
    prisma.notaFiscal.findMany({ where: nfesWhere, select: { dataEmissao: true, totalValor: true } }),
    prisma.pedido.findMany({ where: pdvWhere, select: { data: true, totalValor: true, formaPagamento: true, status: true } }),
    prisma.saidaLavoura.findMany({ where: lavouraWhere, select: { data: true, totalValor: true } }),
    prisma.colheitaDiaria.findMany({
      where: colheitasWhere,
      select: {
        data: true, quantidadeTotal: true, descarte: true, preco: true,
        produto: { select: { nome: true } },
        produtor: { select: { nome: true } }, parceiro: { select: { nome: true } },
      },
    }),
  ])

  const totalCompras = compras.reduce((s, c) => s + Number(c.totalValor), 0)
  const totalNfe = nfes.reduce((s, n) => s + Number(n.totalValor), 0)
  const totalPdv = pdv.reduce((s, p) => s + Number(p.totalValor), 0)
  const totalLavoura = lavoura.reduce((s, l) => s + Number(l.totalValor), 0)
  const totalVendas = totalNfe + totalPdv + totalLavoura

  const caixasLavoura = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const totalCompraLavoura = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * Number(c.preco), 0)
  const totalComprasGeral = totalCompras + totalCompraLavoura

  const bi = bucketInfo(periodo, range)
  const series = Array.from({ length: bi.n }, (_, i) => ({ label: bi.label(i), vendas: 0, compras: 0, lucro: 0 }))

  for (const c of compras) {
    const i = bi.index(new Date(c.data))
    if (series[i]) series[i].compras += Number(c.totalValor)
  }
  for (const c of colheitas) {
    const i = bi.index(new Date(c.data))
    if (series[i]) series[i].compras += (c.quantidadeTotal - c.descarte) * Number(c.preco)
  }
  for (const n of nfes) {
    const i = bi.index(new Date(n.dataEmissao))
    if (series[i]) series[i].vendas += Number(n.totalValor)
  }
  for (const p of pdv) {
    const i = bi.index(new Date(p.data))
    if (series[i]) series[i].vendas += Number(p.totalValor)
  }
  for (const l of lavoura) {
    const i = bi.index(new Date(l.data))
    if (series[i]) series[i].vendas += Number(l.totalValor)
  }
  series.forEach(s => { s.lucro = s.vendas - s.compras })

  const fornMap: Record<string, number> = {}
  compras.forEach(c => { fornMap[c.fornecedor.nome] = (fornMap[c.fornecedor.nome] ?? 0) + Number(c.totalValor) })
  const fornecedores = Object.entries(fornMap).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)

  const meeiroMap: Record<string, number> = {}
  colheitas.forEach(c => {
    if (c.parceiro?.nome) {
      meeiroMap[c.parceiro.nome] = (meeiroMap[c.parceiro.nome] ?? 0) + (c.quantidadeTotal - c.descarte)
    }
  })
  const topMeeiros = Object.entries(meeiroMap)
    .map(([nome, caixas]) => ({ nome, caixas }))
    .sort((a, b) => b.caixas - a.caixas)

  const carteiraPendente = pdv.filter(p => p.formaPagamento === 'FIADO' && p.status !== 'PAGO' && p.status !== 'CANCELADO').reduce((s, p) => s + Number(p.totalValor), 0)

  const colheitasMorango = colheitas.filter(c => c.produto.nome.toLowerCase().includes('morango'))
  const caixasMorango = colheitasMorango.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const precoMedioMorango = caixasMorango > 0
    ? colheitasMorango.reduce((s, c) => s + Number(c.preco) * (c.quantidadeTotal - c.descarte), 0) / caixasMorango
    : 0

  return {
    totalVendas, totalCompras: totalComprasGeral, lucro: totalVendas - totalComprasGeral,
    canais: [
      { nome: 'Nota Fiscal', valor: totalNfe },
      { nome: 'PDV', valor: totalPdv },
      { nome: 'Lavoura', valor: totalLavoura },
    ],
    fornecedores,
    topMeeiros,
    series,
    nVendas: nfes.length + pdv.length,
    nCompras: compras.length + colheitas.length,
    carteiraPendente,
    caixasLavoura,
    precoMedioMorango,
    caixasMorango,
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const periodo = (req.nextUrl.searchParams.get('periodo') ?? 'mes') as Periodo
  const refParam = req.nextUrl.searchParams.get('ref')
  const rocaId = req.nextUrl.searchParams.get('rocaId') || null
  const ref = refParaData(refParam)

  const range = getRange(periodo, ref)
  const rangeAnterior = getRange(periodo, getPeriodoAnterior(periodo, ref))

  const [atual, anterior] = await Promise.all([
    somarPeriodo(periodo, range, rocaId),
    somarPeriodo(periodo, rangeAnterior, rocaId),
  ])

  const variacao = (a: number, b: number) => b !== 0 ? ((a - b) / Math.abs(b)) * 100 : (a > 0 ? 100 : 0)

  return NextResponse.json({
    periodo,
    range: { inicio: range.inicio.toISOString(), fim: range.fim.toISOString() },
    atual,
    comparacao: {
      vendas: variacao(atual.totalVendas, anterior.totalVendas),
      compras: variacao(atual.totalCompras, anterior.totalCompras),
      lucro: variacao(atual.lucro, anterior.lucro),
    },
  })
}
