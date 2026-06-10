import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'DONO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await props.params
  const body = await req.json()
  const user = await prisma.user.update({
    where: { id },
    data: { ativo: body.ativo, role: body.role },
    select: { id: true, name: true, email: true, role: true, ativo: true },
  })
  return NextResponse.json(user)
}
