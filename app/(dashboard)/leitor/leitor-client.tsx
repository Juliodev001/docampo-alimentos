'use client'

import { useCallback, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCamera, faImage, faTrashCan, faDownload, faPlus, faXmark,
  faSpinner, faTableList, faCheck, faFileLines, faMagnifyingGlass,
  faFileArrowUp, faFileCode, faFilePdf, faTriangleExclamation, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons'
import { extrairCampos, parseMoneyToNumber, reconstruirLinhas, type CampoExtraido, type OcrWord } from '@/lib/ocr-parse'
import { detectarRegioesColoridas, normalizarRegiaoColorida, dentroDeAlgumaRegiao, faixasDeTexto } from '@/lib/ocr-regioes'
import { extrairDanfe, pareceDanfe, type Danfe } from '@/lib/danfe-campos'
import { extrairDanfeDoXml, pareceXmlNfe } from '@/lib/danfe-xml'
import { extrairPalavrasDoPdf } from '@/lib/pdf-texto'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type DocLista = {
  id: string
  nome: string
  campos: CampoExtraido[]
  total: number | null
  criadoEm: string
}
type DocDetalhe = DocLista & { imagem: string | null; textoBruto: string | null }

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtBRL(n: number | null) {
  return n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Carrega o arquivo escolhido como Image, sem redimensionar nada ainda. */
function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Redesenha a imagem com o maior lado limitado a `max`. */
function redimensionar(img: HTMLImageElement, max: number): HTMLCanvasElement {
  let { width, height } = img
  const maior = Math.max(width, height)
  if (maior !== max) {
    const r = max / maior
    width = Math.round(width * r)
    height = Math.round(height * r)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)
  }
  return canvas
}

/** Versão da foto que vai para o banco: leve, só para exibir e anexar. */
const MAX_ARMAZENAMENTO = 1500

/**
 * Resolução em que o OCR realmente roda.
 *
 * A foto guardada é reduzida para caber no banco, mas o OCR NÃO pode usar essa
 * versão. Numa DANFE os rótulos são impressos em corpo 4; numa foto de A4 com
 * 1500px de altura eles ficam com 5 ou 6 pixels — o Tesseract precisa de umas
 * 20 para acertar, e abaixo disso "VALOR DO FRETE" sai como "varoR DO TEUS".
 * 3000px no maior lado equivale a ~260 DPI numa folha A4, que é a faixa em que
 * o Tesseract foi treinado.
 *
 * Quando a foto original já é grande (celular moderno tira 3000-4000px), aqui
 * ela só é ajustada; quando é pequena, o aumento por interpolação ainda ajuda,
 * porque dá ao reconhecedor traços mais grossos para trabalhar — não cria
 * detalhe que não existe, mas evita que o texto caia abaixo do tamanho mínimo.
 */
const MAX_OCR = 3000

/**
 * Prepara uma versão só para o OCR: escala de cinza + mais contraste + upscale
 * se a imagem for pequena. Ajuda bastante em screenshots de planilha (texto
 * miúdo, cores, badges) — a imagem exibida na tela continua a original colorida.
 *
 * Além do PNG em cinza, devolve o canvas COLORIDO na mesma escala: é nele que
 * o segundo passe detecta as regiões coloridas (badges, células com fundo) que
 * a binarização global do Tesseract perde — ver lib/ocr-regioes.ts.
 *
 * (Testado também um contraste LOCAL adaptativo — cada pixel comparado com a
 * média da sua vizinhança — na tentativa de recuperar texto claro sobre fundo
 * colorido sólido; piorou a leitura das células normais, então foi revertido
 * em favor do segundo passe por região.)
 */
function prepararParaOcr(img: HTMLImageElement): { cinza: string; colorida: HTMLCanvasElement } {
  const colorida = redimensionar(img, MAX_OCR)
  const { width, height } = colorida

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(colorida, 0, 0)
  const imgData = ctx.getImageData(0, 0, width, height)
  const d = imgData.data
  const CONTRAST = 1.35
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const contrastado = Math.min(255, Math.max(0, (gray - 128) * CONTRAST + 128))
    d[i] = d[i + 1] = d[i + 2] = contrastado
  }
  ctx.putImageData(imgData, 0, 0)
  return { cinza: canvas.toDataURL('image/png'), colorida }
}

