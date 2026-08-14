import 'server-only'
import { prisma } from '@/lib/prisma'

/**
 * Venda na carteira é venda a prazo: a mercadoria saiu, o dinheiro não entrou.
 * Por isso todo pedido de carteira ganha um título em Contas a Receber.
 *
 * Quem manda é o pedido — o título é o reflexo dele. Mudou o valor, a data de
 * cobrança ou a forma de pagamento, o título é refeito a partir do pedido; e é
 * o mesmo caminho que a criação, a edição e o acerto usam, para os três não
 * divergirem.
 *
 * O PDV grava a forma de pagamento como "FIADO"; a tela de pedidos grava o
 * rótulo "Carteira". É o mesmo negócio, então os dois valem.
 */

export const FORMAS_CARTEIRA = ['FIADO', 'CARTEIRA']

export const ehCarteira = (formaPagamento?: string | null) =>
  !!formaPagamento && FORMAS_CARTEIRA.includes(formaPagamento.trim().toUpperCase())

type PedidoCarteira = {
  id: string
  numero: number
  clienteId?: string | null
  formaPagamento?: string | null
  status?: string | null
  totalValor: number | string
  data: Date
  dataCobranca?: Date | null
}

export async function sincronizarTituloDoPedido(pedido: PedidoCarteira) {
  /**
   * Sem cliente não há de quem cobrar, e pedido cancelado não é a receber.
   * Nesses casos o título tem que sumir — inclusive quando o pedido JÁ tinha
   * título e deixou de valer (trocou carteira por dinheiro, por exemplo).
   */
  if (
    !ehCarteira(pedido.formaPagamento) ||
    !pedido.clienteId ||
    pedido.status === 'CANCELADO'
  ) {
    await prisma.tituloFinanceiro.deleteMany({ where: { pedidoId: pedido.id } })
    return
  }

  const atual = await prisma.tituloFinanceiro.findUnique({
    where: { pedidoId: pedido.id },
    select: { dataPagamento: true },
  })

  // Pedido PAGO é carteira quitada: o título acompanha. A data de pagamento já
  // registrada é preservada — refazer o título não pode reescrever a história.
  const recebido = pedido.status === 'PAGO'

  const dados = {
    clienteId:     pedido.clienteId,
    descricao:     `Pedido #${pedido.numero} — carteira`,
    valor:         pedido.totalValor,
    dataEmissao:   pedido.data,
    // Sem data de cobrança combinada, o vencimento é o dia da venda.
    dataVenc:      pedido.dataCobranca ?? pedido.data,
    status:        recebido ? ('RECEBIDO' as const) : ('A_RECEBER' as const),
    dataPagamento: recebido ? (atual?.dataPagamento ?? new Date()) : null,
    origem:        'PDV' as const,
  }

  await prisma.tituloFinanceiro.upsert({
    where:  { pedidoId: pedido.id },
    create: { ...dados, pedidoId: pedido.id },
    update: dados,
  })
}
