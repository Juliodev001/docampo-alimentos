import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const titulo = await prisma.tituloFinanceiro.update({
    where: { id },
    data: {
      status: body.status,
      dataPagamento: body.status === 'RECEBIDO' ? new Date() : null,
    },
    include: { cliente: true },
  })

  /**
   * Título de carteira e pedido são a mesma dívida vista de dois lugares. Dar
   * baixa aqui tem que fechar o pedido — senão Avisos continua cobrando um
   * fiado já recebido. O contrário vale igual: reabrir o título reabre a
   * cobrança.
   */
  if (titulo.pedidoId) {
    const recebido = titulo.status === 'RECEBIDO'
    await prisma.pedido.updateMany({
      // Pedido cancelado fica como está: dar baixa não ressuscita venda desfeita.
      where: { id: titulo.pedidoId, status: recebido ? { notIn: ['PAGO', 'CANCELADO'] } : 'PAGO' },
      data:  { status: recebido ? 'PAGO' : 'ENTREGUE' },
    })
  }

  return NextResponse.json(titulo)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.tituloFinanceiro.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
