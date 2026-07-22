/**
 * Chave de acesso da NF-e — 44 dígitos que são a ÂNCORA de uma DANFE lida por OCR.
 *
 * Diferente de qualquer outro campo da nota, a chave se auto-verifica: o último
 * dígito é um verificador (módulo 11) sobre os 43 anteriores. Isso muda o jogo
 * numa foto de papel: se a chave fecha o DV, os dados que ela carrega —
 * CNPJ do emitente, número, série, mês/ano da emissão — estão CERTOS, mesmo que
 * o OCR tenha errado o resto da página. Quando NÃO fecha, o DV avisa que houve
 * erro de leitura mas não diz onde; o que fazemos então está explicado em
 * `acharChave`.
 *
 * Layout dos 44 dígitos (Manual de Orientação do Contribuinte, NT 2024.001):
 *   [0..1]   cUF     código IBGE da UF do emitente (31 = MG)
 *   [2..5]   AAMM    ano e mês da emissão
 *   [6..19]  CNPJ    CNPJ do emitente
 *   [20..21] mod     modelo (55 = NF-e, 65 = NFC-e)
 *   [22..24] série
 *   [25..33] nNF     número da nota
 *   [34]     tpEmis  forma de emissão (1 = normal)
 *   [35..42] cNF     código numérico (o número solto impresso sob o código de barras)
 *   [43]     cDV     dígito verificador
 */

/** UFs por código IBGE — o primeiro par da chave. */
const UF_POR_CODIGO: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

const MODELOS: Record<string, string> = { '55': 'NF-e', '65': 'NFC-e' }

export type ChaveNFe = {
  /** Os 44 dígitos, sem espaços. */
  chave: string
  dvOk: boolean
  cUF: string
  uf: string
  /** Competência da emissão no formato AAAA-MM (a chave só carrega ano/mês). */
  competencia: string
  cnpjEmitente: string
  cnpjEmitenteOk: boolean
  modelo: string
  modeloNome: string
  serie: string
  /** Número da nota sem os zeros à esquerda. */
  numero: string
  tipoEmissao: string
  codigoNumerico: string
  dv: string
}

/** Só os dígitos de uma string ("3126 0719…" → "31260719…"). */
export function soDigitos(s: string): string {
  return (s ?? '').replace(/\D+/g, '')
}

/**
 * Dígito verificador da chave: módulo 11 com pesos 2..9 ciclando da direita
 * para a esquerda sobre os 43 primeiros dígitos. Resto 0 ou 1 → DV = 0.
 */
