import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(clientes)
}
