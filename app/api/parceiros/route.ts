import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'

// Ver comentário em `parceiros/[id]/route.ts`: o cache de `/api/produtores`
// carrega os meeiros junto e precisa cair quando a lista muda.
const KEY_PRODUTORES = 'produtores'

// GET /api/parceiros — list all parceiros (meeiros) across all produtores
export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parceiros = await prisma.parceiro.findMany({
    include: { produtor: { select: { id: true, nome: true, codigo: true } } },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json(parceiros)
}

// POST /api/parceiros — create a standalone meeiro (linked to a produtor)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    produtorId?: string
    nome?: string
    nomeFantasia?: string
    cpf?: string
    chavePix?: string
    percentual?: number
    valorEmba?: number
    endereco?: string
    telefone?: string
    codigo?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido.' }, { status: 400 }) }

  const { nome, nomeFantasia, cpf, chavePix, percentual, valorEmba, endereco, telefone } = body
  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  if (!body.produtorId) return NextResponse.json({ error: 'Produtor é obrigatório.' }, { status: 400 })

  // Auto-generate código M001...
  let codigo = body.codigo?.trim() || null
  if (!codigo) {
    const count = await prisma.parceiro.count()
    codigo = `M${String(count + 1).padStart(3, '0')}`
    let suffix = count + 1
    while (await prisma.parceiro.findUnique({ where: { codigo } })) {
      suffix++
      codigo = `M${String(suffix).padStart(3, '0')}`
    }
  } else {
    const existing = await prisma.parceiro.findUnique({ where: { codigo } })
    if (existing) return NextResponse.json({ error: 'Código já cadastrado.' }, { status: 400 })
  }

  try {
    const parceiro = await prisma.parceiro.create({
      data: {
        codigo,
        produtorId: body.produtorId,
        nome,
        nomeFantasia: nomeFantasia || null,
        cpf: cpf || null,
        chavePix: chavePix || null,
        percentual: percentual ?? 0,
        valorEmba: valorEmba ?? 0,
        endereco: endereco || null,
        telefone: telefone || null,
      },
      include: { produtor: { select: { id: true, nome: true, codigo: true } } },
    })
    memCache.invalidate(KEY_PRODUTORES)
    return NextResponse.json(parceiro, { status: 201 })
  } catch (e) {
    console.error('Erro ao criar meeiro:', e)
    return NextResponse.json({ error: 'Erro interno ao salvar.' }, { status: 500 })
  }
}
