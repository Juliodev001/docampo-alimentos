import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

export async function GET(req: NextRequest, { params }: { params: Promise<{ clienteId: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clienteId } = await params
  const dataParam       = req.nextUrl.searchParams.get('data')
  const dataInicioParam = req.nextUrl.searchParams.get('dataInicio')
  const dataFimParam    = req.nextUrl.searchParams.get('dataFim')

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { enderecos: true },
  })
  if (!cliente) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let dateFilter: object = {}
  if (dataInicioParam && dataFimParam) {
    dateFilter = { data: { gte: new Date(dataInicioParam + 'T00:00:00'), lte: new Date(dataFimParam + 'T23:59:59') } }
  } else if (dataParam) {
    dateFilter = { data: { gte: new Date(dataParam + 'T00:00:00.000Z'), lte: new Date(dataParam + 'T23:59:59.999Z') } }
  }

  const pedidos = await prisma.pedido.findMany({
    where: {
      clienteId,
      tipo: { in: ['VENDA', 'PDV'] },
      status: { not: 'CANCELADO' },
      ...dateFilter,
    },
    include: { itens: true },
    orderBy: { data: 'asc' },
  })

  return NextResponse.json({
    cliente: s(cliente),
    pedidos: pedidos.map(p => ({ ...s(p), itens: p.itens.map(it => s(it)) })),
    usuario: session.name ?? 'Administrador',
    emitidoEm: new Date().toISOString(),
  })
}
