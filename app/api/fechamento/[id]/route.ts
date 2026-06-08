import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const fechamento = await prisma.fechamentoPagamento.findUnique({
    where: { id },
    include: { produtor: { include: { parceiros: true } } },
  })
  if (!fechamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const colheitas = await prisma.colheitaDiaria.findMany({
    where: {
      produtorId: fechamento.produtorId,
      data: { gte: fechamento.dataInicio, lte: fechamento.dataFim },
    },
    include: { produto: true },
    orderBy: { data: 'asc' },
  })

  return NextResponse.json(s({ ...fechamento, colheitas }))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const fechamento = await prisma.fechamentoPagamento.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.dataPagamento && { dataPagamento: new Date(body.dataPagamento) }),
      ...(body.combustivel !== undefined && { combustivel: body.combustivel }),
      ...(body.bandejaEmbalagem !== undefined && { bandejaEmbalagem: body.bandejaEmbalagem }),
      ...(body.valesDinheiro !== undefined && { valesDinheiro: body.valesDinheiro }),
      ...(body.creditos !== undefined && { creditos: body.creditos }),
      ...(body.debitosAnteriores !== undefined && { debitosAnteriores: body.debitosAnteriores }),
    },
    include: { produtor: true },
  })
  return NextResponse.json(s(fechamento))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.fechamentoPagamento.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
