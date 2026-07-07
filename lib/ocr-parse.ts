/**
 * Extração GENÉRICA de valores a partir do texto devolvido pelo OCR.
 * Não assume um layout de documento específico: procura pares "rótulo: valor",
 * valores monetários, datas e, no pior caso, devolve as linhas cruas para o
 * usuário revisar. O resultado é sempre editável na tela antes de salvar.
 */

export type CampoExtraido = { campo: string; valor: string }

// Valores monetários pt-BR: "R$ 1.234,56", "1.234,56", "1234,56".
const MONEY_RE = /R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)|R?\$?\s*\d+,\d{2}(?!\d)/g
// Datas: dd/mm/aaaa ou dd/mm/aa.
const DATE_RE = /\b\d{2}\/\d{2}\/\d{2,4}\b/g

/** Converte um trecho monetário pt-BR em número (1.234,56 → 1234.56). */
export function parseMoneyToNumber(s: string): number | null {
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
    }
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

  // Nada estruturado: devolve as linhas cruas para revisão manual.
  if (campos.length === 0) {
    linhas.slice(0, 40).forEach((l, i) => campos.push({ campo: `Linha ${i + 1}`, valor: l }))
  }

  return { campos, total }
}
