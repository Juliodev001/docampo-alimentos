import 'server-only'
import { prisma } from '@/lib/prisma'

/**
 * A venda no PDV tira do estoque gravando uma entrada NEGATIVA marcada com o
 * número do pedido ("Venda PDV #12"). É por essa marca que cancelar, excluir ou
 * corrigir a venda reencontram as baixas — mesma ideia do "Colheita #<id>" que
 * a colheita usa.
 *
 * Devolver ao estoque é simplesmente apagar a baixa: sem a linha negativa o
 * saldo volta ao que era. Por isso cancelar e excluir não precisam saber quais
 * produtos saíram na venda.
 */

type ItemVenda = {
  produtoId?: string | null
  produto: string
  quantidade: number
  valorUnit: number | string
}

const marcaDoPedido = (numero: number) => `Venda PDV #${numero}`

export async function removerEstoqueDoPedido(numero: number) {
  await prisma.entradaEstoque.deleteMany({ where: { observacao: marcaDoPedido(numero) } })
}

/**
 * Refaz do zero as baixas de um pedido. Apagar e recriar cobre de uma vez a
 * troca de item, de quantidade e o cancelamento — e deixa o pedido sem baixa
 * nenhuma quando ele deixa de valer.
 */
export async function sincronizarEstoqueDoPedido(pedido: {
  numero: number
  tipo: string
  status?: string | null
  data: Date
  itens: ItemVenda[]
}) {
  await removerEstoqueDoPedido(pedido.numero)

  // Só a venda do PDV baixa estoque hoje. Pedido cancelado não tira nada — é
  // justamente o que devolve a mercadoria ao saldo.
  if (pedido.tipo !== 'PDV') return
  if (pedido.status === 'CANCELADO') return

  for (const it of pedido.itens) {
    if (it.quantidade <= 0) continue

    /**
     * O ItemPedido guarda só o NOME do produto, não o id. Na criação o id vem
     * junto no corpo da requisição; na edição sobra o nome, que vira o caminho
     * de volta ao cadastro. Produto avulso não tem cadastro — não acha e não
     * mexe em estoque, que é o certo.
     */
    const produto = it.produtoId
      ? await prisma.produto.findUnique({
          where: { id: it.produtoId },
          select: { id: true, estoqueVinculadoId: true },
        })
      : await prisma.produto.findFirst({
          where: { nome: { equals: it.produto.trim(), mode: 'insensitive' } },
          select: { id: true, estoqueVinculadoId: true },
        })
    if (!produto) continue

    // Produto com estoque vinculado desconta do mestre — é lá que mora o saldo.
    await prisma.entradaEstoque.create({
      data: {
        produtoId: produto.estoqueVinculadoId ?? produto.id,
        quantidade: -it.quantidade,
        valorUnit: it.valorUnit,
        data: pedido.data,
        observacao: marcaDoPedido(pedido.numero),
      },
    })
  }
}
