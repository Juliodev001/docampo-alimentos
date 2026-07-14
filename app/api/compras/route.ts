import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const de = searchParams.get('de')
  const ate = searchParams.get('ate')
  const categoria = searchParams.get('categoria')
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  const cacheKey = `compras:${de}:${ate}:${categoria}:${status}:${q}`
  const compras = await memCache.fetch(
    cacheKey,
    () => prisma.compra.findMany({
      where: {
        ...(de && { data: { gte: new Date(de) } }),
        ...(ate && { data: { lte: new Date(ate) } }),
        ...(categoria && categoria !== 'TODOS' && { categoria: categoria as never }),
        ...(status && status !== 'TODOS' && { status: status as never }),
        ...(q && {
          OR: [
            { fornecedor: { nome: { contains: q, mode: 'insensitive' } } },
            { observacao: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      include: { fornecedor: true, itens: true, centroCusto: true },
      orderBy: { data: 'desc' },
    }),
    30_000
  )
  return NextResponse.json(compras)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    fornecedorId: fornIdRaw,
    descricao,          // simplified form field
    valor,              // simplified form field
    data,
    categoria,
    centroCustoId,
    observacao,
    condicao,
    vencimento,
    formaPagamento,
    status,
    itens,
  } = body

  // Resolve fornecedor — simplified form doesn't require one
  let fornecedorId = fornIdRaw
  if (!fornecedorId) {
    const forn = await prisma.fornecedor.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!forn) return NextResponse.json({ error: 'Nenhum fornecedor cadastrado. Cadastre um fornecedor primeiro.' }, { status: 400 })
    fornecedorId = forn.id
  }

  // Build items — simplified form sends valor + descricao instead of itens array
  type RawItem = { produto: string; unidade: never; quantidade: number; valorUnit: number; total: number }
  const rawItens: RawItem[] = itens ?? [{
    produto:    descricao ?? 'Despesa',
    unidade:    'UNIDADE' as never,
    quantidade: 1,
    valorUnit:  valor ?? 0,
    total:      valor ?? 0,
  }]

  // Total sempre recalculado no servidor — nunca confiar no valor vindo do cliente
  const resolvedItens: RawItem[] = rawItens.map(i => ({
    ...i,
    total: (Number(i.quantidade) || 0) * (Number(i.valorUnit) || 0),
  }))

  const totalValor = resolvedItens.reduce((s: number, i: RawItem) => s + i.total, 0)

  const compra = await prisma.compra.create({
    data: {
      fornecedorId,
      data:           new Date(data),
      categoria:      (categoria ?? 'OUTROS') as never,
      centroCustoId:  centroCustoId || null,
      observacao:     observacao || descricao || null,
      condicao:       (condicao       ?? 'A_VISTA')  as never,
      vencimento:     new Date(vencimento ?? data),
      formaPagamento: (formaPagamento ?? 'PIX')       as never,
      status:         (status         ?? 'A_PAGAR')   as never,
      totalValor,
      itens: {
        create: resolvedItens.map(i => ({
          produto:    i.produto,
          unidade:    i.unidade,
          quantidade: i.quantidade,
          valorUnit:  i.valorUnit,
          total:      i.total,
        })),
      },
    },
    include: { fornecedor: true, itens: true },
  })

  revalidateTag('compras', 'max')
  memCache.invalidate('compras')
  return NextResponse.json(compra, { status: 201 })
}
