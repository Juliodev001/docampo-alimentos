/**
 * Extração de texto POSICIONADO de um PDF, sem dependência externa.
 *
 * Por que não uma biblioteca: o leitor foi feito para rodar inteiro no aparelho
 * (o Tesseract é servido pelo próprio site, em public/tesseract, justamente para
 * não depender de CDN). Puxar um pdf.js — que é grande e ainda traz um worker
 * próprio — só para ler um DANFE de uma página contraria isso. O que o PDF
 * precisa aqui é modesto: achar os streams de conteúdo, descomprimi-los e
 * interpretar os operadores de texto. Descompressão é nativa do navegador
 * (`DecompressionStream('deflate')`, já que FlateDecode é zlib).
 *
 * O que ESTE módulo cobre: PDF de texto (o que os emissores de NF-e geram),
 * fontes simples e fontes com /ToUnicode. O que ele NÃO cobre: PDF que é só uma
 * imagem escaneada (aí não há texto para extrair — o chamador cai no OCR) e PDF
 * criptografado. Ambos os casos são sinalizados no retorno, não silenciados.
 */

import type { OcrWord } from './ocr-parse'

/**
 * Largura média de um glifo em fração do corpo da fonte. Helvetica/Arial —
 * as fontes de praticamente todo DANFE — têm 0,556 em para dígitos e algo
 * próximo disso para maiúsculas, que é o grosso de uma nota fiscal. O valor
 * serve só para estimar a largura da caixa de cada palavra; o casamento de
 * rótulo com valor usa o CENTRO da caixa, então um erro de alguns por cento na
 * largura não tira a palavra da coluna.
 */
const LARGURA_GLIFO = 0.55

export type PdfExtraido = {
  palavras: OcrWord[]
  /** Altura da página em pontos, já usada para virar o eixo Y. */
  altura: number
  /** Preenchido quando não dá para extrair texto (PDF escaneado ou cifrado). */
  motivo?: 'sem-texto' | 'cifrado' | 'invalido'
}

/** Bytes → string latin1, para varrer a estrutura do PDF sem quebrar binário. */
function latin1(bytes: Uint8Array, ini = 0, fim = bytes.length): string {
  let s = ''
  const passo = 8192
  for (let i = ini; i < fim; i += passo) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(i + passo, fim)))
  }
  return s
}

/** Descomprime um stream FlateDecode usando a API nativa do navegador. */
async function inflar(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const ds = new DecompressionStream('deflate')
    const buf = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buf).set(bytes)
    const stream = new Blob([buf]).stream().pipeThrough(ds)
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    // Alguns geradores gravam deflate cru (sem cabeçalho zlib).
    try {
      const ds = new DecompressionStream('deflate-raw')
      const buf = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buf).set(bytes)
      const stream = new Blob([buf]).stream().pipeThrough(ds)
      return new Uint8Array(await new Response(stream).arrayBuffer())
    } catch {
      return null
    }
  }
}

/** Todos os streams do arquivo, já descomprimidos quando dá. */
async function lerStreams(bytes: Uint8Array): Promise<string[]> {
  const texto = latin1(bytes)
  const out: string[] = []
  const re = /stream\r?\n?/g
  let m: RegExpExecArray | null

  while ((m = re.exec(texto)) !== null) {
    const inicio = m.index + m[0].length
    const fim = texto.indexOf('endstream', inicio)
    if (fim < 0) continue
    re.lastIndex = fim

    // O dicionário do objeto fica logo antes da palavra "stream".
    const dicIni = texto.lastIndexOf('<<', m.index)
    const dic = dicIni >= 0 ? texto.slice(dicIni, m.index) : ''
    const cru = bytes.subarray(inicio, fim)

    if (/\/FlateDecode/.test(dic)) {
      const inflado = await inflar(cru)
      if (inflado) out.push(latin1(inflado))
    } else if (!/\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode|RunLengthDecode|LZWDecode)/.test(dic)) {
      out.push(latin1(cru))
    }
  }
  return out
}

/** Desescapa uma string literal de PDF: "\(", "\n", "\053" (octal)… */
function desescapar(s: string): string {
  return s.replace(/\\(n|r|t|b|f|\(|\)|\\|[0-7]{1,3})/g, (_, c: string) => {
    switch (c) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      case 'b': return '\b'
      case 'f': return '\f'
      case '(': return '('
      case ')': return ')'
      case '\\': return '\\'
      default: return String.fromCharCode(parseInt(c, 8))
    }
  })
}

/**
 * Mapa /ToUnicode de uma fonte com subconjunto embutido: sem ele, os bytes
 * mostrados no PDF são índices de glifo e sairiam como caracteres aleatórios.
 * Cobre as duas formas do CMap — `beginbfchar` (um a um) e `beginbfrange`
 * (faixas), incluindo a variante da faixa com lista de destinos entre colchetes.
 */
