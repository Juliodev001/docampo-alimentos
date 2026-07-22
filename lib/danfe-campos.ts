/**
 * Extração dos campos de uma DANFE a partir das palavras posicionadas na página
 * (OCR de foto ou texto de PDF — ambos entregam `OcrWord[]`).
 *
 * Por que geometria, e não regex sobre o texto corrido: a DANFE é uma GRADE.
 * O rótulo fica em cima e o valor logo abaixo, dentro da mesma célula:
 *
 *     ┌─────────────────────┬───────────────┬────────────────────────┐
 *     │ BASE DE CÁLC. ICMS  │ VALOR DO ICMS │ VALOR TOTAL DA NOTA    │   ← linha de rótulos
 *     │                0,00 │          0,00 │                 381,22 │   ← linha de valores
 *     └─────────────────────┴───────────────┴────────────────────────┘
 *
 * Lido como texto corrido isso vira "BASE DE CÁLCULO DO ICMS VALOR DO ICMS
 * VALOR TOTAL DA NOTA" seguido de "0,00 0,00 381,22" — e casar o 3º número com
 * o 3º rótulo por contagem quebra assim que o OCR perde ou inventa um token.
 * Casando pela POSIÇÃO HORIZONTAL (o valor cai debaixo do seu rótulo), um campo
 * ilegível não desalinha os vizinhos: cada célula é resolvida sozinha.
 */

import { agruparLinhas, type LinhaVisual, type OcrWord } from './ocr-parse'
import {
  acharChave, cnpjsValidosNoTexto, soDigitos, validarCnpj, validarCpf,
  type ChaveNFe, type Conferencia, type DicasChave,
} from './danfe-chave'

export type CampoExtraido = { campo: string; valor: string }

export type ItemDanfe = {
  codigo: string
  descricao: string
  ncm: string
  cst: string
  cfop: string
  unidade: string
  quantidade: string
  valorUnit: string
  valorTotal: string
}

export type Danfe = {
  chave: ChaveNFe | null
  /** Como a chave foi conferida — ver `Conferencia` em lib/danfe-chave.ts. */
  conferencia: Conferencia | null
  campos: CampoExtraido[]
  itens: ItemDanfe[]
  /** Valor total da nota, quando encontrado. */
  total: number | null
  /** Pontos que merecem conferência humana (DV corrigido, total divergente…). */
  avisos: string[]
}

const MOEDA_RE = /^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$/
const DATA_RE = /^\d{2}[/.]\d{2}[/.]\d{2,4}$/
const HORA_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/

