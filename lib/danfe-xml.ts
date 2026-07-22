/**
 * Importação do XML da NF-e — o caminho SEM OCR.
 *
 * Quando o fornecedor manda o arquivo (ou ele é baixado no portal da SEFAZ), o
 * XML é a nota de verdade: os mesmos campos que a DANFE imprime, já
 * estruturados e sem chance de erro de leitura. Sempre que houver XML, ele
 * ganha da foto — a foto vira só o anexo visual.
 *
 * O parsing usa o DOMParser do próprio navegador (nenhuma dependência nova).
 * O XML da NF-e usa o namespace http://www.portalfiscal.inf.br/nfe, então a
 * busca é feita por nome local (`getElementsByTagName` com nome sem prefixo
 * funciona para os XMLs emitidos na prática, e há fallback por nome local).
 */

import type { CampoExtraido, Danfe, ItemDanfe } from './danfe-campos'
import { decomporChave, soDigitos, validarCnpj, validarCpf } from './danfe-chave'

/** Primeiro descendente com aquele nome local (ignorando prefixo de namespace). */
function filho(raiz: Element | Document | null, nome: string): Element | null {
  if (!raiz) return null
  const diretos = raiz.getElementsByTagName(nome)
  if (diretos.length) return diretos[0]
  const todos = raiz.getElementsByTagName('*')
  for (let i = 0; i < todos.length; i++) {
    if (todos[i].localName === nome) return todos[i]
  }
  return null
}

/** Todos os descendentes com aquele nome local. */
function filhos(raiz: Element | Document | null, nome: string): Element[] {
  if (!raiz) return []
  const diretos = Array.from(raiz.getElementsByTagName(nome))
  if (diretos.length) return diretos
  return Array.from(raiz.getElementsByTagName('*')).filter((e) => e.localName === nome)
}

/** Texto de um campo filho, já sem espaços nas pontas. */
function txt(raiz: Element | null, nome: string): string {
  return filho(raiz, nome)?.textContent?.trim() ?? ''
}

