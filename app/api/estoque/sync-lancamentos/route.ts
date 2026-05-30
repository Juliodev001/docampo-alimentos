import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Agrupa colheitas por produto somando quantidades
  const colheitas = await prisma.colheitaDiaria.findMany({
    select: { produtoId: true, quantidadeTotal: true, preco: true, data: true },
  })

  const porProduto: Record<string, { quantidade: number; preco: number; ultimaData: Date }> = {}
  for (const c of colheitas) {
    if (!porProduto[c.produtoId]) {
      porProduto[c.produtoId] = { quantidade: 0, preco: 0, ultimaData: c.data }
    }
    porProduto[c.produtoId].quantidade += c.quantidadeTotal
    if (c.preco > porProduto[c.produtoId].preco) porProduto[c.produtoId].preco = c.preco
    if (c.data > porProduto[c.produtoId].ultimaData) porProduto[c.produtoId].ultimaData = c.data
  }

  // Remove entradas antigas do sync para evitar duplicatas
  await prisma.entradaEstoque.deleteMany({ where: { observacao: { startsWith: 'Sync lançamentos roça' } } })

  // Cria uma entrada por produto com o total
  const criadas: string[] = []
  for (const [produtoId, dados] of Object.entries(porProduto)) {
    if (dados.quantidade <= 0) continue
    await prisma.entradaEstoque.create({
      data: {
        produtoId,
        quantidade: dados.quantidade,
        valorUnit: dados.preco,
        data: dados.ultimaData,
        observacao: 'Sync lançamentos roça',
      },
    })
    // Atualiza precoVenda se estiver zerado
    if (dados.preco > 0) {
      await prisma.produto.updateMany({ where: { id: produtoId, precoVenda: 0 }, data: { precoVenda: dados.preco } })
    }
    criadas.push(produtoId)
  }

  return NextResponse.json({ sincronizados: criadas.length })
}