function lerToUnicode(streams: string[]): Map<number, string> {
  const mapa = new Map<number, string>()
  const hexParaTexto = (h: string) => {
    let s = ''
    const limpo = h.replace(/\s+/g, '')
    for (let i = 0; i + 4 <= limpo.length; i += 4) {
      s += String.fromCharCode(parseInt(limpo.slice(i, i + 4), 16))
    }
    return s
  }

  for (const st of streams) {
    if (!/beginbfchar|beginbfrange/.test(st)) continue

    for (const bloco of st.match(/beginbfchar([\s\S]*?)endbfchar/g) ?? []) {
      const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
      let m: RegExpExecArray | null
      while ((m = re.exec(bloco)) !== null) {
        mapa.set(parseInt(m[1], 16), hexParaTexto(m[2]))
      }
    }

    for (const bloco of st.match(/beginbfrange([\s\S]*?)endbfrange/g) ?? []) {
      const reFaixa = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
      let m: RegExpExecArray | null
      while ((m = reFaixa.exec(bloco)) !== null) {
        const ini = parseInt(m[1], 16)
        const fim = parseInt(m[2], 16)
        const base = parseInt(m[3], 16)
        for (let c = ini; c <= fim && c - ini < 512; c++) {
          mapa.set(c, String.fromCharCode(base + (c - ini)))
        }
      }
      const reLista = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g
      while ((m = reLista.exec(bloco)) !== null) {
        const ini = parseInt(m[1], 16)
        const destinos = m[3].match(/<([0-9A-Fa-f]+)>/g) ?? []
        destinos.forEach((d, i) => mapa.set(ini + i, hexParaTexto(d.slice(1, -1))))
      }
    }
  }
  return mapa
}

/** Converte uma string hexadecimal `<...>` do PDF em texto. */
function hexParaString(h: string, toUnicode: Map<number, string>): string {
  const limpo = h.replace(/\s+/g, '')
  let s = ''
  // Com /ToUnicode em mãos, os códigos costumam ter 2 bytes; sem ele, 1 byte
  // é a leitura correta para as fontes simples (WinAnsi) do DANFE.
  const passo = toUnicode.size ? 4 : 2
  for (let i = 0; i + passo <= limpo.length; i += passo) {
    const cod = parseInt(limpo.slice(i, i + passo), 16)
    s += toUnicode.get(cod) ?? String.fromCharCode(cod)
  }
  return s
}

/**
 * Interpreta os operadores de texto de um content stream e devolve cada trecho
 * mostrado com sua posição na página.
 *
 * Só o necessário para posicionar texto: BT/ET (bloco), Tf (corpo da fonte),
 * Tm/Td/TD/T* (matriz e avanço de linha), Tj/TJ/'/" (mostrar). Gráficos,
 * recortes e cores são ignorados — a grade desenhada da DANFE não interessa,
 * as colunas saem das coordenadas do próprio texto.
 */
