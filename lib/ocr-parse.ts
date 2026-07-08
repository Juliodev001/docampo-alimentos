/**
 * Extração GENÉRICA de valores a partir do texto devolvido pelo OCR.
 * Não assume um layout de documento específico: procura pares "rótulo: valor",
 * valores monetários, datas e, no pior caso, devolve as linhas cruas para o
 * usuário revisar. O resultado é sempre editável na tela antes de salvar.
 */

export type CampoExtraido = { campo: string; valor: string }
export type OcrWord = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }

// Valores monetários pt-BR: "R$ 1.234,56", "1.234,56", "1234,56".
const MONEY_RE = /R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)|R?\$?\s*\d+,\d{2}(?!\d)/g
// Mesma forma que MONEY_RE, mas ancorada — usada para validar que uma string
// INTEIRA é um valor monetário (não uma frase/data com dígitos no meio, ex.:
// "22/06/2026" viraria 22062026 se convertida sem essa checagem).
const MONEY_ONLY_RE = /^\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*$|^\s*R?\$?\s*\d+,\d{2}\s*$/
// Datas: dd/mm/aaaa, dd/mm/aa ou dd.mm.aaaa.
const DATE_RE = /\b\d{2}[/.]\d{2}[/.]\d{2,4}\b/g

// Rótulos comuns de documentos (identidade, nota, cadastro). Quando um destes
// aparece, o valor vem logo depois — na MESMA linha ou na linha DE BAIXO
// (comum em RG/identidade: o rótulo fica em cima e o valor embaixo).
// Ordem importa: o mais específico primeiro (ex.: "sobrenome" antes de "nome").
const ROTULOS_CONHECIDOS: { campo: string; re: RegExp }[] = [
  { campo: 'CNPJ',               re: /\bcnpj\b/i },
  { campo: 'CPF',                re: /\bcpf\b/i },
  { campo: 'RG',                 re: /\b(rg|registro geral|carteira de identidade|identidade)\b/i },
  { campo: 'Sobrenome',          re: /\b(sobrenome|surname)\b/i },
  { campo: 'Nome',               re: /\b(nome completo|given name|nome)\b/i },
  { campo: 'Data de nascimento', re: /\b(data de nascimento|nascimento|date of birth)\b/i },
  { campo: 'Data de emissão',    re: /\b(data de emiss[ãa]o|date of issue|emiss[ãa]o)\b/i },
  { campo: 'Validade',           re: /\b(validade|data de validade|expiry date|vencimento)\b/i },
  { campo: 'Nacionalidade',      re: /\b(nacionalidade|nationality)\b/i },
  { campo: 'Naturalidade',       re: /\b(naturalidade|place of birth)\b/i },
  { campo: 'Sexo',               re: /\b(sexo|sex|g[êe]nero)\b/i },
  { campo: 'Endereço',           re: /\b(endere[çc]o|address|logradouro)\b/i },
  { campo: 'Telefone',           re: /\b(telefone|celular|whatsapp|fone|phone)\b/i },
  { campo: 'E-mail',             re: /\be-?mail\b/i },
]

/** A linha (sem numeração tipo "3.") é essencialmente só um rótulo conhecido ou termina em ":"? */
function ehSoRotulo(linha: string): boolean {
  const l = linha.replace(/^\s*\d{1,2}[.)\-]\s*/, '').trim()
  if (/[:：]\s*$/.test(l)) return true
  return ROTULOS_CONHECIDOS.some((r) => {
    const m = l.match(r.re)
    if (!m) return false
    // Só é "só rótulo" se não sobra um valor depois do rótulo na mesma linha.
    const depois = l.slice((m.index ?? 0) + m[0].length).replace(/^[\s:：.\-]+/, '').trim()
    return depois.length === 0
  })
}

/** Extrai o valor que vem DEPOIS do rótulo na mesma linha (ou '' se não houver). */
function valorNaMesmaLinha(linha: string, re: RegExp): string {
  const semNum = linha.replace(/^\s*\d{1,2}[.)\-]\s*/, '')
  const m = semNum.match(re)
  if (!m) return ''
  return semNum.slice((m.index ?? 0) + m[0].length).replace(/^[\s:：.\-]+/, '').trim()
}

