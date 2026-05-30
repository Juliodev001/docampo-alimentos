import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { nome, tipo, cnpjCpf, inscricaoEstadual, telefone, email, ativo } = await req.json()

  const fornecedor = await prisma.fornecedor.update({
    where: { id },
    data: {
      nome: nome?.trim() ?? undefined,
      tipo: tipo ?? undefined,
      cnpjCpf: cnpjCpf || null,
      inscricaoEstadual: inscricaoEstadual || null,
      telefone: telefone || null,
      email: email || null,
      ativo: ativo ?? undefined,
    },
    include: {
      _count: { select: { compras: true, nfes: true } },
      enderecos: true,
      contatos: true,
    },
  })
  return NextResponse.json(fornecedor)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.fornecedor.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Fornecedor possui compras ou NF-e vinculadas' }, { status: 409 })
  }
}
