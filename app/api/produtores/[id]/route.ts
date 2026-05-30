import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'

const KEY = 'produtores'

type ParceiroInput = { nome: string; cpf?: string; percentual: number }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const produtor = await prisma.produtor.findUnique({
    where: { id },
    include: { parceiros: { orderBy: { createdAt: 'asc' } } },
  })
  if (!produtor) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  return NextResponse.json(produtor)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as {
    codigo?: string; nome: string; tipo?: string
    cpf?: string; cnpj?: string; inscricaoEstadual?: string
    telefone?: string; endereco?: string; parceiros?: ParceiroInput[]
  }

  const { nome, tipo, cpf, cnpj, inscricaoEstadual, telefone, endereco, parceiros } = body
  const lista = parceiros ?? []
  if (lista.reduce((s: number, p: ParceiroInput) => s + p.percentual, 0) > 100)
    return NextResponse.json({ error: 'Soma das porcentagens não pode ultrapassar 100%.' }, { status: 400 })

  const existing = await prisma.produtor.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Produtor não encontrado.' }, { status: 404 })

  if (cpf && cpf !== existing.cpf) {
    const conflict = await prisma.produtor.findUnique({ where: { cpf } })
    if (conflict) return NextResponse.json({ error: 'CPF já cadastrado por outro produtor.' }, { status: 400 })
  }

  if (body.codigo && body.codigo !== existing.codigo) {
    const conflict = await prisma.produtor.findUnique({ where: { codigo: body.codigo } })
    if (conflict) return NextResponse.json({ error: 'Código já utilizado por outro produtor.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    codigo:           body.codigo || existing.codigo,
    nome,
    tipo:             tipo || 'FISICA',
    cpf:              cpf || null,
    cnpj:             cnpj || null,
    inscricaoEstadual:inscricaoEstadual || null,
    telefone:         telefone || null,
    endereco:         endereco || null,
    parceiros: {
      deleteMany: {},
      create: lista.map((p: ParceiroInput) => ({ nome: p.nome, percentual: p.percentual, cpf: p.cpf || null })),
    },
  }

  try {
    const produtor = await prisma.produtor.update({ where: { id }, data, include: { parceiros: true } })
    memCache.invalidate(KEY)
    return NextResponse.json(produtor)
  } catch (e) {
    console.error('Erro ao atualizar produtor:', e)
    return NextResponse.json({ error: 'Erro interno ao salvar. Verifique os dados.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await prisma.colheitaDiaria.updateMany({ where: { produtorId: id }, data: { produtorId: null } })
    await prisma.fechamentoPagamento.deleteMany({ where: { produtorId: id } })
    await prisma.produtor.delete({ where: { id } })
    memCache.invalidate(KEY)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Erro ao excluir produtor:', e)
    return NextResponse.json({ error: 'Erro ao excluir produtor.' }, { status: 500 })
  }
}