export default function LeitorClient({ documentosIniciais }: { documentosIniciais: DocLista[] }) {
  const [docs, setDocs] = useState<DocLista[]>(documentosIniciais)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  // ---- Fluxo de captura ----
  const [imagem, setImagem] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [campos, setCampos] = useState<CampoExtraido[]>([])
  const [nome, setNome] = useState('')
  const [fase, setFase] = useState<'idle' | 'lendo' | 'revisao'>('idle')
  const [progresso, setProgresso] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Preenchido só quando o documento é reconhecido como DANFE/NF-e; guarda a
  // chave de acesso conferida e os avisos de conferência.
  const [danfe, setDanfe] = useState<Danfe | null>(null)
  const [origem, setOrigem] = useState<'foto' | 'pdf' | 'xml'>('foto')
  // Guardadas para permitir reinterpretar a MESMA leitura como DANFE sem
  // precisar fotografar de novo — o OCR é a parte cara, o parser não.
  const [palavras, setPalavras] = useState<OcrWord[]>([])

  // ---- Detalhe ----
  const [detalhe, setDetalhe] = useState<DocDetalhe | null>(null)

  const resetCaptura = useCallback(() => {
    setImagem(null); setTexto(''); setCampos([]); setNome(''); setFase('idle')
    setProgresso(0); setErro(null); setDanfe(null); setOrigem('foto'); setPalavras([])
    if (fileRef.current) fileRef.current.value = ''
    if (camRef.current) camRef.current.value = ''
  }, [])

  /**
   * Ponto único de chegada das três origens (foto, PDF, XML): recebe as palavras
   * já posicionadas na página e decide se o documento é uma DANFE — quando é, a
   * extração por colunas (lib/danfe-campos.ts) devolve campos muito melhores que
   * o parser genérico de "rótulo: valor".
   */
  const montarRevisao = useCallback((palavras: OcrWord[], rotuloOrigem: string, forcarDanfe = false) => {
    const txt = reconstruirLinhas(palavras)
    setTexto(txt)
    setPalavras(palavras)

    if (forcarDanfe || pareceDanfe(txt)) {
      const d = extrairDanfe(palavras)
      setDanfe(d)
      setCampos(d.campos)
      const num = d.chave ? `NF ${d.chave.numero}` : 'Nota fiscal'
      const emit = d.campos.find((c) => c.campo === 'Emitente')?.valor
      setNome(emit ? `${num} — ${emit}` : `${num} — ${new Date().toLocaleDateString('pt-BR')}`)
    } else {
      setDanfe(null)
      const { campos: extraidos } = extrairCampos(txt)
      setCampos(extraidos)
      setNome(`${rotuloOrigem} ${new Date().toLocaleDateString('pt-BR')}`)
    }
    setFase('revisao')
  }, [])

  /** XML da NF-e: leitura exata, sem OCR — o caminho mais confiável de todos. */
  const lerXml = useCallback(async (file: File) => {
    const conteudo = await file.text()
    if (!pareceXmlNfe(conteudo)) {
      throw new Error('Esse XML não parece ser de uma NF-e. Envie o arquivo da nota (que contém a tag infNFe).')
    }
    const d = extrairDanfeDoXml(conteudo)
    if (!d) throw new Error('Não consegui interpretar esse XML de NF-e.')
    setDanfe(d)
    setCampos(d.campos)
    setTexto(conteudo.slice(0, 20000))
    const emit = d.campos.find((c) => c.campo === 'Emitente')?.valor
    setNome(`NF ${d.chave?.numero ?? ''} — ${emit ?? 'XML'}`.replace(/\s+—\s+$/, '').trim())
    setFase('revisao')
  }, [])

  /** PDF de texto (o que os emissores geram): extrai as palavras com posição. */
  const lerPdf = useCallback(async (file: File) => {
    const { palavras, motivo } = await extrairPalavrasDoPdf(await file.arrayBuffer())
    if (motivo === 'cifrado') {
      throw new Error('Esse PDF está protegido por senha — não dá para ler o texto. Tente o XML da nota ou uma foto.')
    }
    if (motivo === 'invalido') throw new Error('Esse arquivo não é um PDF válido.')
    if (motivo === 'sem-texto') {
      throw new Error('Esse PDF não tem texto — parece ser uma imagem escaneada. Envie a foto direto pelo botão Fotografar, que aí o app usa o OCR.')
    }
    montarRevisao(palavras, 'PDF')
  }, [montarRevisao])

  const onPickFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    setFase('lendo')
    setProgresso(0)
    setDanfe(null)
    setImagem(null)

    const nomeArq = file.name.toLowerCase()
    const ehXml = nomeArq.endsWith('.xml') || file.type.includes('xml')
    const ehPdf = nomeArq.endsWith('.pdf') || file.type === 'application/pdf'

    try {
      if (ehXml) { setOrigem('xml'); await lerXml(file); return }
      if (ehPdf) { setOrigem('pdf'); await lerPdf(file); return }

      setOrigem('foto')
      // A foto é carregada UMA vez e serve a dois propósitos com resoluções
      // diferentes: a versão leve que fica anexada ao documento e a versão
      // grande em que o OCR roda. Reduzir antes de reconhecer era o que fazia
      // os rótulos miúdos da DANFE sumirem.
      const original = await carregarImagem(file)
      setImagem(redimensionar(original, MAX_ARMAZENAMENTO).toDataURL('image/jpeg', 0.72))

      const { cinza: ocrInput, colorida } = prepararParaOcr(original)

      const { default: Tesseract } = await import('tesseract.js')
      // Motor, núcleo WASM e idioma são servidos pelo PRÓPRIO site (public/tesseract),
      // não por um CDN externo — assim funciona em qualquer celular e sem depender
      // de terceiros. Ver public/tesseract/ (copiado no build) e README abaixo.
      // URLs absolutas (com origin) — o worker roda a partir de um blob: URL e
      // não resolve caminhos raiz-relativos (importScripts falha com "URL inválida").
      const origin = window.location.origin
      // Worker manual (não o atalho Tesseract.recognize) pra poder ajustar o PSM
      // e usar reconstruirLinhas (data.words) em vez de data.text.
      const worker = await Tesseract.createWorker('por', 1, {
        workerPath: `${origin}/tesseract/worker.min.js`,
        corePath: `${origin}/tesseract`,
        langPath: `${origin}/tesseract/lang`,
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgresso(Math.round(m.progress * 100))
          }
        },
      })
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO })
      const { data } = await worker.recognize(ocrInput)

      // Palavras do passe principal, sem os cacos de pontuação que as bordas
      // de tabela viram ("|", "—"...): só fica o que tem letra ou número.
      let palavras: OcrWord[] = (data.words ?? [])
        .filter((w) => /[\p{L}\p{N}]/u.test(w.text))
        .map((w) => ({ text: w.text, bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 } }))

      // Segundo passe: regiões coloridas (badges, células verdes/amarelas) que
      // a binarização global perde. Cada recorte é normalizado (texto escuro
      // sobre branco) e reconhecido separadamente; as palavras novas entram no
      // lugar das (geralmente mutiladas) que o passe 1 achou ali dentro.
      const ctxColor = colorida.getContext('2d')
      if (ctxColor) {
        const regioes = detectarRegioesColoridas(
          ctxColor.getImageData(0, 0, colorida.width, colorida.height)
        )
        if (regioes.length) {
          // Linha única por faixa: o PSM de bloco pulava linhas em recortes
          // esparsos (coluna de valores com células empilhadas).
          await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE })
          const extras: OcrWord[] = []
          for (const rg of regioes) {
            // a erosão da detecção encolhe o bbox ~1 célula da grade; o pad devolve o respiro
            const pad = 6
            const x = Math.max(0, rg.x0 - pad)
            const y = Math.max(0, rg.y0 - pad)
            const w = Math.min(colorida.width, rg.x1 + pad) - x
            const h = Math.min(colorida.height, rg.y1 + pad) - y
            const recorte = ctxColor.getImageData(x, y, w, h)
            normalizarRegiaoColorida(recorte)
            const cv = document.createElement('canvas')
            cv.width = w
            cv.height = h
            const cvCtx = cv.getContext('2d')
            if (!cvCtx) continue
            cvCtx.putImageData(recorte, 0, 0)
            for (const faixa of faixasDeTexto(recorte)) {
              // inset horizontal: deixa as bordas verticais da célula fora da faixa
              const insetX = Math.min(8, w >> 2)
              const fw = w - insetX * 2
              const fh = faixa.y1 - faixa.y0
              const fx = document.createElement('canvas')
              fx.width = fw
              fx.height = fh
              fx.getContext('2d')?.drawImage(cv, insetX, faixa.y0, fw, fh, 0, 0, fw, fh)
              const rec = await worker.recognize(fx)
              for (const wd of rec.data.words ?? []) {
                if ((wd.confidence ?? 0) < 55) continue
                if (!/[\p{L}\p{N}]/u.test(wd.text)) continue
                // fragmento curto e incerto = quase sempre a seta/ícone do badge
                if (wd.text.trim().length <= 2 && (wd.confidence ?? 0) < 80) continue
                extras.push({
                  text: wd.text,
                  bbox: {
                    x0: wd.bbox.x0 + x + insetX,
                    y0: wd.bbox.y0 + y + faixa.y0,
                    x1: wd.bbox.x1 + x + insetX,
                    y1: wd.bbox.y1 + y + faixa.y0,
                  },
                })
              }
            }
          }
          // margem 10: a erosão encolhe o bbox da região, e as palavras que o
          // passe 1 "leu" na beirada de um badge (a borda vira ruído tipo "II",
          // "[I") ficam com o centro um pouco fora dela.
          palavras = palavras
            .filter((wd) => !dentroDeAlgumaRegiao(wd.bbox, regioes, 10))
            .concat(extras)
        }
      }

      await worker.terminate()
      // As linhas são reconstruídas pela posição real das palavras na imagem —
      // mais confiável que a segmentação do Tesseract em tabelas com células
      // coloridas/com borda, e é o que permite ler a grade da DANFE por coluna.
      if (palavras.length) {
        montarRevisao(palavras, 'Documento')
      } else {
        // O Tesseract não devolveu palavras posicionadas: resta o texto corrido.
        const txt = data.text || ''
        setTexto(txt)
        setDanfe(null)
        setCampos(extrairCampos(txt).campos)
        setNome(`Documento ${new Date().toLocaleDateString('pt-BR')}`)
        setFase('revisao')
      }
    } catch (err) {
      console.error(err)
      setErro(
        (ehXml || ehPdf) && err instanceof Error && err.message
          ? err.message
          : 'Não consegui ler a imagem. Tente uma foto mais nítida e bem enquadrada.'
      )
      setFase('idle')
    }
  }, [lerXml, lerPdf, montarRevisao])

  const setCampo = (i: number, patch: Partial<CampoExtraido>) =>
    setCampos((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const removerCampo = (i: number) => setCampos((cs) => cs.filter((_, idx) => idx !== i))
  const adicionarCampo = () => setCampos((cs) => [...cs, { campo: '', valor: '' }])

  /**
   * Numa DANFE o total não é palpite: é o campo "Valor total da nota". Só fora
   * dela vale o chute do maior valor da planilha — e mesmo aqui a leitura sai
   * dos campos EDITADOS, para o total acompanhar as correções do usuário.
   */
  const totalDetectado = (() => {
    if (danfe) {
      const t = parseMoneyToNumber(campos.find((c) => c.campo === 'Valor total da nota')?.valor ?? '')
      if (t != null) return t
    }
    const nums = campos
      .map((c) => parseMoneyToNumber(c.valor))
      .filter((n): n is number => n != null)
    return nums.length ? Math.max(...nums) : null
  })()

  const salvar = useCallback(async () => {
    if (!nome.trim()) { setErro('Dê um nome ao documento.'); return }
    setSalvando(true); setErro(null)
    try {
      const res = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), imagem, textoBruto: texto, campos, total: totalDetectado }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Falha ao salvar')
      }
      // recarrega a lista
      const lista = await fetch('/api/documentos').then((r) => r.json())
      setDocs(lista)
      resetCaptura()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }, [nome, imagem, texto, campos, totalDetectado, resetCaptura])

  const abrirDetalhe = useCallback(async (id: string) => {
    try {
      const d = await fetch(`/api/documentos/${id}`).then((r) => r.json())
      setDetalhe(d)
    } catch { /* ignore */ }
  }, [])

  const excluir = useCallback(async (id: string) => {
    if (!confirm('Excluir este documento?')) return
    await fetch(`/api/documentos/${id}`, { method: 'DELETE' })
    setDocs((ds) => ds.filter((d) => d.id !== id))
    setDetalhe((d) => (d && d.id === id ? null : d))
  }, [])

  return (
    <div>
      {/* Dois inputs: um abre a câmera direto (capture), o outro o gerenciador
          de arquivos — no celular, um input com capture não deixa escolher um
          PDF ou XML já salvo no aparelho. */}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPickFile}
        style={{ display: 'none' }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,.pdf,text/xml,application/xml,.xml"
        onChange={onPickFile}
        style={{ display: 'none' }}
      />

      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leitor de Documentos</h1>
          <p className="page-subtitle">
            Fotografe uma nota fiscal, recibo ou romaneio — ou envie o XML/PDF da NF-e.
            O app lê os campos e monta uma planilha com a foto anexada.
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => camRef.current?.click()} disabled={fase === 'lendo'}>
            <FontAwesomeIcon icon={faCamera} /> Fotografar
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={fase === 'lendo'}>
            <FontAwesomeIcon icon={faFileArrowUp} /> Enviar arquivo
          </button>
        </div>
      </div>

      {/* Área de captura / revisão */}
      {fase !== 'idle' && (
        <div className="meta-card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div className="meta-card-header">
            <span className="meta-card-title">
              {fase === 'lendo' ? 'Lendo o documento…' : 'Confira os valores extraídos'}
            </span>
            <button className="btn-secondary" onClick={resetCaptura}>
              <FontAwesomeIcon icon={faXmark} /> Cancelar
            </button>
          </div>

          <div className="meta-card-body">
            {/* Faixa da NF-e: só aparece quando o documento foi reconhecido como
                DANFE. Verde = a chave fechou o dígito verificador, então número,
                série e emitente saíram dela e estão conferidos. Âmbar = a chave
                não fechou; os campos batem com os impressos, mas pedem olhada. */}
            {fase === 'revisao' && danfe?.chave && (
              <div style={{
                background: danfe.conferencia === 'dv' ? '#F0F7EF' : '#FFF8E6',
                border: `1px solid ${danfe.conferencia === 'dv' ? GREEN : '#E8B800'}`,
                borderRadius: 8, padding: 12, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: NAVY, fontWeight: 700, fontSize: 14, flexWrap: 'wrap' }}>
                  <FontAwesomeIcon
                    icon={danfe.conferencia === 'dv' ? faShieldHalved : faTriangleExclamation}
                    style={{ color: danfe.conferencia === 'dv' ? GREEN : '#E8B800' }}
                  />
                  {danfe.chave.modeloNome} nº {danfe.chave.numero} · série {Number(danfe.chave.serie)} · {danfe.chave.uf}
                  {origem === 'xml' && <span style={{ fontWeight: 600, color: GREEN }}>· lido do XML (exato)</span>}
                  {origem === 'pdf' && <span style={{ fontWeight: 600, color: GREEN }}>· lido do PDF</span>}
                </div>
                <div style={{ fontSize: 12, color: '#65676B', marginTop: 6, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {danfe.chave.chave.replace(/(\d{4})(?=\d)/g, '$1 ').trim()}
                </div>
                <div style={{ fontSize: 12, color: '#65676B', marginTop: 4 }}>
                  {danfe.conferencia === 'dv'
                    ? 'Chave conferida pelo dígito verificador — emitente, número, série e competência vieram dela.'
                    : 'Chave não fechou o dígito verificador, mas número, série e CNPJ conferem com os impressos na página. Confira a chave antes de usar.'}
                </div>
              </div>
            )}

            {/* Conferências que não fecharam — o usuário decide o que fazer. */}
            {fase === 'revisao' && !!danfe?.avisos.length && (
              <div style={{ background: '#FFF8E6', border: '1px solid #E8B800', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8A6D00', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Confira estes pontos
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#65676B', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {danfe.avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            <div className="grid-2-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              {/* Foto */}
              <div>
                {imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagem} alt="documento" style={{ width: '100%', borderRadius: 8, border: '1px solid #E4E6EB' }} />
                ) : (
                  <div style={{ minHeight: 200, borderRadius: 8, background: '#F0F2F5', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', color: '#8A8D91', padding: 20, textAlign: 'center' }}>
                    <FontAwesomeIcon icon={origem === 'xml' ? faFileCode : origem === 'pdf' ? faFilePdf : faImage} size="2x" />
                    {fase === 'revisao' && origem !== 'foto' && (
                      <span style={{ fontSize: 13 }}>
                        Documento lido do arquivo {origem === 'xml' ? 'XML' : 'PDF'} — sem foto anexada.
                        Se quiser guardar a nota em papel junto, fotografe pelo botão <strong>Fotografar</strong>.
                      </span>
                    )}
                  </div>
                )}

                {fase === 'lendo' && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: NAVY, fontSize: 14, fontWeight: 600 }}>
                      <FontAwesomeIcon icon={faSpinner} spin /> Reconhecendo texto… {progresso}%
                    </div>
                    <div style={{ height: 6, background: '#E4E6EB', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progresso}%`, background: GREEN, transition: 'width 0.2s' }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#8A8D91', marginTop: 6 }}>
                      A leitura acontece no seu aparelho — nenhuma foto é enviada para fora.
                    </p>
                  </div>
                )}
              </div>

              {/* Campos extraídos (editáveis) */}
              {fase === 'revisao' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Nome do documento
                  </label>
                  <input
                    className="meta-input"
                    style={{ marginTop: 6, marginBottom: 14 }}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Nota Sítio São João — 12/07"
                  />

                  {/* Escape para quando a leitura não reconhecer a nota. O OCR
                      já rodou; reinterpretar as mesmas palavras é instantâneo,
                      então não custa nada oferecer o botão. */}
                  {!danfe && palavras.length > 0 && (
                    <div style={{ background: '#F0F2F5', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: '#65676B' }}>
                      Não reconheci como nota fiscal — a planilha abaixo veio da leitura genérica.
                      <button
                        className="btn-secondary"
                        style={{ marginLeft: 8, padding: '4px 10px', fontSize: 12 }}
                        onClick={() => montarRevisao(palavras, 'Documento', true)}
                      >
                        <FontAwesomeIcon icon={faShieldHalved} /> Ler como nota fiscal
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="meta-section-header" style={{ margin: 0 }}>Planilha extraída</span>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={adicionarCampo}>
                      <FontAwesomeIcon icon={faPlus} /> Linha
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                    {campos.map((c, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                        <input className="meta-input" value={c.campo} onChange={(e) => setCampo(i, { campo: e.target.value })} placeholder="Campo" />
                        <input className="meta-input" value={c.valor} onChange={(e) => setCampo(i, { valor: e.target.value })} placeholder="Valor" />
                        <button
                          onClick={() => removerCampo(i)}
                          title="Remover linha"
                          style={{ border: 'none', background: 'none', color: PINK, cursor: 'pointer', padding: 6 }}
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    ))}
                    {campos.length === 0 && (
                      <p style={{ color: '#8A8D91', fontSize: 13 }}>Nenhum valor detectado — adicione as linhas manualmente.</p>
                    )}
                  </div>

                  {totalDetectado != null && (
                    <p style={{ fontSize: 13, color: '#65676B', marginTop: 10 }}>
                      Maior valor detectado: <strong style={{ color: GREEN }}>{fmtBRL(totalDetectado)}</strong>
                    </p>
                  )}

                  {erro && <p style={{ color: PINK, fontSize: 13, marginTop: 10 }}>{erro}</p>}

                  {/* Quando um campo sai errado, a pergunta é sempre a mesma: o
                      OCR leu mal ou o parser interpretou mal? Sem ver o texto
                      cru não dá para saber, e ficar adivinhando custa uma
                      viagem inteira de foto + leitura a cada tentativa. */}
                  {!!texto && (
                    <details style={{ marginTop: 14 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 13, color: '#65676B', fontWeight: 600 }}>
                        Ver o texto lido pelo OCR ({texto.split('\n').length} linhas)
                      </summary>
                      <pre style={{
                        marginTop: 8, maxHeight: 240, overflow: 'auto', background: '#F0F2F5',
                        borderRadius: 8, padding: 10, fontSize: 11, lineHeight: 1.5,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1C1E21',
                      }}>{texto}</pre>
                      <button
                        className="btn-secondary"
                        style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }}
                        onClick={() => navigator.clipboard?.writeText(texto)}
                      >
                        <FontAwesomeIcon icon={faFileLines} /> Copiar texto
                      </button>
                    </details>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn-primary" onClick={salvar} disabled={salvando}>
                      <FontAwesomeIcon icon={salvando ? faSpinner : faCheck} spin={salvando} /> Salvar planilha
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {erro && fase === 'idle' && (
        <div className="meta-card" style={{ padding: 14, marginBottom: 16, color: PINK, fontSize: 14 }}>{erro}</div>
      )}

      {/* Lista de documentos salvos */}
      <div className="meta-card">
        <div className="meta-card-header">
          <span className="meta-card-title">
            <FontAwesomeIcon icon={faTableList} style={{ color: GREEN, marginRight: 8 }} />
            Documentos salvos ({docs.length})
          </span>
        </div>

        {docs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8A8D91' }}>
            <FontAwesomeIcon icon={faFileLines} size="2x" style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum documento ainda. Toque em <strong>Fotografar / Enviar</strong> para começar.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="meta-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Campos</th>
                  <th>Maior valor</th>
                  <th>Data</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, color: NAVY }}>{d.nome}</td>
                    <td>{d.campos.length}</td>
                    <td>{fmtBRL(d.total)}</td>
                    <td>{fmtData(d.criadoEm)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-secondary" style={{ padding: '5px 10px', marginRight: 6 }} onClick={() => abrirDetalhe(d.id)}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} /> Ver
                      </button>
                      <a className="btn-secondary" style={{ padding: '5px 10px', marginRight: 6 }} href={`/api/documentos/${d.id}/export`}>
                        <FontAwesomeIcon icon={faDownload} /> CSV
                      </a>
                      <a
                        className="btn-secondary"
                        style={{ padding: '5px 10px', marginRight: 6 }}
                        href={`/api/documentos/${d.id}/export?formato=html`}
                        title="Planilha com a foto do documento anexada, num arquivo só"
                      >
                        <FontAwesomeIcon icon={faImage} /> Com foto
                      </a>
                      <button className="btn-secondary" style={{ padding: '5px 10px', color: PINK }} onClick={() => excluir(d.id)}>
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalhe */}
      {detalhe && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDetalhe(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="meta-card-header">
              <span className="meta-card-title">{detalhe.nome}</span>
              <button className="btn-secondary" onClick={() => setDetalhe(null)}><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto' }}>
              <div className="grid-2-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  {detalhe.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detalhe.imagem} alt={detalhe.nome} style={{ width: '100%', borderRadius: 8, border: '1px solid #E4E6EB' }} />
                  ) : (
                    <div style={{ color: '#8A8D91', fontSize: 13 }}>Sem imagem.</div>
                  )}
                </div>
                <div>
                  <table className="meta-table">
                    <thead><tr><th>Campo</th><th>Valor</th></tr></thead>
                    <tbody>
                      {detalhe.campos.map((c, i) => (
                        <tr key={i}><td style={{ color: '#65676B' }}>{c.campo}</td><td style={{ fontWeight: 600 }}>{c.valor}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <a className="btn-primary" href={`/api/documentos/${detalhe.id}/export?formato=html`}>
                  <FontAwesomeIcon icon={faImage} /> Baixar com a foto
                </a>
                <a className="btn-secondary" href={`/api/documentos/${detalhe.id}/export`}>
                  <FontAwesomeIcon icon={faDownload} /> Só a planilha (CSV)
                </a>
                <button className="btn-secondary" style={{ color: PINK }} onClick={() => excluir(detalhe.id)}>
                  <FontAwesomeIcon icon={faTrashCan} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
