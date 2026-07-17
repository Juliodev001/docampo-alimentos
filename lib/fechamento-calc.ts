/**
 * Cálculo canônico do fechamento de pagamento de produtores/meeiros.
 *
 * Regras de negócio (definidas em 2026-07-14; arredondamento revisado em 2026-07-17):
 * 1. A parte do meeiro é calculada por colheita: arredondarCaixas(caixas líquidas × perc%)
 *    caixas inteiras × preço. O arredondamento das caixas segue a regra: fração até 0,5
 *    arredonda para baixo, acima de 0,5 arredonda para cima (ex.: 9,5 → 9; 9,6 → 10).
 *    O produtor fica com o complemento exato, então
 *    produtor + meeiros = bruto total, sempre, sem diferença de arredondamento.
 * 2. O meeiro só participa das colheitas vinculadas a ele (parceiroId). As deduções
 *    do fechamento (combustível, embalagem, vales dinheiro, créditos, débitos
 *    anteriores) são rateadas na proporção do bruto de cada participante.
 * 3. Vales vinculados ao fechamento são dívida pessoal do produtor: descontados
 *    100% da parte dele, além do campo "Vales Dinheiro" (que é rateado como as
 *    demais deduções).
 *
 * Toda tela que exibe valores de fechamento (novo, detalhe, recibos, dashboard)
 * DEVE usar esta função — nunca reimplementar a fórmula localmente.
 */

/**
 * Arredondamento das caixas do meeiro (definido em 2026-07-17).
 * A fração até 0,5 arredonda para baixo; acima de 0,5 arredonda para cima.
 * Ex.: 9,5 → 9; 9,6 → 10; 9,4 → 9. Deve ser usado em toda tela/recibo que
 * calcula a quantidade de caixas do meeiro — nunca reimplementar com Math.floor.
 */
export function arredondarCaixas(caixas: number): number {
  return Math.ceil(caixas - 0.5)
}

export type ColheitaCalc = {
  quantidadeTotal: number
  descarte: number
  preco: number | string
  parceiroId?: string | null
  percParceiro?: number
}

export type DeducoesCalc = {
  combustivel: number | string
  bandejaEmbalagem: number | string
  valesDinheiro: number | string
  creditos: number | string
  debitosAnteriores: number | string
}

export type ParticipacaoMeeiro = {
  parceiroId: string
  caixas: number
  bruto: number
  deducaoRateada: number
  liquido: number
}

export type ResultadoFechamento = {
  totalCaixas: number
  totalBruto: number
  /** Deduções compartilhadas (combustível + embalagem + vales dinheiro + créditos + débitos) */
  totalDeducoes: number
  /** Soma dos vales vinculados — abatimento pessoal do produtor */
  valesVinculados: number
  meeiros: ParticipacaoMeeiro[]
  produtor: {
    bruto: number
    deducaoRateada: number
    abatimentoVales: number
    liquido: number
  }
  /** totalBruto − totalDeducoes − valesVinculados (soma dos líquidos de todos) */
  liquidoTotal: number
}

export function calcularFechamento(
  colheitas: ColheitaCalc[],
  deducoes: DeducoesCalc,
  valesVinculados: number | string = 0,
): ResultadoFechamento {
  let totalCaixas = 0
  let totalBruto = 0
  let brutoProdutor = 0
  const meeirosMap = new Map<string, { caixas: number; bruto: number }>()

  for (const c of colheitas) {
    const liquido = c.quantidadeTotal - c.descarte
    const preco = Number(c.preco)
    const sub = liquido * preco
    totalCaixas += liquido
    totalBruto += sub

    if (c.parceiroId) {
      const caixasMeeiro = arredondarCaixas(liquido * ((c.percParceiro ?? 0) / 100))
      const brutoMeeiro = caixasMeeiro * preco
      const atual = meeirosMap.get(c.parceiroId) ?? { caixas: 0, bruto: 0 }
      atual.caixas += caixasMeeiro
      atual.bruto += brutoMeeiro
      meeirosMap.set(c.parceiroId, atual)
      brutoProdutor += sub - brutoMeeiro
    } else {
      brutoProdutor += sub
    }
  }

  const totalDeducoes =
    Number(deducoes.combustivel) +
    Number(deducoes.bandejaEmbalagem) +
    Number(deducoes.valesDinheiro) +
    Number(deducoes.creditos) +
    Number(deducoes.debitosAnteriores)
  const vales = Number(valesVinculados)

  const fracao = (bruto: number) => (totalBruto > 0 ? bruto / totalBruto : 0)

  const meeiros: ParticipacaoMeeiro[] = Array.from(meeirosMap.entries()).map(
    ([parceiroId, m]) => {
      const deducaoRateada = totalDeducoes * fracao(m.bruto)
      return {
        parceiroId,
        caixas: m.caixas,
        bruto: m.bruto,
        deducaoRateada,
        liquido: m.bruto - deducaoRateada,
      }
    },
  )

  const deducaoProdutor = totalDeducoes * fracao(brutoProdutor)
  const produtor = {
    bruto: brutoProdutor,
    deducaoRateada: deducaoProdutor,
    abatimentoVales: vales,
    liquido: brutoProdutor - deducaoProdutor - vales,
  }

  return {
    totalCaixas,
    totalBruto,
    totalDeducoes,
    valesVinculados: vales,
    meeiros,
    produtor,
    liquidoTotal: totalBruto - totalDeducoes - vales,
  }
}
