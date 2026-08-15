import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'
import { calcularFechamento } from '@/lib/fechamento-calc'

/**
 * Fechamentos de um produtor para o extrato consolidado.
 *
 * Mesmo contrato de /api/relatorio-cliente/[clienteId]: sem parâmetro traz
 * tudo; com dataInicio+dataFim filtra pela data de pagamento; com
 * fechamentoIds traz exatamente os que foram marcados na tela de seleção.
 *
 * Diferente do meeiro, o líquido do produtor não está gravado: `valorPago` só
 * existe quando alguém digitou o valor à mão na edição. Sem ele, o valor sai
 * de calcularFechamento (lib/fechamento-calc), a mesma função que a aba
 * Pagamento Produtor usa — se o PDF reimplementasse a fórmula, o recibo
 * divergiria da tela.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ produtorId: string }> },
) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { produtorId } = await params
  const dataInicioParam = req.nextUrl.searchParams.get('dataInicio')
  const dataFimParam    = req.nextUrl.searchParams.get('dataFim')
  const idsParam        = req.nextUrl.searchParams.get('fechamentoIds')
  const ids             = idsParam ? idsParam.split(',').filter(Boolean) : null

  const produtor = await prisma.produtor.findUnique({ where: { id: produtorId } })
  if (!produtor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

  const fechamentos = await prisma.fechamentoPagamento.findMany({
    where: { produtorId, ...filtro },
    orderBy: { dataPagamento: 'asc' },
  })

  if (fechamentos.length === 0) {
    return NextResponse.json({
      produtor: s(produtor),
      fechamentos: [],
      usuario: session.name ?? 'Administrador',
      emitidoEm: new Date().toISOString(),
    })
  }

  // Colheitas e vales de todos os fechamentos de uma vez; o rateio de cada um
  // é feito na memória, para não disparar duas consultas por fechamento.
  const inicioGeral = new Date(Math.min(...fechamentos.map(f => f.dataInicio.getTime())))
  const fimGeral    = new Date(Math.max(...fechamentos.map(f => f.dataFim.getTime())))
  const [colheitas, vales] = await Promise.all([
    prisma.colheitaDiaria.findMany({
      where: { produtorId, data: { gte: inicioGeral, lte: fimGeral } },
      select: {
        data: true,
        quantidadeTotal: true,
        descarte: true,
        preco: true,
        parceiroId: true,
        percParceiro: true,
      },
    }),
    prisma.vale.findMany({
      where: { fechamentoId: { in: fechamentos.map(f => f.id) } },
      select: { fechamentoId: true, valor: true },
    }),
  ])

  const linhas = fechamentos.map(f => {
    const ini = f.dataInicio.getTime()
    const fim = f.dataFim.getTime()
    const doPeriodo = colheitas.filter(c => {
      const t = c.data.getTime()
      return t >= ini && t <= fim
    })
    const valesVinculados = vales
      .filter(v => v.fechamentoId === f.id)
      .reduce((soma, v) => soma + Number(v.valor), 0)

    const calc = calcularFechamento(
      doPeriodo.map(c => ({
        quantidadeTotal: c.quantidadeTotal,
        descarte: c.descarte,
        preco: Number(c.preco),
        parceiroId: c.parceiroId,
        percParceiro: c.percParceiro,
      })),
      {
        combustivel: Number(f.combustivel),
        bandejaEmbalagem: Number(f.bandejaEmbalagem),
        valesDinheiro: Number(f.valesDinheiro),
        creditos: Number(f.creditos),
        debitosAnteriores: Number(f.debitosAnteriores),
      },
      valesVinculados,
    )

    const valorPagoManual = f.valorPago != null
    return {
      id:                f.id,
      dataInicio:        f.dataInicio.toISOString(),
      dataFim:           f.dataFim.toISOString(),
      dataPagamento:     f.dataPagamento.toISOString(),
      status:            f.status,
      bruto:             calc.produtor.bruto,
      deducaoRateada:    calc.produtor.deducaoRateada,
      abatimentoVales:   calc.produtor.abatimentoVales,
      liquido:           valorPagoManual ? Number(f.valorPago) : calc.produtor.liquido,
      /** true quando o valor veio digitado à mão e não do rateio */
      valorPagoManual,
      combustivel:       Number(f.combustivel),
      bandejaEmbalagem:  Number(f.bandejaEmbalagem),
      valesDinheiro:     Number(f.valesDinheiro),
      creditos:          Number(f.creditos),
      debitosAnteriores: Number(f.debitosAnteriores),
    }
  })

  return NextResponse.json({
    produtor: s(produtor),
    fechamentos: linhas,
    usuario: session.name ?? 'Administrador',
    emitidoEm: new Date().toISOString(),
  })
}
