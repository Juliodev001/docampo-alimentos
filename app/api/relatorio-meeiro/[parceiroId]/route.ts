import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

/**
 * Fechamentos de um meeiro para o extrato consolidado.
 *
 * Mesmo contrato de /api/relatorio-cliente/[clienteId]: sem parâmetro traz
 * tudo; com dataInicio+dataFim filtra o período; com fechamentoIds traz
 * exatamente os que o usuário marcou na tela de seleção.
 *
 * O filtro de período é pela data de pagamento — é a data em que o dinheiro
 * saiu, e é por ela que o usuário procura o fechamento.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ parceiroId: string }> },
) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { parceiroId } = await params
  const dataInicioParam = req.nextUrl.searchParams.get('dataInicio')
  const dataFimParam    = req.nextUrl.searchParams.get('dataFim')
  const idsParam        = req.nextUrl.searchParams.get('fechamentoIds')
  const ids             = idsParam ? idsParam.split(',').filter(Boolean) : null

  const parceiro = await prisma.parceiro.findUnique({
    where: { id: parceiroId },
    include: { produtor: { select: { id: true, nome: true, codigo: true } } },
  })
  if (!parceiro) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let filtro: object = {}
  if (ids) {
    filtro = { id: { in: ids } }
  } else if (dataInicioParam && dataFimParam) {
    filtro = {
      dataPagamento: {
        gte: new Date(dataInicioParam + 'T00:00:00.000Z'),
        lte: new Date(dataFimParam + 'T23:59:59.999Z'),
      },
    }
  }

  const fechamentos = await prisma.fechamentoMeeiro.findMany({
    where: { parceiroId, ...filtro },
    orderBy: { dataPagamento: 'asc' },
  })

  return NextResponse.json({
    parceiro: s(parceiro),
    fechamentos: fechamentos.map(f => s(f)),
    usuario: session.name ?? 'Administrador',
    emitidoEm: new Date().toISOString(),
  })
}
