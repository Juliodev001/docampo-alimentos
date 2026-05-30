import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: rocaId } = await params
  const { data, tipo, descricao, custo } = await req.json()
  if (!data || !tipo || !descricao) {
    return NextResponse.json({ error: 'Data, tipo e descrição são obrigatórios' }, { status: 400 })
  }
  const registro = await prisma.registroRoca.create({
    data: {
      rocaId,
      data: new Date(data),
      tipo,
      descricao,
      custo: custo ? parseFloat(custo) : 0,
    },
  })
  return NextResponse.json(registro, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { registroId } = await req.json()
  await prisma.registroRoca.delete({ where: { id: registroId } })
  return NextResponse.json({ ok: true })
}