/** Maiúsculas sem acento — o OCR erra acento com frequência, então comparamos sem. */
function norm(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Converte "1.234,56" em 1234.56. */
export function moedaParaNumero(s: string): number | null {
  const t = (s ?? '').replace(/[R$\s]/g, '')
  if (!MOEDA_RE.test(t)) return null
  const n = parseFloat(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Texto normalizado da linha + mapa char→índice da palavra, para localizar um
 * rótulo que se espalha por várias palavras ("VALOR TOTAL DA NOTA" são quatro)
 * e recuperar o bbox do trecho inteiro.
 */
type LinhaIndexada = { linha: LinhaVisual; texto: string; mapa: number[] }

function indexar(linha: LinhaVisual): LinhaIndexada {
  let texto = ''
  const mapa: number[] = []
  linha.palavras.forEach((w, i) => {
    if (texto) { texto += ' '; mapa.push(i) }
    const t = norm(w.text)
    texto += t
    for (let k = 0; k < t.length; k++) mapa.push(i)
  })
  return { linha, texto, mapa }
}

type Rotulo = {
  campo: string
  re: RegExp
  tipo: 'moeda' | 'data' | 'hora' | 'digitos' | 'texto'
  /**
   * Exigência extra sobre a linha inteira, para rótulos ambíguos. "QUANTIDADE",
   * por exemplo, aparece tanto no quadro de volumes quanto no cabeçalho da
   * tabela de itens; só o primeiro é um campo da nota.
   */
  linhaDeve?: RegExp
}

/**
 * Rótulos impressos na DANFE. A ordem importa: o mais específico primeiro, para
 * "VALOR DO ICMS SUBSTITUIÇÃO" não ser engolido por "VALOR DO ICMS" e
 * "BASE DE CÁLCULO DO ICMS ST" não ser engolido por "BASE DE CÁLCULO DO ICMS".
 */
const ROTULOS: Rotulo[] = [
  // "DE OPERAÇÃO" não é erro de digitação: há emitentes que imprimem assim,
  // em vez do "DA OPERAÇÃO" do modelo oficial.
  { campo: 'Natureza da operação',        re: /NATUREZA D[AOE] OPERACAO/,            tipo: 'texto' },
  { campo: 'Protocolo de autorização',    re: /PROTOCOLO DE AUTORIZACAO(?: DE USO)?/, tipo: 'texto' },
  { campo: 'Inscrição estadual do subst. tributário', re: /INSC\.? ?ESTADUAL DO SUBST/, tipo: 'digitos' },
  { campo: 'Inscrição estadual',          re: /INSCRICAO ESTADUAL/,                  tipo: 'digitos' },
  { campo: 'Inscrição municipal',         re: /INSCRICAO MUNICIPAL/,                 tipo: 'digitos' },
  { campo: 'Nome / Razão social',         re: /NOME ?\/ ?RAZAO SOCIAL/,              tipo: 'texto' },
  { campo: 'CNPJ / CPF',                  re: /CNPJ ?\/ ?CPF/,                       tipo: 'digitos' },
  { campo: 'CNPJ',                        re: /(?<![A-Z/])CNPJ(?![A-Z/])/,           tipo: 'digitos' },
  { campo: 'Data da emissão',             re: /DATA D[AE] EMISSAO/,                  tipo: 'data' },
  { campo: 'Data da entrada / saída',     re: /DATA D[AE] ENTRADA ?\/ ?SAIDA/,       tipo: 'data' },
  { campo: 'Hora da saída',               re: /HORA D[AE] SAIDA/,                    tipo: 'hora' },
  { campo: 'Endereço',                    re: /ENDERECO/,                            tipo: 'texto' },
  { campo: 'Bairro / Distrito',           re: /BAIRRO ?\/? ?(DISTRITO)?/,            tipo: 'texto' },
  { campo: 'CEP',                         re: /(?<![A-Z])CEP(?![A-Z])/,              tipo: 'digitos' },
  { campo: 'Município',                   re: /MUNICIPIO/,                           tipo: 'texto' },
  { campo: 'Fone / Fax',                  re: /FONE ?\/ ?FAX/,                       tipo: 'texto' },
  // "UF" sozinho é curto demais para sair caçando no texto corrido; as âncoras
  // garantem que só casa a palavra inteira, e não o "uf" de outra palavra.
  { campo: 'UF',                          re: /(?<![A-Z])UF(?![A-Z])/,               tipo: 'texto' },
  { campo: 'Base de cálculo do ICMS ST',  re: /BASE DE CALCULO DO ICMS ST/,          tipo: 'moeda' },
  { campo: 'Base de cálculo do ICMS',     re: /BASE DE CALCULO DO ICMS/,             tipo: 'moeda' },
  { campo: 'Valor do ICMS substituição',  re: /VALOR DO ICMS SUBSTITUICAO/,          tipo: 'moeda' },
  { campo: 'Valor do ICMS',               re: /VALOR DO ICMS/,                       tipo: 'moeda' },
  { campo: 'Valor total dos produtos',    re: /VALOR TOTAL DOS PRODUTOS/,            tipo: 'moeda' },
  { campo: 'Valor do frete',              re: /VALOR DO FRETE/,                      tipo: 'moeda' },
  { campo: 'Valor do seguro',             re: /VALOR DO SEGURO/,                     tipo: 'moeda' },
  { campo: 'Desconto',                    re: /(?<![A-Z])DESCONTO(?![A-Z])/,         tipo: 'moeda' },
  { campo: 'Outras despesas acessórias',  re: /OUTRAS DESPESAS/,                     tipo: 'moeda' },
  { campo: 'Valor total do IPI',          re: /VALOR TOTAL DO IPI/,                  tipo: 'moeda' },
  { campo: 'Valor total da nota',         re: /VALOR TOTAL DA NOTA/,                 tipo: 'moeda' },
  { campo: 'Peso bruto',                  re: /PESO BRUTO/,                          tipo: 'texto' },
  { campo: 'Peso líquido',                re: /PESO LIQUIDO/,                        tipo: 'texto' },
  { campo: 'Frete por conta',             re: /FRETE POR CONTA/,                     tipo: 'texto' },
  { campo: 'Código ANTT',                 re: /CODIGO ANTT/,                         tipo: 'texto' },
  { campo: 'Placa do veículo',            re: /PLACA DO VEICULO/,                    tipo: 'texto' },
  // Quadro de volumes. "QUANTIDADE" também é coluna da tabela de itens e
  // "NÚMERO"/"MARCA" são palavras comuns — daí a exigência de contexto: os
  // quatro só valem na linha que traz os pesos. Registrá-los todos importa
  // mesmo quando vêm vazios: cada rótulo delimita a célula do vizinho da
  // esquerda, e sem eles "ESPÉCIE" engoliria as colunas seguintes.
  { campo: 'Quantidade de volumes',       re: /QUANTIDADE/,                          tipo: 'texto',
    linhaDeve: /PESO BRUTO|PESO LIQUIDO/ },
  { campo: 'Espécie dos volumes',         re: /ESPECIE/,                             tipo: 'texto',
    linhaDeve: /PESO BRUTO|PESO LIQUIDO/ },
  { campo: 'Marca dos volumes',           re: /(?<![A-Z])MARCA(?![A-Z])/,            tipo: 'texto',
    linhaDeve: /PESO BRUTO|PESO LIQUIDO/ },
  { campo: 'Número dos volumes',          re: /(?<![A-Z])NUMERO(?![A-Z])/,           tipo: 'texto',
    linhaDeve: /PESO BRUTO|PESO LIQUIDO/ },
]

/**
 * Rótulos que a DANFE imprime MAIS DE UMA VEZ — uma no bloco do emitente, outra
 * no do destinatário, às vezes uma terceira no do transportador. Só estes
 * ganham sufixo indicando de qual bloco vieram.
 *
 * É uma lista de nomes exatos, e não um teste por prefixo: "CNPJ / CPF" começa
 * com "CNPJ" mas é um campo só do destinatário, e sufixá-lo mudaria o nome do
 * campo que a planilha exibe.
 */
const REPETIVEIS = new Set([
  'CNPJ',
  'Inscrição estadual',
  'Endereço',
  'Município',
  'Bairro / Distrito',
  'CEP',
  'Fone / Fax',
  'UF',
])

type RotuloAchado = {
  rotulo: Rotulo
  x0: number
  x1: number
  /** Posição do fim do rótulo no texto da linha — o que vem depois pode ser o valor. */
  fimChar: number
  linhaIdx: number
}

/**
 * Localiza, numa linha, todos os rótulos conhecidos. Um trecho já consumido por
 * um rótulo mais específico não é reaproveitado, então "VALOR DO ICMS
 * SUBSTITUIÇÃO" não é lido de novo como "VALOR DO ICMS".
 */
function acharRotulos(li: LinhaIndexada, linhaIdx: number): RotuloAchado[] {
  const achados: RotuloAchado[] = []
  const consumido: boolean[] = new Array(li.texto.length).fill(false)

  for (const rotulo of ROTULOS) {
    if (rotulo.linhaDeve && !rotulo.linhaDeve.test(li.texto)) continue
    const re = new RegExp(rotulo.re.source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(li.texto)) !== null) {
      const ini = m.index
      const fim = m.index + m[0].length
      if (m[0].length === 0) { re.lastIndex++; continue }
      let livre = true
      for (let k = ini; k < fim; k++) if (consumido[k]) { livre = false; break }
      if (!livre) continue
      for (let k = ini; k < fim; k++) consumido[k] = true

      const wIni = li.mapa[ini] ?? 0
      const wFim = li.mapa[Math.min(fim, li.mapa.length) - 1] ?? wIni
      const palavras = li.linha.palavras
      achados.push({
        rotulo,
        x0: palavras[wIni]?.bbox.x0 ?? 0,
        x1: palavras[wFim]?.bbox.x1 ?? 0,
        fimChar: fim,
        linhaIdx,
      })
    }
  }
  return achados.sort((a, b) => a.x0 - b.x0)
}

/**
 * Faixa horizontal da célula de um rótulo.
 *
 * A régua é o INÍCIO de cada rótulo, não o fim: numa DANFE o rótulo é impresso
 * miúdo, encostado na borda esquerda da célula, e o valor vem maior e alinhado
 * à DIREITA — muitas vezes bem além de onde o texto do rótulo termina. Cortar a
 * célula logo depois do rótulo (ou no meio do caminho até o vizinho) jogaria
 * justamente o valor para fora dela:
 *
 *     │ BASE DE CÁLCULO DO ICMS        │ VALOR DO ICMS      │
 *     │                          0,00  │              0,00  │
 *       ↑ começa aqui             ↑ e o valor mora aqui
 *
 * Então a célula de um rótulo vai de um triz antes do próprio x0 até um triz
 * antes do x0 do rótulo seguinte — que é exatamente onde a grade desenha a
 * divisória. A última célula da linha segue até a borda da página.
 */
const MARGEM_CELULA = 6

function faixaDaCelula(achados: RotuloAchado[], i: number): { esq: number; dir: number } {
  const cur = achados[i]
  const prox = achados[i + 1]
  return {
    esq: cur.x0 - MARGEM_CELULA,
    dir: prox ? prox.x0 - MARGEM_CELULA : Infinity,
  }
}

/** As palavras da linha cujo centro cai dentro da faixa da célula. */
function palavrasNaFaixa(linha: LinhaVisual | undefined, esq: number, dir: number): OcrWord[] {
  if (!linha) return []
  return linha.palavras.filter((w) => {
    const cx = (w.bbox.x0 + w.bbox.x1) / 2
    return cx >= esq && cx <= dir
  })
}

/** Escolhe, entre os candidatos, o token que tem a cara do tipo esperado. */
function escolherValor(palavras: OcrWord[], tipo: Rotulo['tipo']): string {
  const textos = palavras.map((w) => w.text.trim()).filter(Boolean)
  if (!textos.length) return ''

  if (tipo === 'moeda') {
    // Primeiro valor monetário da célula. Com a célula indo do rótulo até o
    // rótulo seguinte, o valor certo é sempre o mais à esquerda: se um rótulo
    // vizinho não foi reconhecido, a célula engole a coluna da direita junto, e
    // é o segundo número — não o primeiro — que passa a sobrar.
    const m = textos.filter((t) => MOEDA_RE.test(t.replace(/[R$\s]/g, '')))
    return m.length ? m[0].replace(/[R$\s]/g, '') : ''
  }
  if (tipo === 'data') {
    const d = textos.find((t) => DATA_RE.test(t))
    return d ?? ''
  }
  if (tipo === 'hora') {
    const h = textos.find((t) => HORA_RE.test(t))
    return h ?? ''
  }
  if (tipo === 'digitos') {
    // Documentos e inscrições vêm com pontuação ("119.888.076-70", "37472-000")
    // e o OCR às vezes parte o número em dois pedaços — por isso juntamos
    // tokens. Mas só os numéricos CONSECUTIVOS: no bloco do emitente o CEP
    // divide a linha com o telefone ("CEP: 37472-000  Fone: 35-9880-23337"), e
    // concatenar tudo produziria um número que não existe. A primeira palavra
    // com letra encerra o campo.
    // Qualquer palavra COM LETRA encerra a busca, mesmo antes de termos achado
    // um número: o campo, se existe, começa no início da célula. Pular o texto
    // à procura de algum dígito mais adiante é o que faria a célula do CEP do
    // emitente devolver o número da nota impresso na linha seguinte.
    const pedacos: string[] = []
    for (const t of textos) {
      if (/[A-Za-zÀ-ÿ]/.test(t)) break
      if (/\d/.test(t)) pedacos.push(t)
      else if (pedacos.length) break // separador solto depois do número
    }
    return soDigitos(pedacos.join(''))
  }
  return textos.join(' ')
}

/**
 * Onde começa a seção do destinatário. Vários rótulos (CNPJ, Inscrição
 * Estadual, Endereço, Município) aparecem duas vezes na DANFE — uma no bloco do
 * emitente, outra no do destinatário. A faixa "DESTINATÁRIO / REMETENTE" separa
 * as duas, e é ela que decide qual sufixo cada campo repetido recebe.
 */
function yDoDestinatario(linhas: LinhaVisual[]): number {
  const i = linhas.findIndex((l) => /DESTINATARIO ?\/? ?(REMETENTE)?/.test(norm(l.palavras.map((w) => w.text).join(' '))))
  return i >= 0 ? linhas[i].yCentro : Infinity
}

/**
 * Itens da nota. O cabeçalho da tabela ("CÓD. | DESCRIÇÃO DO PRODUTO / SERVIÇO |
 * NCM/SH | …") define as colunas: cada coluna vai do início do seu título até o
 * início do próximo. As linhas seguintes são fatiadas por essas mesmas faixas,
 * o que mantém a descrição longa (que ocupa várias linhas) na coluna certa.
 */
function extrairItens(linhas: LinhaVisual[]): ItemDanfe[] {
  /**
   * TODAS as colunas do quadro de produtos, inclusive as que não guardamos
   * (CST, BC ICMS, V. ICMS, V. IPI, alíquotas). Elas precisam entrar porque
   * cada título é o que delimita a coluna seguinte: sem o marco de "BC ICMS",
   * a coluna "VALOR TOTAL" se estenderia até a borda da página e engoliria
   * quatro números — o valor do item deixaria de ser reconhecido como valor.
   */
  const COLUNAS: { chave: string; re: RegExp }[] = [
    { chave: 'codigo',     re: /^COD/ },
    { chave: 'descricao',  re: /^DESCRICAO/ },
    { chave: 'ncm',        re: /^NCM/ },
    { chave: 'cst',        re: /^CST/ },
    { chave: 'cfop',       re: /^CFOP/ },
    { chave: 'unidade',    re: /^UNIDADE/ },
    { chave: 'quantidade', re: /^QUANTIDADE/ },
    { chave: 'valorUnit',  re: /^V\.? ?UNITARIO/ },
    { chave: 'valorTotal', re: /^VALOR TOTAL/ },
    { chave: '_bcIcms',    re: /^BC ICMS/ },
    { chave: '_vIcms',     re: /^V\.? ?ICMS/ },
    { chave: '_vIpi',      re: /^V\.? ?IPI/ },
    { chave: '_aliquota',  re: /^ALIQUOTA/ },
  ]

  // Cabeçalho = a linha que traz DESCRIÇÃO DO PRODUTO junto de outra coluna.
  const iCab = linhas.findIndex((l) => {
    const t = norm(l.palavras.map((w) => w.text).join(' '))
    return /DESCRICAO DO PRODUTO/.test(t) && /NCM|CFOP|QUANTIDADE/.test(t)
  })
  if (iCab < 0) return []

  const li = indexar(linhas[iCab])
  const marcos: { chave: string; x0: number }[] = []
  for (const col of COLUNAS) {
    const re = new RegExp(col.re.source)
    const m = li.texto.match(re) ?? li.texto.match(new RegExp(`(?<= )${col.re.source.replace(/^\^/, '')}`))
    if (!m || m.index == null) continue
    const wIdx = li.mapa[m.index] ?? 0
    marcos.push({ chave: col.chave, x0: linhas[iCab].palavras[wIdx]?.bbox.x0 ?? 0 })
  }
  if (marcos.length < 4) return []
  marcos.sort((a, b) => a.x0 - b.x0)

  // Mesma régua da faixaDaCelula: o título fica encostado na borda esquerda da
  // coluna e os números vêm alinhados à direita, então a coluna vai do início
  // de um título ao início do próximo.
  const faixa = (i: number) => ({
    esq: i === 0 ? -Infinity : marcos[i].x0 - MARGEM_CELULA,
    dir: i === marcos.length - 1 ? Infinity : marcos[i + 1].x0 - MARGEM_CELULA,
  })

  const itens: ItemDanfe[] = []
  let atual: ItemDanfe | null = null

  for (let i = iCab + 1; i < linhas.length; i++) {
    const texto = norm(linhas[i].palavras.map((w) => w.text).join(' '))
    // Fim da tabela de itens.
    if (/CALCULO DO ISSQN|DADOS ADICIONAIS|INFORMACOES COMPLEMENTARES|RESERVADO AO FISCO/.test(texto)) break
    if (!texto) continue

    const celulas: Record<string, string> = {}
    marcos.forEach((mk, k) => {
      const { esq, dir } = faixa(k)
      const txt = palavrasNaFaixa(linhas[i], esq, dir).map((w) => w.text).join(' ').trim()
      if (txt) celulas[mk.chave] = txt
    })

    // Linha de item nova = tem valor total E quantidade; senão é continuação da
    // descrição do item anterior (a DANFE quebra descrições longas em 2-3 linhas).
    const ehItemNovo = !!celulas.valorTotal && MOEDA_RE.test((celulas.valorTotal ?? '').replace(/\s/g, ''))
    if (ehItemNovo) {
      atual = {
        codigo: celulas.codigo ?? '',
        descricao: celulas.descricao ?? '',
        ncm: soDigitos(celulas.ncm ?? ''),
        cst: soDigitos(celulas.cst ?? ''),
        cfop: soDigitos(celulas.cfop ?? ''),
        unidade: celulas.unidade ?? '',
        quantidade: celulas.quantidade ?? '',
        valorUnit: celulas.valorUnit ?? '',
        valorTotal: (celulas.valorTotal ?? '').replace(/\s/g, ''),
      }
      itens.push(atual)
    } else if (atual) {
      // Continuação da descrição. Ela NÃO respeita a coluna: o texto miúdo
      // embaixo do produto (ONU, registro no MAPA, receituário) corre por cima
      // das colunas do meio da tabela. Recortar pela coluna de descrição
      // cortaria a frase no meio, então pegamos a linha inteira a partir de
      // onde a descrição começa.
      const iDesc = marcos.findIndex((mk) => mk.chave === 'descricao')
      const esqDesc = iDesc >= 0 ? faixa(iDesc).esq : -Infinity
      const resto = palavrasNaFaixa(linhas[i], esqDesc, Infinity).map((w) => w.text).join(' ').trim()
      if (resto) atual.descricao = `${atual.descricao} ${resto}`.trim()
    }
  }

  return itens
}

/**
 * Duplicatas do bloco FATURA: número da parcela, vencimento e valor, repetidos
 * lado a lado. Aqui a leitura por trio (nº, data, valor) na mesma linha visual
 * é mais confiável que por coluna, porque a quantidade de duplicatas varia e os
 * rótulos ("Duplicata Vencimento Valor") se repetem na horizontal.
 */
function extrairDuplicatas(linhas: LinhaVisual[]): CampoExtraido[] {
  const iFatura = linhas.findIndex((l) => /(?<![A-Z])FATURA(?![A-Z])/.test(norm(l.palavras.map((w) => w.text).join(' '))))
  if (iFatura < 0) return []

  const out: CampoExtraido[] = []
  for (let i = iFatura; i < Math.min(iFatura + 4, linhas.length); i++) {
    const texto = linhas[i].palavras.map((w) => w.text).join(' ')
    if (/CALCULO DO IMPOSTO/.test(norm(texto))) break
    const re = /([\w-]*\d[\w-]*)\s+(\d{2}[/.]\d{2}[/.]\d{2,4})\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g
    let m: RegExpExecArray | null
    while ((m = re.exec(texto)) !== null) {
      out.push({ campo: `Duplicata ${m[1]} — vencimento`, valor: m[2] })
      out.push({ campo: `Duplicata ${m[1]} — valor`, valor: m[3] })
    }
  }
  return out
}

/**
 * Razão social do emitente: a DANFE não põe rótulo nela — é o texto grande no
 * canto superior esquerdo, logo acima do endereço.
 *
 * Duas armadilhas, as duas vindas do fato de a leitura ser por linha VISUAL:
 *
 *  1. O nome do emitente divide a mesma faixa horizontal com a palavra "DANFE"
 *     e com o código de barras, que ficam no meio e à direita do cabeçalho.
 *     Filtrar a linha inteira por palavras proibidas descartaria justamente a
 *     linha certa. Por isso olhamos só a METADE ESQUERDA da página.
 *  2. Acima do emitente vem o canhoto ("RECEBEMOS DE … OS PRODUTOS CONSTANTES
 *     DA NOTA FISCAL", "DATA DE RECEBIMENTO", "ASSINATURA DO RECEBEDOR"), que
 *     também é texto à esquerda — daí a lista de dispensas.
 */
const BOILERPLATE_CABECALHO =
  /DANFE|DOCUMENTO AUXILIAR|CHAVE DE ACESSO|CONSULTA|FOLHA|SERIE|RECEBEMOS|RECEBIMENTO|RECEBEDOR|ASSINATURA|IDENTIFICACAO|NOTA FISCAL|ENTRADA|SAIDA|PROTOCOLO|NATUREZA|DESTINATARIO|INSCRICAO|CNPJ/

type Emitente = { nome: string; endereco: string; municipio: string; uf: string }

const INICIO_LOGRADOURO =
  /^(RUA|R\.|AVENIDA|AV\.?|ALAMEDA|AL\.|PRACA|PC\.|RODOVIA|ROD\.|ESTRADA|ESTR\.|TRAVESSA|TRAV\.|SITIO|FAZENDA|LARGO)\b/

function acharEmitente(linhas: LinhaVisual[], yDest: number): Emitente {
  const vazio: Emitente = { nome: '', endereco: '', municipio: '', uf: '' }
  const larguraPagina = Math.max(...linhas.flatMap((l) => l.palavras.map((w) => w.bbox.x1)), 1)
  const meio = larguraPagina * 0.5
  /** Texto da metade esquerda de uma linha — onde mora o bloco do emitente. */
  const esquerdaDe = (i: number) =>
    (linhas[i]?.palavras ?? []).filter((w) => w.bbox.x0 < meio).map((w) => w.text).join(' ').trim()

  /**
   * Âncora: a palavra "DANFE" fica no quadro central do cabeçalho, na MESMA
   * faixa horizontal da razão social do emitente. Partir dela é bem mais
   * seguro que varrer o topo da página procurando "a primeira linha que não
   * parece boilerplate" — em cima do emitente esta o canhoto, cheio de texto
   * ("DATA DE RECEBIMENTO", "ASSINATURA DO RECEBEDOR"), e basta o OCR errar uma
   * letra para a linha escapar de qualquer lista de dispensas: foi assim que o
   * emitente virou "DATA DE RECEMIVENTO" numa leitura real.
   */
  let inicio = linhas.findIndex((l) =>
    /D[A4]NF[E3]/.test(norm(l.palavras.map((w) => w.text).join(' ')))
  )

  if (inicio < 0) {
    // Sem a âncora, cai na varredura do topo — melhor que não devolver nada.
    inicio = linhas.findIndex((l, i) => {
      const t = norm(esquerdaDe(i))
      return t.length >= 8 && !BOILERPLATE_CABECALHO.test(t) && !/^[\d\s.,/:-]+$/.test(t) && !!l
    })
    if (inicio < 0) return vazio
  }

  const nome = esquerdaDe(inicio)
  if (!nome || nome.length < 4) return vazio

  // Endereço e cidade vêm nas linhas logo abaixo, também sem rótulo. Só
  // aceitamos o que tem forma de logradouro e de "Cidade/UF", e nunca abaixo da
  // faixa do destinatário — sem esse limite, o endereço do destinatário acaba
  // registrado como sendo do emitente.
  const out: Emitente = { nome, endereco: '', municipio: '', uf: '' }
  for (let k = inicio + 1; k < Math.min(inicio + 5, linhas.length); k++) {
    if (linhas[k].yCentro >= yDest) break
    const linha = esquerdaDe(k)
    if (!linha) continue
    if (!out.endereco && INICIO_LOGRADOURO.test(norm(linha))) { out.endereco = linha; continue }
    const cidadeUf = linha.match(/^(.+?)\s*\/\s*([A-Z]{2})$/)
    if (!out.municipio && cidadeUf) { out.municipio = cidadeUf[1].trim(); out.uf = cidadeUf[2] }
  }
  return out
}

/**
 * Bloco de informações complementares: o texto solto do rodapé (benefício
 * fiscal, forma de pagamento, vendedor…). Não tem uma célula só — são várias
 * linhas soltas abaixo do rótulo, e à direita fica o quadro "RESERVADO AO
 * FISCO", que não faz parte dele. Por isso a coleta vai do rótulo até o fim da
 * página, limitada à largura da própria coluna.
 */
function extrairInfoComplementares(linhas: LinhaVisual[]): string {
  const i = linhas.findIndex((l) =>
    /INFORMACOES COMPLEMENTARES/.test(norm(l.palavras.map((w) => w.text).join(' ')))
  )
  if (i < 0) return ''

  const li = indexar(linhas[i])
  let dir = Infinity
  const fisco = li.texto.match(/RESERVADO AO FISCO/)
  if (fisco && fisco.index != null) {
    const wIdx = li.mapa[fisco.index] ?? 0
    dir = (linhas[i].palavras[wIdx]?.bbox.x0 ?? Infinity) - MARGEM_CELULA
  }

  const partes: string[] = []
  for (let k = i + 1; k < linhas.length; k++) {
    const t = palavrasNaFaixa(linhas[k], -Infinity, dir).map((w) => w.text).join(' ').trim()
    if (t) partes.push(t)
  }
  return partes.join(' ')
}

/**
 * Número e série impressos no cabeçalho ("N.º 000.190.690  SÉRIE 002"), mais os
 * CNPJs legíveis da página.
 *
 * Servem para desempatar a correção da chave de acesso: são campos escritos em
 * OUTRO lugar do papel, em corpo bem maior, então errar os dois ao mesmo tempo
 * e do mesmo jeito é improvável. Sem eles, a correção pelo dígito verificador
 * seria um chute entre dezenas de chaves que também fecham a conta — ver a
 * explicação em corrigirChave (lib/danfe-chave.ts).
 */
function dicasDaPagina(texto: string): DicasChave {
  const t = norm(texto)
  const dicas: DicasChave = { cnpjsValidos: cnpjsValidosNoTexto(texto) }

  const juntos = t.match(/N[.\s°ºO]{0,4}(\d[\d.]{4,12})[\s\S]{0,16}?SERIE[\s.:]{0,4}(\d{1,3})/)
  if (juntos) {
    dicas.numero = juntos[1]
    dicas.serie = juntos[2]
    return dicas
  }
  const soNumero = t.match(/N[.\s°ºO]{0,4}(\d{1,3}(?:\.\d{3}){1,3})/)
  if (soNumero) dicas.numero = soNumero[1]
  const soSerie = t.match(/SERIE[\s.:]{0,4}(\d{1,3})/)
  if (soSerie) dicas.serie = soSerie[1]
  return dicas
}

/**
 * A página tem cara de DANFE?
 *
 * O teste precisa aguentar OCR ruim. Numa foto de A4 com resolução apertada os
 * rótulos em corpo 4 saem destroçados — "VALOR DO FRETE" vira "varoR DO TEUS" —
 * e exigir palavras-chave inteiras faz a detecção falhar justamente na hora em
 * que a extração especializada seria mais útil. Por isso: muitos sinais fracos
 * somando, em vez de poucos sinais fortes, e regex tolerante a letra trocada.
 *
 * O sinal mais robusto de todos é a própria chave de acesso. Dígito o OCR lê
 * bem melhor que letra miúda, e 44 números seguidos numa linha não acontecem
 * por acaso em outro tipo de documento — vale mesmo quando o verificador não
 * fecha, porque aqui a pergunta é "que documento é este", não "qual é a chave".
 */
export function pareceDanfe(texto: string): boolean {
  const t = norm(texto)
  let pontos = 0

  // Chave de acesso: 40+ dígitos numa linha só (com ou sem os espaços dos
  // grupos de 4, e tolerando o OCR ter comido ou inventado alguns).
  const temSequenciaLonga = (texto ?? '')
    .split(/\r?\n/)
    .some((linha) => soDigitos(linha).length >= 40)
  if (temSequenciaLonga) pontos += 3
  if (acharChave(texto)) pontos += 3

  // Cabeçalho. As variações cobrem as trocas mais comuns do OCR em maiúsculas.
  if (/D[A4]NF[E3]/.test(t)) pontos += 2
  if (/DOCUMENT\w* AUXILI\w*/.test(t)) pontos += 2
  if (/CH[A4]VE\s*D[E3]\s*[A4]C[E3]SS/.test(t)) pontos += 2
  if (/NOTA FISCAL ELETRONICA|NF-?E\b/.test(t)) pontos += 2

  // Quadros que só existem em nota fiscal.
  if (/N[A4]TUR[E3]Z[A4]/.test(t)) pontos++
  if (/D[E3]STIN[A4]T[A4]RIO|REMETENTE/.test(t)) pontos++
  if (/PROTOCOLO/.test(t)) pontos++
  if (/C[A4]LCULO DO IMPOSTO/.test(t)) pontos++
  if (/TR[A4]NSPORT[A4]DOR/.test(t)) pontos++
  if (/DUPLIC[A4]T[A4]|F[A4]TUR[A4]/.test(t)) pontos++
  if (/V[A4]LOR TOT[A4]L/.test(t)) pontos++
  if (/\bNCM\b|\bCFOP\b|\bICMS\b/.test(t)) pontos++
  if (/INSCRIC[A4]O ESTADU[A4]L/.test(t)) pontos++

  return pontos >= 4
}

/** Lê uma DANFE a partir das palavras posicionadas da página. */
export function extrairDanfe(palavras: OcrWord[]): Danfe {
  const linhas = agruparLinhas(palavras)
  const textoPagina = linhas.map((l) => l.palavras.map((w) => w.text).join(' ')).join('\n')

  const avisos: string[] = []
  const campos: CampoExtraido[] = []
  const vistos = new Set<string>()
  const add = (campo: string, valor: string) => {
    const v = (valor ?? '').trim()
    if (!campo || !v || vistos.has(campo)) return
    vistos.add(campo)
    campos.push({ campo, valor: v })
  }

  // ── 1. Chave de acesso: a âncora ────────────────────────────────────────
  const dicas = dicasDaPagina(textoPagina)
  const achadoChave = acharChave(textoPagina, dicas)
  const chave = achadoChave?.info ?? null
  const conferencia = achadoChave?.conferencia ?? null

  if (chave) {
    add('Chave de acesso', chave.chave.replace(/(\d{4})(?=\d)/g, '$1 ').trim())
    add('Número da nota', chave.numero)
    add('Série', String(Number(chave.serie)))
    add('Modelo', `${chave.modelo} (${chave.modeloNome})`)
    add('CNPJ do emitente', chave.cnpjEmitente.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'))
    add('UF do emitente', chave.uf)
    add('Competência (ano/mês)', chave.competencia)
    if (conferencia === 'campos') {
      avisos.push(
        'A chave de acesso não fechou o dígito verificador — algum dígito saiu errado na leitura. ' +
        'O número, a série e o CNPJ que ela indica batem com os impressos na página, então esses campos ' +
        'estão aproveitáveis, mas a chave inteira precisa ser conferida com a nota antes de ser usada.'
      )
    }
    if (!chave.cnpjEmitenteOk) {
      avisos.push('O CNPJ do emitente contido na chave não fecha os próprios dígitos verificadores.')
    }
    // O número impresso no cabeçalho é independente da chave: divergir entre os
    // dois significa que um dos dois foi lido errado.
    if (dicas.numero && String(Number(soDigitos(dicas.numero))) !== chave.numero) {
      avisos.push(`O número impresso no cabeçalho (${dicas.numero}) não bate com o número contido na chave de acesso (${chave.numero}).`)
    }
  } else {
    avisos.push('Não localizei uma chave de acesso confiável de 44 dígitos — os campos abaixo vieram só da leitura da página, sem conferência cruzada.')
  }

  // ── 2. Rótulos impressos, casados por coluna ────────────────────────────
  const indexadas = linhas.map(indexar)
  const yDest = yDoDestinatario(linhas)

  indexadas.forEach((li, idx) => {
    const achados = acharRotulos(li, idx)
    achados.forEach((ach, k) => {
      const { esq, dir } = faixaDaCelula(achados, k)

      // Na grade da DANFE o valor fica SEMPRE na linha de baixo, então essa é a
      // primeira tentativa. Ler antes o resto da própria linha seria arriscado:
      // a linha de rótulos é só rótulo, e qualquer coluna que não esteja no
      // nosso dicionário (CÓDIGO ANTT, MARCA…) seria confundida com o valor do
      // rótulo à esquerda dela.
      let valor = escolherValor(palavrasNaFaixa(linhas[idx + 1], esq, dir), ach.rotulo.tipo)
      // Célula alta — endereço que ocupa duas linhas, por exemplo.
      if (!valor && ach.rotulo.tipo === 'texto') {
        valor = escolherValor(palavrasNaFaixa(linhas[idx + 2], esq, dir), ach.rotulo.tipo)
      }
      // Só então o resto da própria linha: fora da grade, no cabeçalho do
      // emitente, há campos escritos em texto corrido ("CEP: 37472-000").
      if (!valor) {
        const mesmaLinha = li.linha.palavras.filter((w, wi) => {
          const posChar = li.mapa.indexOf(wi)
          return posChar >= ach.fimChar && (w.bbox.x0 + w.bbox.x1) / 2 <= dir
        })
        valor = escolherValor(mesmaLinha, ach.rotulo.tipo)
      }
      if (!valor) return

      // Campos que aparecem nos dois blocos ganham sufixo pela posição na página.
      const repetivel = REPETIVEIS.has(ach.rotulo.campo)
      const sufixo = repetivel ? (li.linha.yCentro < yDest ? ' (emitente)' : ' (destinatário)') : ''
      add(ach.rotulo.campo + sufixo, valor)
    })
  })

  // ── 3. Emitente, duplicatas e itens ─────────────────────────────────────
  const emitente = acharEmitente(linhas, yDest)
  if (emitente.nome) {
    // `unshift` para o emitente encabeçar a planilha, junto do nome da nota.
    campos.unshift({ campo: 'Emitente', valor: emitente.nome })
    vistos.add('Emitente')
  }
  add('Endereço (emitente)', emitente.endereco)
  add('Município (emitente)', emitente.municipio)

  for (const d of extrairDuplicatas(linhas)) add(d.campo, d.valor)

  const itens = extrairItens(linhas)
  itens.forEach((it, i) => {
    const n = itens.length > 1 ? ` ${i + 1}` : ''
    add(`Item${n} — descrição`, it.descricao)
    add(`Item${n} — código`, it.codigo)
    add(`Item${n} — NCM`, it.ncm)
    add(`Item${n} — CST`, it.cst)
    add(`Item${n} — CFOP`, it.cfop)
    add(`Item${n} — unidade`, it.unidade)
    add(`Item${n} — quantidade`, it.quantidade)
    add(`Item${n} — valor unitário`, it.valorUnit)
    add(`Item${n} — valor total`, it.valorTotal)
  })

  // Entrada ou saída: a DANFE marca isso num quadradinho ("0-ENTRADA 1-SAÍDA")
  // que o OCR quase sempre perde, mas o primeiro dígito do CFOP diz o mesmo —
  // 1/2/3 são operações de entrada, 5/6/7 de saída.
  const cfop = itens.find((it) => it.cfop)?.cfop ?? ''
  if (/^[123]/.test(cfop)) add('Tipo de operação', `Entrada (CFOP ${cfop})`)
  else if (/^[567]/.test(cfop)) add('Tipo de operação', `Saída (CFOP ${cfop})`)

  add('Informações complementares', extrairInfoComplementares(linhas))

  // ── 4. Conferências cruzadas ────────────────────────────────────────────
  const valorDe = (campo: string) => moedaParaNumero(campos.find((c) => c.campo === campo)?.valor ?? '')
  const total = valorDe('Valor total da nota')
  const produtos = valorDe('Valor total dos produtos')
  const desconto = valorDe('Desconto') ?? 0
  const frete = valorDe('Valor do frete') ?? 0
  const seguro = valorDe('Valor do seguro') ?? 0
  const outras = valorDe('Outras despesas acessórias') ?? 0
  const ipi = valorDe('Valor total do IPI') ?? 0

  if (total != null && produtos != null) {
    const esperado = produtos - desconto + frete + seguro + outras + ipi
    if (Math.abs(esperado - total) > 0.02) {
      avisos.push(
        `O total da nota (${total.toFixed(2).replace('.', ',')}) não bate com produtos − desconto + frete + despesas ` +
        `(${esperado.toFixed(2).replace('.', ',')}). Algum valor pode ter sido lido errado.`
      )
    }
  }

  const somaItens = itens
    .map((it) => moedaParaNumero(it.valorTotal))
    .filter((n): n is number => n != null)
    .reduce((a, b) => a + b, 0)
  if (produtos != null && itens.length > 0 && Math.abs(somaItens - produtos) > 0.02) {
    avisos.push(
      `A soma dos itens (${somaItens.toFixed(2).replace('.', ',')}) difere do total dos produtos ` +
      `(${produtos.toFixed(2).replace('.', ',')}). Confira a tabela de itens.`
    )
  }

  // O CNPJ impresso no bloco do emitente e o embutido na chave são duas
  // leituras independentes da mesma informação: divergir denuncia erro em uma
  // delas — e é sinal de que o resto da página também merece desconfiança.
  const cnpjImpresso = soDigitos(campos.find((c) => c.campo === 'CNPJ (emitente)')?.valor ?? '')
  if (chave && cnpjImpresso.length === 14 && cnpjImpresso !== chave.cnpjEmitente) {
    avisos.push('O CNPJ impresso no bloco do emitente não bate com o CNPJ contido na chave de acesso.')
  }

  // Documento do destinatário: confere o DV para avisar sobre erro de leitura.
  const docDest = campos.find((c) => c.campo === 'CNPJ / CPF')?.valor ?? ''
  if (docDest) {
    const d = soDigitos(docDest)
    if (d.length === 11 && !validarCpf(d)) avisos.push('O CPF do destinatário não fecha o dígito verificador.')
    if (d.length === 14 && !validarCnpj(d)) avisos.push('O CNPJ do destinatário não fecha o dígito verificador.')
  }

  return { chave, conferencia, campos, itens, total, avisos }
}
