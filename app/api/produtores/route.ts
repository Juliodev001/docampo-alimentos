import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'

const KEY = 'produtores'

type ParceiroInput = { nome: string; cpf?: string; percentual: number }

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const produtores = await memCache.fetch(
    KEY,
    () => prisma.produtor.findMany({ include: { parceiros: true }, orderBy: { nome: 'asc' } }),
    60_000
  )
  return NextResponse.json(produtores)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    codigo?: string; nome?: string; tipo?: string
    cpf?: string; cnpj?: string; inscricaoEstadual?: string
    telefone?: string; endereco?: string; parceiros?: ParceiroInput[]
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido.' }, { status: 400 }) }

  const { nome, tipo, cpf, cnpj, inscricaoEstadual, telefone, endereco, parceiros } = body
  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  const lista = parceiros ?? []
  const invalido = lista.some((p) => typeof p.percentual !== 'number' || !isFinite(p.percentual) || p.percentual < 0)
  if (invalido) return NextResponse.json({ error: 'Percentual inválido.' }, { status: 400 })
  if (lista.reduce((s, p) => s + p.percentual, 0) > 100)
    return NextResponse.json({ error: 'Soma das porcentagens não pode ultrapassar 100%.' }, { status: 400 })

  if (cpf) {
    const existing = await prisma.produtor.findUnique({ where: { cpf } })
    if (existing) return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 400 })
  }

  // Auto-generate código if not provided
  let codigo = body.codigo?.trim() || null
  if (!codigo) {
    const count = await prisma.produtor.count()
    codigo = `P${String(count + 1).padStart(3, '0')}`
    // Ensure uniqueness in edge cases
    let suffix = count + 1
    while (await prisma.produtor.findUnique({ where: { codigo } })) {
      suffix++
      codigo = `P${String(suffix).padStart(3, '0')}`
    }
  } else {
    const existing = await prisma.produtor.findUnique({ where: { codigo } })
    if (existing) return NextResponse.json({ error: 'Código já cadastrado.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    codigo,
    nome,
    tipo: tipo || 'FISICA',
    cpf: cpf || null,
    cnpj: cnpj || null,
    inscricaoEstadual: inscricaoEstadual || null,
    telefone: telefone || null,
    endereco: endereco || null,
    parceiros: {
      create: lista.map((p) => ({ nome: p.nome, percentual: p.percentual, cpf: p.cpf || null })),
    },
  }

  try {
    const produtor = await prisma.produtor.create({ data, include: { parceiros: true } })
    memCache.invalidate(KEY)
    return NextResponse.json(produtor, { status: 201 })
  } catch (e) {
    console.error('Erro ao criar produtor:', e)
    return NextResponse.json({ error: 'Erro interno ao salvar. Verifique os dados.' }, { status: 500 })
  }
}
