import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { FORMAS_CARTEIRA, ehCarteira } from '@/lib/titulo-pedido'
import { hojeISO } from '@/lib/utils'

/**
 * Tudo que já venceu e ninguém pagou: os títulos de Contas a Receber e as
 * vendas na carteira.
 *
 * Venda na carteira vira título (ver lib/titulo-pedido.ts), então listar as
 * duas coisas cruas duplicaria a mesma dívida. Por isso a carteira só entra
 * por fora quando ainda não tem título — o caso dos pedidos antigos, que só
 * ganham título depois do "Sincronizar" em Contas a Receber.
 */

const EM_ABERTO = ['ABERTO', 'CONFIRMADO', 'ENTREGUE'] as const

type ContaVencida = {
  id: string
  origem: 'CARTEIRA' | 'RECEBER'
  descricao: string
  cliente: string
  telefone: string | null
  valor: number
  vencimento: string
  diasAtraso: number
}

/**
 * Vencimento é dia, não instante: as datas são gravadas à meia-noite UTC e o
 * sistema todo as mostra em UTC (ver formatDate). Contar o atraso em UTC é o
 * que faz o aviso dizer a mesma data que a tela de Contas a Receber — em
 * horário local, quem vence dia 04 apareceria como dia 03.
 */
const diaUTC = (data: Date) =>
  Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())

const diasDesde = (vencimento: Date, hoje: Date) =>
  Math.round((diaUTC(hoje) - diaUTC(vencimento)) / 86_400_000)

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Hoje pelo relógio de Brasília, não pelo do servidor.
  const hoje = new Date(`${hojeISO()}T00:00:00.000Z`)

  // Vencer hoje ainda não é atraso: o corte é a meia-noite de hoje.
  const [titulos, carteiraSemTitulo] = await Promise.all([
    prisma.tituloFinanceiro.findMany({
      where: { status: { not: 'RECEBIDO' }, dataVenc: { lt: hoje } },
      select: {
        id: true,
        descricao: true,
        valor: true,
        dataVenc: true,
        cliente: { select: { nome: true, telefone: true } },
        pedido: { select: { numero: true, formaPagamento: true } },
      },
      orderBy: { dataVenc: 'asc' },
    }),
    prisma.pedido.findMany({
      where: {
        status: { in: [...EM_ABERTO] },
        dataCobranca: { lt: hoje },
        titulo: { is: null },
        // O PDV grava "FIADO" e a tela de pedidos grava "Carteira" — os dois valem.
        OR: FORMAS_CARTEIRA.map(forma => ({
          formaPagamento: { equals: forma, mode: 'insensitive' as const },
        })),
      },
      select: {
        id: true,
        numero: true,
        totalValor: true,
        dataCobranca: true,
        cliente: { select: { nome: true, telefone: true } },
      },
      orderBy: { dataCobranca: 'asc' },
    }),
  ])

  const contas: ContaVencida[] = [
    ...titulos.map(t => {
      // Título nascido de pedido de carteira continua sendo carteira: é o que
      // diz ao usuário onde a cobrança se resolve — no fiado ou no financeiro.
      const daCarteira = !!t.pedido && ehCarteira(t.pedido.formaPagamento)
      return {
        id:         t.id,
        origem:     daCarteira ? ('CARTEIRA' as const) : ('RECEBER' as const),
        descricao:  t.descricao || (t.pedido ? `Pedido #${t.pedido.numero}` : 'Título'),
        cliente:    t.cliente.nome,
        telefone:   t.cliente.telefone,
        valor:      Number(t.valor),
        vencimento: t.dataVenc.toISOString(),
        diasAtraso: diasDesde(t.dataVenc, hoje),
      }
    }),
    ...carteiraSemTitulo.flatMap(p => {
      // O filtro acima já exigiu data de cobrança — o guard é só para o tipo.
      if (!p.dataCobranca) return []
      return [{
        id:         p.id,
        origem:     'CARTEIRA' as const,
        descricao:  `Pedido #${p.numero} — carteira`,
        cliente:    p.cliente?.nome ?? 'Sem cliente',
        telefone:   p.cliente?.telefone ?? null,
        valor:      Number(p.totalValor),
        vencimento: p.dataCobranca.toISOString(),
        diasAtraso: diasDesde(p.dataCobranca, hoje),
      }]
    }),
  ].sort((a, b) => b.diasAtraso - a.diasAtraso)

  return NextResponse.json(contas)
}
