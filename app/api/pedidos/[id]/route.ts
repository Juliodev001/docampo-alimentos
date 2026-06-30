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

  if (body.itens) {
    if (!body.itens.length) return NextResponse.json({ error: 'O pedido precisa ter ao menos um item.' }, { status: 400 })
    const frete = Number(body.frete) || 0
    const outrasTaxas = Number(body.outrasTaxas) || 0
    const subtotal = body.itens.reduce((s: number, it: { total: number }) => s + Number(it.total), 0)
    const pedido = await prisma.$transaction(async tx => {
      await tx.itemPedido.deleteMany({ where: { pedidoId: id } })
      return tx.pedido.update({
        where: { id },
        data: {
          frete, outrasTaxas,
          totalValor: subtotal + frete + outrasTaxas,
          itens: {
            create: body.itens.map((it: { produto: string; unidade: string; quantidade: number; valorUnit: number; desconto: number; total: number }) => ({
              produto:    it.produto,
              unidade:    (it.unidade ?? 'CAIXA') as never,
              quantidade: it.quantidade,
              valorUnit:  it.valorUnit,
              desconto:   it.desconto ?? 0,
              total:      it.total,
            })),
          },
        },
        include: { cliente: true, transportadora: true, itens: true },
      })
    })
    return NextResponse.json(pedido)
  }

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
