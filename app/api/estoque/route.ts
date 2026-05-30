import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const entradas = await prisma.entradaEstoque.findMany({
    include: { produto: true },
    orderBy: { data: 'desc' },
  })
  return NextResponse.json(entradas)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { produtoId, quantidade, valorUnit, data, observacao } = await req.json()
  if (!produtoId || !quantidade) {
    return NextResponse.json({ error: 'Produto e quantidade são obrigatórios' }, { status: 400 })
  }
  const vUnit = parseFloat(valorUnit) || 0
  const entrada = await prisma.entradaEstoque.create({
    data: {
      produtoId,
      quantidade: parseFloat(quantidade),
      valorUnit: vUnit,
      data: data ? new Date(data) : new Date(),
      observacao: observacao || null,
    },
    include: { produto: true },
  })
  // Atualiza precoVenda se ainda estiver zerado
  if (vUnit > 0) {
    await prisma.produto.updateMany({ where: { id: produtoId, precoVenda: 0 }, data: { precoVenda: vUnit } })
  }
  return NextResponse.json(entrada, { status: 201 })
}