/** "391.0000" (formato do XML, ponto decimal) → "391,00" (formato da planilha). */
function moedaBR(v: string, casas = 2): string {
  if (!v) return ''
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/** Quantidade: até 4 casas, mas sem zeros à toa ("1.0000" → "1"). */
function quantidadeBR(v: string): string {
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return v
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
}

/** "2026-07-21T16:30:06-03:00" → "21/07/2026". */
function dataBR(iso: string): string {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** "2026-07-21T16:30:06-03:00" → "16:30". */
function horaBR(iso: string): string {
  const m = (iso ?? '').match(/T(\d{2}:\d{2})/)
  return m ? m[1] : ''
}

function formatarDoc(d: string): string {
  const s = soDigitos(d)
  if (s.length === 14) return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (s.length === 11) return s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return d
}

/** O conteúdo tem cara de XML de NF-e? */
export function pareceXmlNfe(conteudo: string): boolean {
  return /<\s*(\w+:)?(nfeProc|NFe)\b/.test(conteudo) && /infNFe/.test(conteudo)
}

/**
 * Lê o XML da NF-e e devolve a MESMA estrutura que a leitura por OCR produz,
 * para a tela de revisão não precisar saber de onde o documento veio.
 * Devolve null se o conteúdo não for um XML de NF-e válido.
 */
export function extrairDanfeDoXml(conteudo: string): Danfe | null {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(conteudo, 'application/xml')
  } catch {
    return null
  }
  if (doc.getElementsByTagName('parsererror').length) return null

  const infNFe = filho(doc, 'infNFe')
  if (!infNFe) return null

  const avisos: string[] = []
  const campos: CampoExtraido[] = []
  const vistos = new Set<string>()
  const add = (campo: string, valor: string) => {
    const v = (valor ?? '').trim()
    if (!campo || !v || vistos.has(campo)) return
    vistos.add(campo)
    campos.push({ campo, valor: v })
  }

  // ── Chave de acesso (atributo Id: "NFe" + 44 dígitos) ───────────────────
  const chaveTxt = soDigitos(infNFe.getAttribute('Id') ?? '')
  const chave = decomporChave(chaveTxt)
  if (!chave) avisos.push('O XML não traz uma chave de acesso de 44 dígitos no atributo Id.')
  else if (!chave.dvOk) avisos.push('A chave de acesso do XML não fecha o dígito verificador.')

  const ide = filho(infNFe, 'ide')
  const emit = filho(infNFe, 'emit')
  const dest = filho(infNFe, 'dest')
  const enderEmit = filho(emit, 'enderEmit')
  const enderDest = filho(dest, 'enderDest')
  const icmsTot = filho(filho(infNFe, 'total'), 'ICMSTot')

  // ── Identificação ───────────────────────────────────────────────────────
  add('Emitente', txt(emit, 'xNome'))
  if (chave) {
    add('Chave de acesso', chave.chave.replace(/(\d{4})(?=\d)/g, '$1 ').trim())
    add('Modelo', `${chave.modelo} (${chave.modeloNome})`)
  }
  add('Número da nota', String(Number(txt(ide, 'nNF') || '0')) || txt(ide, 'nNF'))
  add('Série', txt(ide, 'serie'))
  add('Natureza da operação', txt(ide, 'natOp'))
  add('Data da emissão', dataBR(txt(ide, 'dhEmi') || txt(ide, 'dEmi')))
  add('Data da entrada / saída', dataBR(txt(ide, 'dhSaiEnt') || txt(ide, 'dSaiEnt')))
  add('Hora da saída', horaBR(txt(ide, 'dhSaiEnt')))

  const prot = filho(doc, 'infProt')
  if (prot) {
    const nProt = txt(prot, 'nProt')
    const dh = txt(prot, 'dhRecbto')
    add('Protocolo de autorização', dh ? `${nProt} ${dataBR(dh)} ${horaBR(dh)}`.trim() : nProt)
  }

  // ── Emitente ────────────────────────────────────────────────────────────
  add('CNPJ (emitente)', formatarDoc(txt(emit, 'CNPJ') || txt(emit, 'CPF')))
  add('Inscrição estadual (emitente)', txt(emit, 'IE'))
  const logradouroEmit = [txt(enderEmit, 'xLgr'), txt(enderEmit, 'nro'), txt(enderEmit, 'xCpl')]
    .filter(Boolean).join(', ')
  add('Endereço (emitente)', logradouroEmit)
  add('Bairro / Distrito (emitente)', txt(enderEmit, 'xBairro'))
  add('Município (emitente)', txt(enderEmit, 'xMun'))
  add('UF do emitente', txt(enderEmit, 'UF') || chave?.uf || '')
  add('CEP (emitente)', txt(enderEmit, 'CEP'))
  add('Fone / Fax (emitente)', txt(enderEmit, 'fone'))

  // ── Destinatário ────────────────────────────────────────────────────────
  add('Nome / Razão social', txt(dest, 'xNome'))
  const docDest = txt(dest, 'CNPJ') || txt(dest, 'CPF')
  add('CNPJ / CPF', formatarDoc(docDest))
  add('Inscrição estadual (destinatário)', txt(dest, 'IE'))
  const logradouroDest = [txt(enderDest, 'xLgr'), txt(enderDest, 'nro'), txt(enderDest, 'xCpl')]
    .filter(Boolean).join(', ')
  add('Endereço (destinatário)', logradouroDest)
  add('Bairro / Distrito (destinatário)', txt(enderDest, 'xBairro'))
  add('Município (destinatário)', txt(enderDest, 'xMun'))
  add('UF (destinatário)', txt(enderDest, 'UF'))
  add('CEP (destinatário)', txt(enderDest, 'CEP'))

  // ── Totais ──────────────────────────────────────────────────────────────
  add('Base de cálculo do ICMS', moedaBR(txt(icmsTot, 'vBC')))
  add('Valor do ICMS', moedaBR(txt(icmsTot, 'vICMS')))
  add('Base de cálculo do ICMS ST', moedaBR(txt(icmsTot, 'vBCST')))
  add('Valor do ICMS substituição', moedaBR(txt(icmsTot, 'vST')))
  add('Valor total dos produtos', moedaBR(txt(icmsTot, 'vProd')))
  add('Valor do frete', moedaBR(txt(icmsTot, 'vFrete')))
  add('Valor do seguro', moedaBR(txt(icmsTot, 'vSeg')))
  add('Desconto', moedaBR(txt(icmsTot, 'vDesc')))
  add('Outras despesas acessórias', moedaBR(txt(icmsTot, 'vOutro')))
  add('Valor total do IPI', moedaBR(txt(icmsTot, 'vIPI')))
  add('Valor total da nota', moedaBR(txt(icmsTot, 'vNF')))

  // ── Duplicatas ──────────────────────────────────────────────────────────
  for (const dup of filhos(filho(infNFe, 'cobr'), 'dup')) {
    const n = txt(dup, 'nDup') || '—'
    add(`Duplicata ${n} — vencimento`, dataBR(txt(dup, 'dVenc')))
    add(`Duplicata ${n} — valor`, moedaBR(txt(dup, 'vDup')))
  }

  // ── Itens ───────────────────────────────────────────────────────────────
  const dets = filhos(infNFe, 'det')
  const itens: ItemDanfe[] = dets.map((det) => {
    const p = filho(det, 'prod')
    return {
      codigo: txt(p, 'cProd'),
      descricao: txt(p, 'xProd'),
      ncm: txt(p, 'NCM'),
      // O CST fica no grupo do imposto (ICMS00, ICMS40, …), não no <prod>.
      cst: txt(filho(det, 'imposto'), 'CST') || txt(filho(det, 'imposto'), 'CSOSN'),
      cfop: txt(p, 'CFOP'),
      unidade: txt(p, 'uCom'),
      quantidade: quantidadeBR(txt(p, 'qCom')),
      valorUnit: moedaBR(txt(p, 'vUnCom'), 4),
      valorTotal: moedaBR(txt(p, 'vProd')),
    }
  })

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

  // ── Informações complementares ──────────────────────────────────────────
  add('Informações complementares', txt(filho(infNFe, 'infAdic'), 'infCpl'))

  // ── Conferências (baratas, mas pegam XML truncado ou adulterado) ────────
  if (docDest) {
    const d = soDigitos(docDest)
    if (d.length === 11 && !validarCpf(d)) avisos.push('O CPF do destinatário não fecha o dígito verificador.')
    if (d.length === 14 && !validarCnpj(d)) avisos.push('O CNPJ do destinatário não fecha o dígito verificador.')
  }

  const totalNota = parseFloat(txt(icmsTot, 'vNF'))
  const somaItens = dets.reduce((acc, det) => acc + (parseFloat(txt(filho(det, 'prod'), 'vProd')) || 0), 0)
  const vProd = parseFloat(txt(icmsTot, 'vProd'))
  if (Number.isFinite(vProd) && dets.length > 0 && Math.abs(somaItens - vProd) > 0.02) {
    avisos.push('A soma dos itens do XML difere do total dos produtos declarado.')
  }

  return {
    chave,
    // O XML não passa por OCR: a chave vem do próprio arquivo e fecha o DV.
    conferencia: chave?.dvOk ? 'dv' : null,
    campos,
    itens,
    total: Number.isFinite(totalNota) ? totalNota : null,
    avisos,
  }
}
