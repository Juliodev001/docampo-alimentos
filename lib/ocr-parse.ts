/**
 * Extração GENÉRICA de valores a partir do texto devolvido pelo OCR.
 * Não assume um layout de documento específico: procura pares "rótulo: valor",
 * valores monetários, datas e, no pior caso, devolve as linhas cruas para o
 * usuário revisar. O resultado é sempre editável na tela antes de salvar.
 */

export type CampoExtraido = { campo: string; valor: string }

// Valores monetários pt-BR: "R$ 1.234,56", "1.234,56", "1234,56".
const MONEY_RE = /R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)|R?\$?\s*\d+,\d{2}(?!\d)/g
// Mesma forma que MONEY_RE, mas ancorada — usada para validar que uma string
// INTEIRA é um valor monetário (não uma frase/data com dígitos no meio, ex.:
// "22/06/2026" viraria 22062026 se convertida sem essa checagem).
const MONEY_ONLY_RE = /^\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*$|^\s*R?\$?\s*\d+,\d{2}\s*$/
// Datas: dd/mm/aaaa ou dd/mm/aa.
const DATE_RE = /\b\d{2}\/\d{2}\/\d{2,4}\b/g

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

  const linhasCruas: string[] = []

  for (const linha of linhas) {
    // Coleta valores monetários da linha (para descobrir o total depois).
    const monies = linha.match(MONEY_RE)
    if (monies) {
      for (const m of monies) {
        const n = parseMoneyToNumber(m)
        if (n != null) valores.push(n)
      }
    }

    // Par "rótulo: valor" (dois-pontos comum ou fullwidth).
    const kv = linha.match(/^(.{2,40}?)\s*[:：]\s*(.+)$/)
    if (kv) {
      add(kv[1], kv[2])
      continue
    }

    // "Rótulo .... R$ 123,45" (rótulo seguido de um valor monetário no fim).
    const lv = linha.match(/^(.{2,40}?)[\s.·-]{2,}(R?\$?\s*\d[\d.,]*)$/)
    if (lv && parseMoneyToNumber(lv[2]) != null) {
      add(lv[1], lv[2])
      continue
    }

    // Não bateu com "rótulo: valor" — se a linha tem algum valor monetário
    // (típico de tabela em colunas, ex.: planilha com várias linhas de produto),
    // guarda a linha inteira crua para não perder o dado.
    if (monies && monies.length) linhasCruas.push(linha)
  }

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
    // Nada estruturado (nem rótulo:valor, nem linha com valor monetário):
    // devolve todas as linhas cruas para revisão manual.
    linhas.slice(0, 40).forEach((l, i) => campos.push({ campo: `Linha ${i + 1}`, valor: l }))
  } else if (linhasCruas.length) {
    // Tabela em colunas (não bate com "rótulo: valor"): mostra cada linha com
    // valor monetário como um campo editável, em vez de descartar o dado.
    linhasCruas.slice(0, 40).forEach((l, i) => add(`Linha ${i + 1}`, l))
  }

  return { campos, total }
}
