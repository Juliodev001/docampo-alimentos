import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const de = searchParams.get('de')
  const ate = searchParams.get('ate')
  const dateFilter = {
    ...(de ? { gte: new Date(de) } : {}),
    ...(ate ? { lte: new Date(ate) } : {}),
  }

  if (tipo === 'contas-pagar') {
    const compras = await prisma.compra.findMany({
      where: { ...(de || ate ? { vencimento: dateFilter } : {}) },
      include: { fornecedor: true },
      orderBy: { vencimento: 'asc' },
    })
    return NextResponse.json(compras)
  }

  if (tipo === 'contas-receber') {
    const titulos = await prisma.tituloFinanceiro.findMany({
      where: { ...(de || ate ? { dataVenc: dateFilter } : {}) },
      include: { cliente: true },
      orderBy: { dataVenc: 'asc' },
    })
    return NextResponse.json(titulos)
  }

  if (tipo === 'dre') {
    const [nfes, compras] = await Promise.all([
      prisma.notaFiscal.findMany({
        where: { status: 'AUTORIZADA', ...(de || ate ? { dataEmissao: dateFilter } : {}) },
      }),
      prisma.compra.findMany({
        where: { ...(de || ate ? { data: dateFilter } : {}) },
      }),
    ])
    const receita = nfes.reduce((s, n) => s + Number(n.totalValor), 0)
    const despesa = compras.reduce((s, c) => s + Number(c.totalValor), 0)
    return NextResponse.json({ receita, despesa, resultado: receita - despesa, nfes: nfes.length, compras: compras.length })
  }

  if (tipo === 'vendas-nfe') {
    const nfes = await prisma.notaFiscal.findMany({
      where: { status: 'AUTORIZADA', ...(de || ate ? { dataEmissao: dateFilter } : {}) },
      include: { cliente: true, itens: true },
      orderBy: { dataEmissao: 'desc' },
    })
    const total = nfes.reduce((s, n) => s + Number(n.totalValor), 0)
    const aReceber = nfes.filter(n => n.statusFinanceiro === 'A_RECEBER').reduce((s, n) => s + Number(n.totalValor), 0)
    const recebido = nfes.filter(n => n.statusFinanceiro === 'RECEBIDO').reduce((s, n) => s + Number(n.totalValor), 0)
    return NextResponse.json({ nfes, total, aReceber, recebido })
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}
