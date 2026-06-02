import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true, cnpjCpf: true, telefone: true } },
      itens: true,
    },
  })
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const pedido = await prisma.pedido.update({
    where: { id },
    data: { status: body.status, observacao: body.observacao },
    include: { cliente: true, transportadora: true, itens: true },
  })
  return NextResponse.json(pedido)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.pedido.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
