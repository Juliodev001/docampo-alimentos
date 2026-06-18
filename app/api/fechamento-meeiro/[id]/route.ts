import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const fechamento = await prisma.fechamentoMeeiro.findUnique({
    where: { id },
    include: { parceiro: { include: { produtor: true } }, vales: true },
  })
  if (!fechamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(s(fechamento))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const fechamento = await prisma.fechamentoMeeiro.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.dataPagamento && { dataPagamento: new Date(body.dataPagamento) }),
      ...(body.observacao !== undefined && { observacao: body.observacao?.trim() || null }),
    },
    include: { parceiro: true },
  })
  return NextResponse.json(s(fechamento))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.$transaction([
    prisma.vale.updateMany({
      where: { fechamentoMeeiroId: id },
      data: { status: 'ABERTO', fechamentoMeeiroId: null },
    }),
    prisma.fechamentoMeeiro.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