export function calcularDvChave(chave43: string): number | null {
  const d = soDigitos(chave43)
  if (d.length !== 43) return null
  let soma = 0
  let peso = 2
  for (let i = d.length - 1; i >= 0; i--) {
    soma += Number(d[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto === 0 || resto === 1 ? 0 : 11 - resto
}

/** A chave de 44 dígitos fecha o dígito verificador? */
export function validarChave(chave: string): boolean {
  const d = soDigitos(chave)
  if (d.length !== 44) return false
  const dv = calcularDvChave(d.slice(0, 43))
  return dv != null && dv === Number(d[43])
}

/** Dígitos verificadores do CNPJ (usado como segunda confirmação da chave). */
export function validarCnpj(cnpj: string): boolean {
  const d = soDigitos(cnpj)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false // 00000000000000 e afins
  const dv = (base: string) => {
    let peso = base.length === 12 ? 5 : 6
    let soma = 0
    for (const ch of base) {
      soma += Number(ch) * peso
      peso = peso === 2 ? 9 : peso - 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13])
}

/** Dígitos verificadores do CPF (destinatário pessoa física — comum aqui). */
export function validarCpf(cpf: string): boolean {
  const d = soDigitos(cpf)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false
  const dv = (base: string) => {
    let peso = base.length + 1
    let soma = 0
    for (const ch of base) soma += Number(ch) * peso--
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return dv(d.slice(0, 9)) === Number(d[9]) && dv(d.slice(0, 10)) === Number(d[10])
}

/** Decompõe os 44 dígitos nos campos que eles carregam. */
export function decomporChave(chave: string): ChaveNFe | null {
  const d = soDigitos(chave)
  if (d.length !== 44) return null

  const cUF = d.slice(0, 2)
  const aa = d.slice(2, 4)
  const mm = d.slice(4, 6)
  const cnpj = d.slice(6, 20)
  const modelo = d.slice(20, 22)

  return {
    chave: d,
    dvOk: validarChave(d),
    cUF,
    uf: UF_POR_CODIGO[cUF] ?? '?',
    // A chave usa ano com 2 dígitos. NF-e existe desde 2006, então "06".."99"
    // são sempre 20xx — não há ambiguidade prática de século aqui.
    competencia: `20${aa}-${mm}`,
    cnpjEmitente: cnpj,
    cnpjEmitenteOk: validarCnpj(cnpj),
    modelo,
    modeloNome: MODELOS[modelo] ?? modelo,
    serie: d.slice(22, 25),
    numero: String(Number(d.slice(25, 34))),
    tipoEmissao: d.slice(34, 35),
    codigoNumerico: d.slice(35, 43),
    dv: d.slice(43),
  }
}

/**
 * Campos impressos em OUTRO lugar da nota, usados para corroborar uma chave que
 * não fechou o dígito verificador. `cnpjsValidos` são todos os CNPJs que
 * aparecem na página e fecham os próprios dígitos verificadores.
 */
export type DicasChave = {
  numero?: string
  serie?: string
  cnpjsValidos?: string[]
}

/**
 * Como a chave foi considerada aproveitável:
 *  - 'dv'     → fechou o dígito verificador. Confiança máxima.
 *  - 'campos' → NÃO fechou o DV, mas o número, a série e o CNPJ que ela carrega
 *               batem com o que está impresso em outro canto da página. O erro
 *               de leitura, portanto, caiu num trecho que não usamos (código
 *               numérico, tipo de emissão ou o próprio DV).
 */
export type Conferencia = 'dv' | 'campos'


/**
 * Acha a chave de acesso num texto lido por OCR.
 *
 * Na DANFE ela vem em 11 grupos de 4 dígitos ("3126 0719 4241 …"), mas o OCR
 * pode juntar tudo, quebrar em outro ponto ou enfiar ruído no meio. Por isso a
 * busca é feita sobre a sequência de dígitos de cada linha (e da linha emendada
 * com a seguinte, para o caso de a chave ter quebrado em duas), deslizando uma
 * janela de 44.
 *
 * Sobre NÃO tentar consertar a chave: é tentador usar o DV para caçar o dígito
 * que o OCR errou, mas ele não serve para isso. O DV é módulo 11 e nenhum peso
 * é múltiplo de 11, então trocar um dígito sempre quebra a conta — e, partindo
 * de uma chave quebrada, há tipicamente meia dúzia de trocas em posições
 * DIFERENTES da que errou que também fazem a conta fechar de novo. Pior: as
 * posições mais livres (o código numérico de 8 dígitos, o ano/mês) não são
 * conferidas por mais nada, então nem cruzar com o CNPJ desempata. O DV prova
 * que a chave está errada; ele não diz como consertá-la.
 *
 * O que dá para fazer com honestidade é o segundo passe abaixo: se a chave não
 * fecha o DV mas o número, a série e o CNPJ que ela carrega batem com os
 * IMPRESSOS em outro canto da página, então o dígito errado caiu num trecho que
 * não usamos, e esses campos seguem aproveitáveis — com aviso na tela.
 */
export function acharChave(
  texto: string,
  dicas: DicasChave = {}
): { info: ChaveNFe; conferencia: Conferencia } | null {
  const linhas = (texto ?? '').split(/\r?\n/)
  // Cada linha isolada e também cada par de linhas consecutivas (chave quebrada).
  const trechos = linhas.concat(linhas.slice(0, -1).map((l, i) => `${l} ${linhas[i + 1]}`))

  /** Janelas de 44 dígitos que ao menos descrevem uma nota plausível. */
  const janelas: ChaveNFe[] = []
  for (const trecho of trechos) {
    const d = soDigitos(trecho)
    if (d.length < 44) continue
    for (let i = 0; i + 44 <= d.length; i++) {
      const info = decomporChave(d.slice(i, i + 44))
      // UF e modelo inexistentes denunciam que pegamos dígitos de outro campo.
      if (info && info.uf !== '?' && MODELOS[info.modelo]) janelas.push(info)
    }
  }

  const comDv = janelas.find((j) => j.dvOk)
  if (comDv) return { info: comDv, conferencia: 'dv' }

  // Sem DV: só aceita se os campos que vamos usar forem confirmados por fora.
  // Exigimos as três confirmações juntas — número, série e CNPJ — porque cada
  // uma sozinha é fraca demais para bancar uma chave que já sabemos furada.
  const { numero, serie, cnpjsValidos } = dicas
  if (!numero || !serie || !cnpjsValidos?.length) return null

  const corroborada = janelas.find(
    (j) =>
      j.numero === String(Number(soDigitos(numero))) &&
      Number(j.serie) === Number(soDigitos(serie)) &&
      cnpjsValidos.includes(j.cnpjEmitente)
  )
  return corroborada ? { info: corroborada, conferencia: 'campos' } : null
}

/** Todos os CNPJs da página que fecham os próprios dígitos verificadores. */
export function cnpjsValidosNoTexto(texto: string): string[] {
  const achados = new Set<string>()
  for (const linha of (texto ?? '').split(/\r?\n/)) {
    const d = soDigitos(linha)
    for (let i = 0; i + 14 <= d.length; i++) {
      const c = d.slice(i, i + 14)
      if (validarCnpj(c)) achados.add(c)
    }
  }
  return [...achados]
}
