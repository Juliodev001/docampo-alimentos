import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'
import { s } from '@/lib/serialize'

const KEY = 'produtos'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const produtos = await memCache.fetch(
    KEY,
    () => prisma.produto.findMany({
      orderBy: { nome: 'asc' },
      include: { entradas: { select: { quantidade: true } } },
    }),
    60_000,
  )
  return NextResponse.json(s(produtos))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    nome, descricao, sku, preco, precoVenda, precoPromocional, precoPdv,
    unidade, categoria, fornecedorId, localizacao,
    estoqueAtual, estoqueMinimo, estoqueMaximo,
    ncm, cest, cfop, peso, altura, largura, dataValidade,
    observacao, ativo,
  } = await req.json()

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  let finalSku = sku?.trim() || null
  if (!finalSku) {
    const count = await prisma.produto.count()
    finalSku = `SKU-${String(count + 1).padStart(2, '0')}`
  }

  const produto = await prisma.produto.create({
    data: {
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      sku: finalSku,
      preco: preco ?? 0,
      precoVenda: precoVenda ?? 0,
      precoPromocional: precoPromocional ?? 0,
      precoPdv: precoPdv ?? 0,
      unidade: unidade ?? 'CAIXA',
      categoria: categoria?.trim() || null,
      fornecedorId: fornecedorId || null,
      localizacao: localizacao?.trim() || null,
      estoqueMinimo: estoqueMinimo ?? 0,
      estoqueMaximo: estoqueMaximo ?? 0,
      ncm: ncm?.trim() || null,
      cest: cest?.trim() || null,
      cfop: cfop?.trim() || null,
      peso: peso != null && peso !== '' ? parseFloat(peso) : null,
      altura: altura != null && altura !== '' ? parseFloat(altura) : null,
      largura: largura != null && largura !== '' ? parseFloat(largura) : null,
      dataValidade: dataValidade ? new Date(dataValidade) : null,
      observacao: observacao?.trim() || null,
      ativo: ativo ?? true,
    },
  })

  if (estoqueAtual && Number(estoqueAtual) > 0) {
    await prisma.entradaEstoque.create({
      data: {
        produtoId: produto.id,
        quantidade: Number(estoqueAtual),
        valorUnit: preco ?? 0,
        observacao: 'Estoque inicial',
      },
    })
  }

  memCache.invalidate(KEY)
  return NextResponse.json(s(produto), { status: 201 })
}
