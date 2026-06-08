import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

function getMonthsInRange(inicio: Date, fim: Date) {
  const months: { key: string; label: string }[] = []
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const end = new Date(fim.getFullYear(), fim.getMonth(), 1)
  while (cur <= end) {
    months.push({
      key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
      label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    })
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

function getPeriodRange(periodo: string): { inicio: Date; fim: Date } {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  switch (periodo) {
    case 'mes_passado':
      return { inicio: new Date(ano, mes - 1, 1), fim: new Date(ano, mes, 0, 23, 59, 59) }
    case 'ultimos_3_meses':
      return { inicio: new Date(ano, mes - 2, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59) }
    case 'ultimos_6_meses':
      return { inicio: new Date(ano, mes - 5, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59) }
    case 'ano_atual':
      return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59) }
    case 'ano_passado':
      return { inicio: new Date(ano - 1, 0, 1), fim: new Date(ano - 1, 11, 31, 23, 59, 59) }
    default:
      return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59) }
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const periodo = req.nextUrl.searchParams.get('periodo') ?? 'mes_atual'
  const { inicio, fim } = getPeriodRange(periodo)

  const [colheitas, saidas] = await Promise.all([
    prisma.colheitaDiaria.findMany({
      where: { data: { gte: inicio, lte: fim } },
      select: {
        data: true,
        produtoId: true,
        produtorId: true,
        quantidadeTotal: true,
        quantidadeDono: true,
        quantidadeParceiro: true,
        produto: { select: { nome: true } },
        produtor: { select: { nome: true } },
      },
    }),
    prisma.saidaLavoura.findMany({
      where: { data: { gte: inicio, lte: fim } },
      select: { data: true, totalValor: true, quantidade: true },
    }),
  ])

  const totalColhido = colheitas.reduce((s, c) => s + c.quantidadeTotal, 0)
  const totalDono = colheitas.reduce((s, c) => s + c.quantidadeDono, 0)
  const totalParceiro = colheitas.reduce((s, c) => s + c.quantidadeParceiro, 0)
  const totalReceita = saidas.reduce((s, c) => s + Number(c.totalValor), 0)
  const totalVendido = saidas.reduce((s, c) => s + c.quantidade, 0)

  const porProdutoMap: Record<string, { nome: string; total: number }> = {}
  colheitas.forEach(c => {
    if (!porProdutoMap[c.produtoId]) porProdutoMap[c.produtoId] = { nome: c.produto.nome, total: 0 }
    porProdutoMap[c.produtoId].total += c.quantidadeTotal
  })

  const months = getMonthsInRange(inicio, fim)
  const monthlyMap: Record<string, { colhido: number; vendido: number }> = {}
  months.forEach(m => { monthlyMap[m.key] = { colhido: 0, vendido: 0 } })

  colheitas.forEach(c => {
    const d = new Date(c.data)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) monthlyMap[key].colhido += c.quantidadeTotal
  })
  saidas.forEach(s => {
    const d = new Date(s.data)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyMap[key]) monthlyMap[key].vendido += s.quantidade
  })

  const porMes = months.map(m => ({
    label: m.label,
    colhido: monthlyMap[m.key].colhido,
    vendido: monthlyMap[m.key].vendido,
  }))

  const porProdutorMap: Record<string, { id: string; nome: string; colhido: number; dono: number; parceiro: number }> = {}
  colheitas.forEach(c => {
    if (!c.produtorId || !c.produtor) return
    if (!porProdutorMap[c.produtorId]) {
      porProdutorMap[c.produtorId] = { id: c.produtorId, nome: c.produtor.nome, colhido: 0, dono: 0, parceiro: 0 }
    }
    porProdutorMap[c.produtorId].colhido += c.quantidadeTotal
    porProdutorMap[c.produtorId].dono += c.quantidadeDono
    porProdutorMap[c.produtorId].parceiro += c.quantidadeParceiro
  })

  return NextResponse.json({
    stats: { totalColhido, totalDono, totalParceiro, totalReceita, totalVendido },
    porProduto: Object.values(porProdutoMap).sort((a, b) => b.total - a.total),
    porMes,
    porProdutor: Object.values(porProdutorMap).sort((a, b) => b.colhido - a.colhido),
  })
}
