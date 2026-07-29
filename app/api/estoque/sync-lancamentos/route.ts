import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

/**
 * Traz para o estoque as colheitas que ainda não entraram — as lançadas antes
 * de a colheita passar a alimentar o estoque sozinha (ver lib/estoque-colheita).
 *
 * Antes, este endpoint somava tudo por produto e gravava UMA entrada com o
 * total ("Sync lançamentos roça"). Com a colheita já lançando a sua própria
 * entrada, esse agregado virou uma segunda contagem do mesmo volume: o estoque
 * saía dobrado. Agora ele fala a mesma língua do resto do sistema — uma entrada
 * por colheita, marcada com "Colheita #<id>" — e por isso pode ser clicado
 * quantas vezes for: o que já entrou é reconhecido e não repete.
 */
export async function POST() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const colheitas = await prisma.colheitaDiaria.findMany({
    select: {
      id: true,
      produtoId: true,
      quantidadeTotal: true,
      descarte: true,
      preco: true,
      data: true,
      // Produto com estoque vinculado não guarda saldo próprio: a caixa entra
      // no mestre, que é de onde a venda de qualquer apelido é descontada.
      produto: { select: { estoqueVinculadoId: true } },
    },
  })

  // Fora o agregado do formato antigo: ele e as entradas por colheita contam o
  // mesmo volume duas vezes.
  const { count: agregadosRemovidos } = await prisma.entradaEstoque.deleteMany({
    where: { observacao: { startsWith: 'Sync lançamentos roça' } },
  })

  const jaNoEstoque = new Set(
    (
      await prisma.entradaEstoque.findMany({
        where: { observacao: { startsWith: 'Colheita #' } },
        select: { observacao: true },
      })
    ).map((e) => e.observacao),
  )

  // Vale o líquido (total − descarte): o descarte não vai para a câmara. É o
  // mesmo número que o Dashboard usa em "Caixas compradas".
  const novas = colheitas
    .filter((c) => !jaNoEstoque.has(`Colheita #${c.id}`))
    .map((c) => ({
      produtoId: c.produto?.estoqueVinculadoId ?? c.produtoId,
      quantidade: c.quantidadeTotal - c.descarte,
      valorUnit: c.preco,
      data: c.data,
      observacao: `Colheita #${c.id}`,
    }))
    .filter((e) => e.quantidade > 0)

  if (novas.length > 0) {
    await prisma.entradaEstoque.createMany({ data: novas })
  }

  // O formato antigo também escrevia precoVenda a partir do preço da colheita.
  // Isso punha o preço PAGO ao produtor como preço de VENDA — vender no custo.
  // Preço é decisão de quem vende, não efeito colateral de sincronizar estoque.

  return NextResponse.json({ sincronizados: novas.length, agregadosRemovidos })
}