/** Converte um trecho monetário pt-BR em número (1.234,56 → 1234.56). Retorna null se a string não for só um valor monetário. */
export function parseMoneyToNumber(s: string): number | null {
  if (!MONEY_ONLY_RE.test(s)) return null
  const cleaned = s.replace(/[^\d.,]/g, '')
  if (!cleaned) return null
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

/** Formata um número como moeda pt-BR sem o símbolo (1234.5 → "1.234,50"). */
export function formatBRNumber(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Reconstrói linhas de texto a partir das palavras com bounding box do Tesseract,
 * agrupando por proximidade vertical (linha visual), em vez de confiar na
 * segmentação de linha do próprio Tesseract. Tabelas com células de fundo
 * colorido/borda (ex.: screenshot de planilha) costumam ser lidas célula por
 * célula pelo Tesseract, perdendo o contexto da linha (produto separado do
 * valor); reagrupar pela posição real na imagem recupera essa linha.
 */
export function reconstruirLinhas(words: OcrWord[]): string {
  if (!words.length) return ''

  const alturas = words.map((w) => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b)
  const alturaMediana = alturas[Math.floor(alturas.length / 2)] || 20
  const tolerancia = alturaMediana * 0.6

  type Linha = { yCentro: number; palavras: OcrWord[] }
  const linhas: Linha[] = []

  for (const w of [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const yCentro = (w.bbox.y0 + w.bbox.y1) / 2
    const linha = linhas.find((l) => Math.abs(l.yCentro - yCentro) <= tolerancia)
    if (linha) {
      linha.palavras.push(w)
      linha.yCentro = (linha.yCentro * (linha.palavras.length - 1) + yCentro) / linha.palavras.length
    } else {
      linhas.push({ yCentro, palavras: [w] })
    }
  }

  return linhas
    .sort((a, b) => a.yCentro - b.yCentro)
    .map((l) => l.palavras.sort((a, b) => a.bbox.x0 - b.bbox.x0).map((w) => w.text).join(' '))
    .join('\n')
}

export function extrairCampos(texto: string): { campos: CampoExtraido[]; total: number | null } {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const campos: CampoExtraido[] = []
  const valores: number[] = []
  const vistos = new Set<string>()

  const add = (campo: string, valor: string) => {
    const c = campo.trim()
    const key = c.toLowerCase()
    if (!c || vistos.has(key)) return
    vistos.add(key)
    campos.push({ campo: c, valor: valor.trim() })
  }

  const usadas = new Set<number>() // linhas que viraram campo ou foram usadas como valor

  // Pré-passo: coleta todos os valores monetários (para descobrir o total).
  for (const linha of linhas) {
    const monies = linha.match(MONEY_RE)
    if (monies) for (const m of monies) {
      const n = parseMoneyToNumber(m)
      if (n != null) valores.push(n)
    }
  }

  for (let i = 0; i < linhas.length; i++) {
    if (usadas.has(i)) continue
    const linha = linhas[i]

    // 1) Rótulo conhecido (CPF, Nome, Validade, ...). O valor pode estar na mesma
    //    linha ("CPF: 123...") ou na linha DE BAIXO (RG/identidade: rótulo em
    //    cima, valor embaixo).
    const rot = ROTULOS_CONHECIDOS.find((r) => r.re.test(linha.replace(/^\s*\d{1,2}[.)\-]\s*/, '')))
    if (rot) {
      let valor = valorNaMesmaLinha(linha, rot.re)
      if (!valor && i + 1 < linhas.length && !ehSoRotulo(linhas[i + 1])) {
        valor = linhas[i + 1]
        usadas.add(i + 1)
      }
      if (valor) { add(rot.campo, valor); usadas.add(i); continue }
    }

    // 2) Par "rótulo: valor" genérico (dois-pontos comum ou fullwidth).
    const kv = linha.match(/^(.{2,40}?)\s*[:：]\s*(.+)$/)
    if (kv) { add(kv[1], kv[2]); usadas.add(i); continue }

    // 3) Rótulo genérico terminando em ":" e o valor na linha de baixo.
    if (/[:：]\s*$/.test(linha) && i + 1 < linhas.length && !ehSoRotulo(linhas[i + 1])) {
      add(linha.replace(/[:：]\s*$/, ''), linhas[i + 1])
      usadas.add(i); usadas.add(i + 1)
      continue
    }

    // 4) "Rótulo .... R$ 123,45" (rótulo seguido de um valor monetário no fim).
    const lv = linha.match(/^(.{2,40}?)[\s.·-]{2,}(R?\$?\s*\d[\d.,]*)$/)
    if (lv && parseMoneyToNumber(lv[2]) != null) { add(lv[1], lv[2]); usadas.add(i); continue }
  }

  // Linhas que não viraram par campo:valor — inclui cabeçalho de tabela (a
  // "linha amarela" com PARCEIRO/DATA/PRODUTO/...), títulos e as linhas de dados.
  const linhasRestantes = linhas.filter((_, i) => !usadas.has(i))
  // É uma tabela/lista se sobrou alguma linha com valor monetário.
  const temTabela = linhasRestantes.some((l) => l.match(MONEY_RE))

  // Data solta: adiciona a primeira encontrada, se ainda não houver um campo de data.
  const datas = texto.match(DATE_RE)
  if (datas && !campos.some((c) => /\bdata\b|venc|emiss/i.test(c.campo))) {
    campos.unshift({ campo: 'Data', valor: datas[0] })
    vistos.add('data')
  }

  // Total = maior valor monetário detectado (palpite), se ainda não houver "total".
  const total = valores.length ? Math.max(...valores) : null
  if (total != null && !campos.some((c) => /total|valor/i.test(c.campo))) {
    add('Total (maior valor)', formatBRNumber(total))
  }

  if (campos.length === 0) {
    // Nada estruturado (nem rótulo:valor): devolve todas as linhas para revisão.
    linhas.slice(0, 40).forEach((l, i) => campos.push({ campo: `Linha ${i + 1}`, valor: l }))
  } else if (temTabela) {
    // Tabela/lista: traz TODAS as linhas restantes na ordem original — inclusive
    // o cabeçalho (linha amarela com os nomes das colunas) e o título —, para não
    // perder nada. O que não interessar é só apagar na revisão.
    linhasRestantes.slice(0, 40).forEach((l, i) => add(`Linha ${i + 1}`, l))
  }

  return { campos, total }
}
