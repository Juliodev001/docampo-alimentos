import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { nome, tipo, cnpjCpf, inscricaoEstadual, telefone, email } = await req.json()

  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      nome: nome?.trim() ?? undefined,
      tipo: tipo ?? undefined,
      cnpjCpf: cnpjCpf || null,
      inscricaoEstadual: inscricaoEstadual || null,
      telefone: telefone || null,
      email: email || null,
    },
    include: {
      _count: { select: { nfes: true, romaneios: true } },
      enderecos: true,
      contatos: true,
    },
  })
  return NextResponse.json(cliente)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.cliente.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Cliente possui NF-e ou romaneios vinculados' }, { status: 409 })
  }
}
