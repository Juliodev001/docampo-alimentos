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
    include: { produtor: { include: { parceiros: true } }, vales: true },
  })
  if (!fechamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const colheitas = await prisma.colheitaDiaria.findMany({
    where: {
      produtorId: fechamento.produtorId,
      data: { gte: fechamento.dataInicio, lte: fechamento.dataFim },
    },
    include: { produto: true, roca: { select: { nome: true } } },
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
      ...(body.dataInicio && { dataInicio: new Date(body.dataInicio) }),
      ...(body.dataFim && { dataFim: new Date(body.dataFim) }),
      ...(body.dataPagamento && { dataPagamento: new Date(body.dataPagamento) }),
      ...(body.valorBruto !== undefined && { valorBruto: body.valorBruto !== '' ? body.valorBruto : null }),
      ...(body.valorPago !== undefined && { valorPago: body.valorPago !== '' ? body.valorPago : null }),
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
  await prisma.$transaction([
    prisma.vale.updateMany({
      where: { fechamentoId: id },
      data: { status: 'ABERTO', fechamentoId: null },
    }),
    prisma.fechamentoPagamento.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
