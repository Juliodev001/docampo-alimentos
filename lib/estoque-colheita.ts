import 'server-only'
import { prisma } from '@/lib/prisma'

/**
 * A caixa que chega da roça é o que existe para vender. Sem isto, a colheita
 * alimentava só o Dashboard ("Caixas compradas") e o fechamento do meeiro, e o
 * estoque do PDV vivia de outra fonte — o número digitado no cadastro do
 * produto. As duas telas falavam de morango e diziam quantidades diferentes.
 *
 * O livro-razão do estoque é a EntradaEstoque: a colheita lança positivo, a
 * venda no PDV lança negativo (ver POST /api/pedidos), e o saldo é a soma.
 *
 * Vale o LÍQUIDO (total − descarte): o descarte não vai para a câmara, é o
 * mesmo número que o Dashboard usa em "Caixas compradas".
 */
type ColheitaEstoque = {
  id: string
  produtoId: string
  quantidadeTotal: number
  descarte: number
  preco: number
  data: Date
}

/**
 * Marca que amarra a entrada ao lançamento de colheita. É por ela que editar
 * ou excluir a colheita encontra a linha de estoque para refazer ou apagar —
 * mesma ideia do "Venda PDV #" gravado pelas vendas.
 */
const marcaDaColheita = (colheitaId: string) => `Colheita #${colheitaId}`

export async function removerEstoqueDaColheita(colheitaId: string) {
  await prisma.entradaEstoque.deleteMany({ where: { observacao: marcaDaColheita(colheitaId) } })
}

/**
 * Refaz do zero a entrada de estoque de uma colheita. Apagar e recriar, em vez
 * de atualizar, cobre de uma vez os casos em que a edição trocou o produto, a
 * data ou a quantidade — e deixa a colheita sem entrada nenhuma quando o
 * líquido zera.
 */
export async function sincronizarEstoqueDaColheita(c: ColheitaEstoque) {
  await removerEstoqueDaColheita(c.id)

  const liquido = c.quantidadeTotal - c.descarte
  if (liquido <= 0) return

  // Produto com estoque vinculado não guarda saldo próprio: a caixa entra no
  // mestre, que é de onde a venda de qualquer um do grupo é descontada. Sem
  // isto, cada apelido do mesmo morango voltaria a ter o seu próprio saldo.
  const produto = await prisma.produto.findUnique({
    where: { id: c.produtoId },
    select: { estoqueVinculadoId: true },
  })

  await prisma.entradaEstoque.create({
    data: {
      produtoId:  produto?.estoqueVinculadoId ?? c.produtoId,
      quantidade: liquido,
      valorUnit:  c.preco,
      data:       c.data,
      observacao: marcaDaColheita(c.id),
    },
  })
}