function interpretar(conteudo: string, toUnicode: Map<number, string>, altura: number): OcrWord[] {
  const palavras: OcrWord[] = []

  // Matriz de texto (Tm) e da linha (Tlm): [a b c d e f]; e/f são x/y.
  let tm = [1, 0, 0, 1, 0, 0]
  let tlm = [1, 0, 0, 1, 0, 0]
  let corpo = 10
  let avancoLinha = 12

  const emitir = (texto: string) => {
    if (!texto.trim()) {
      // Espaço puro ainda avança o cursor.
      tm[4] += texto.length * corpo * Math.abs(tm[0] || 1) * LARGURA_GLIFO
      return
    }
    const escalaX = Math.abs(tm[0]) || 1
    const escalaY = Math.abs(tm[3]) || 1
    const larguraChar = corpo * escalaX * LARGURA_GLIFO
    const alturaChar = corpo * escalaY

    let x = tm[4]
    const yTopo = altura - tm[5] - alturaChar // PDF conta o Y de baixo para cima
    // Quebra em palavras para o casamento por coluna funcionar (uma célula da
    // DANFE pode sair num Tj só, com rótulo e valor juntos).
    for (const pedaco of texto.split(/(\s+)/)) {
      const w = pedaco.length * larguraChar
      if (pedaco.trim()) {
        palavras.push({
          text: pedaco,
          bbox: { x0: x, y0: yTopo, x1: x + w, y1: yTopo + alturaChar },
        })
      }
      x += w
    }
    tm[4] = x
  }

  const reOps = /(<[0-9A-Fa-f\s]*>|\((?:\\.|[^\\()])*\)|\[(?:[^\]\\]|\\.)*\]|[-\d.]+|\/[^\s/[\]()<>]+|[A-Za-z'"*]+)/g
  const pilha: string[] = []
  let m: RegExpExecArray | null

  while ((m = reOps.exec(conteudo)) !== null) {
    const tk = m[0]

    if (/^[A-Za-z'"*]+$/.test(tk)) {
      const args = pilha.splice(0)
      switch (tk) {
        case 'BT':
          tm = [1, 0, 0, 1, 0, 0]
          tlm = [...tm]
          break
        case 'Tf':
          corpo = parseFloat(args[args.length - 1]) || corpo
          break
        case 'TL':
          avancoLinha = parseFloat(args[args.length - 1]) || avancoLinha
          break
        case 'Tm':
          if (args.length >= 6) {
            tm = args.slice(-6).map(Number)
            tlm = [...tm]
          }
          break
        case 'Td':
          if (args.length >= 2) {
            tlm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4] + Number(args[args.length - 2]), tlm[5] + Number(args[args.length - 1])]
            tm = [...tlm]
          }
          break
        case 'TD':
          if (args.length >= 2) {
            avancoLinha = -Number(args[args.length - 1])
            tlm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4] + Number(args[args.length - 2]), tlm[5] + Number(args[args.length - 1])]
            tm = [...tlm]
          }
          break
        case 'T*':
          tlm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4], tlm[5] - avancoLinha]
          tm = [...tlm]
          break
        case 'Tj':
        case "'":
        case '"': {
          if (tk !== 'Tj') {
            tlm = [tlm[0], tlm[1], tlm[2], tlm[3], tlm[4], tlm[5] - avancoLinha]
            tm = [...tlm]
          }
          const arg = args[args.length - 1] ?? ''
          if (arg.startsWith('(')) emitir(desescapar(arg.slice(1, -1)))
          else if (arg.startsWith('<')) emitir(hexParaString(arg.slice(1, -1), toUnicode))
          break
        }
        case 'TJ': {
          const arr = args[args.length - 1] ?? ''
          if (!arr.startsWith('[')) break
          const rePart = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>|-?[\d.]+/g
          let p: RegExpExecArray | null
          while ((p = rePart.exec(arr)) !== null) {
            const t = p[0]
            if (t.startsWith('(')) emitir(desescapar(t.slice(1, -1)))
            else if (t.startsWith('<')) emitir(hexParaString(t.slice(1, -1), toUnicode))
            else {
              // Ajuste de kerning: milésimos de em, subtraídos do avanço.
              tm[4] -= (Number(t) / 1000) * corpo * (Math.abs(tm[0]) || 1)
            }
          }
          break
        }
      }
    } else {
      pilha.push(tk)
      if (pilha.length > 32) pilha.shift()
    }
  }

  return palavras
}

/** Altura da página em pontos, do primeiro /MediaBox encontrado (A4 = 842). */
function alturaDaPagina(texto: string): number {
  const m = texto.match(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/)
  if (!m) return 842
  const alt = Math.abs(parseFloat(m[4]) - parseFloat(m[2]))
  return Number.isFinite(alt) && alt > 0 ? alt : 842
}

/**
 * Lê um PDF e devolve as palavras com posição, no mesmo formato que o OCR
 * produz — assim o extrator da DANFE (lib/danfe-campos.ts) não precisa saber se
 * a página veio de foto ou de arquivo.
 */
export async function extrairPalavrasDoPdf(arquivo: ArrayBuffer): Promise<PdfExtraido> {
  const bytes = new Uint8Array(arquivo)
  const cabecalho = latin1(bytes, 0, Math.min(bytes.length, 2048))
  if (!cabecalho.startsWith('%PDF')) {
    return { palavras: [], altura: 842, motivo: 'invalido' }
  }

  const bruto = latin1(bytes)
  if (/\/Encrypt\b/.test(bruto)) {
    return { palavras: [], altura: 842, motivo: 'cifrado' }
  }

  const altura = alturaDaPagina(bruto)
  const streams = await lerStreams(bytes)
  const toUnicode = lerToUnicode(streams)

  const palavras: OcrWord[] = []
  for (const st of streams) {
    // Content stream = tem bloco de texto. Os demais (fontes, metadados,
    // CMaps) não têm operadores de mostrar texto e são descartados aqui.
    if (!/\bBT\b/.test(st) || !/\b(Tj|TJ)\b/.test(st)) continue
    palavras.push(...interpretar(st, toUnicode, altura))
  }

  if (!palavras.length) return { palavras: [], altura, motivo: 'sem-texto' }
  return { palavras, altura }
}
