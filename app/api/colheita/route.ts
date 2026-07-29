import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'
import { s } from '@/lib/serialize'
import { sincronizarEstoqueDaColheita } from '@/lib/estoque-colheita'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const produtoId = searchParams.get('produtoId')
  const produtorId = searchParams.get('produtorId')
  const inicio = searchParams.get('inicio')
  const fim = searchParams.get('fim')

  const cacheKey = `colheita:${produtoId}:${produtorId}:${inicio}:${fim}`
  const colheitas = await memCache.fetch(
    cacheKey,
    () => prisma.colheitaDiaria.findMany({
      where: {
        ...(produtoId && { produtoId }),
        ...(produtorId && { produtorId }),
        ...(inicio && fim && { data: { gte: new Date(inicio), lte: new Date(fim) } }),
      },
      include: {
        produto: true,
        roca: { select: { id: true, nome: true, codigo: true } },
        produtor: { include: { parceiros: true } },
        parceiro: { select: { id: true, nome: true, percentual: true, valorEmba: true } },
        responsavel: { select: { id: true, name: true, role: true } },
      },
      orderBy: { data: 'desc' },
    }),
    30_000
  )
  return NextResponse.json(s(colheitas))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, produtoId, produtorId, rocaId, parceiroId, quantidadeTotal, observacao, preco, qualidade, descarte, bandeja, nrDoc, percDono: percDonoIn, percParceiro: percParceiroIn } = await req.json()
  if (!produtoId || !quantidadeTotal) {
    return NextResponse.json({ error: 'Produto e quantidade obrigatórios' }, { status: 400 })
  }

  // Calcula percentuais — usa os fornecidos no body ou calcula pelo produtor
  let percParceiro = percParceiroIn ?? 0
  let percDono = percDonoIn ?? (100 - percParceiro)
  if (percDonoIn == null && percParceiroIn == null && produtorId) {
    const produtor = await prisma.produtor.findUnique({
      where: { id: produtorId },
      include: { parceiros: true },
    })
    if (produtor) {
      percParceiro = produtor.parceiros.reduce((s, p) => s + p.percentual, 0)
      percDono = 100 - percParceiro
    }
  }

  try {
    const colheita = await prisma.colheitaDiaria.create({
      data: {
        data: new Date(data),
        rocaId: rocaId || null,
        produtoId,
        produtorId: produtorId || null,
        parceiroId: parceiroId || null,
        percDono,
        percParceiro,
        quantidadeTotal,
        quantidadeDono: quantidadeTotal * (percDono / 100),
        quantidadeParceiro: quantidadeTotal * (percParceiro / 100),
        preco: preco ?? 0,
        qualidade: qualidade || null,
        descarte: descarte ?? 0,
        bandeja: bandeja ?? 0,
        nrDoc: nrDoc || null,
        responsavelId: session.userId,
        observacao: observacao || null,
      },
      include: {
        produto: true,
        produtor: { include: { parceiros: true } },
        responsavel: { select: { id: true, name: true, role: true } },
      },
    })
    // A caixa colhida entra no estoque na hora: é ela que o PDV vende.
    await sincronizarEstoqueDaColheita({
      id:              colheita.id,
      produtoId:       colheita.produtoId,
      quantidadeTotal: colheita.quantidadeTotal,
      descarte:        colheita.descarte,
      preco:           Number(colheita.preco),
      data:            colheita.data,
    })

    revalidateTag('lavoura', 'max')
    memCache.invalidate('colheita')
    return NextResponse.json(s(colheita), { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/colheita]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
