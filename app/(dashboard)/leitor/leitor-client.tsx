'use client'

import { useCallback, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCamera, faImage, faTrashCan, faDownload, faPlus, faXmark,
  faSpinner, faTableList, faCheck, faFileLines, faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'
import { extrairCampos, parseMoneyToNumber, type CampoExtraido } from '@/lib/ocr-parse'

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

/** Reduz a foto para caber no banco e acelerar o OCR (máx. 1500px, JPEG). */
function reduzirImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1500
        let { width, height } = img
        if (width > MAX || height > MAX) {
          const r = Math.min(MAX / width, MAX / height)
          width = Math.round(width * r)
          height = Math.round(height * r)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function LeitorClient({ documentosIniciais }: { documentosIniciais: DocLista[] }) {
  const [docs, setDocs] = useState<DocLista[]>(documentosIniciais)
  const fileRef = useRef<HTMLInputElement>(null)

  // ---- Fluxo de captura ----
  const [imagem, setImagem] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [campos, setCampos] = useState<CampoExtraido[]>([])
  const [nome, setNome] = useState('')
  const [fase, setFase] = useState<'idle' | 'lendo' | 'revisao'>('idle')
  const [progresso, setProgresso] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // ---- Detalhe ----
  const [detalhe, setDetalhe] = useState<DocDetalhe | null>(null)

  const resetCaptura = useCallback(() => {
    setImagem(null); setTexto(''); setCampos([]); setNome(''); setFase('idle')
    setProgresso(0); setErro(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const onPickFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    setFase('lendo')
    setProgresso(0)
    try {
      const dataUrl = await reduzirImagem(file)
      setImagem(dataUrl)

      const { default: Tesseract } = await import('tesseract.js')
      // Motor, núcleo WASM e idioma são servidos pelo PRÓPRIO site (public/tesseract),
      // não por um CDN externo — assim funciona em qualquer celular e sem depender
      // de terceiros. Ver public/tesseract/ (copiado no build) e README abaixo.
      const { data } = await Tesseract.recognize(dataUrl, 'por', {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract',
        langPath: '/tesseract/lang',
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgresso(Math.round(m.progress * 100))
          }
        },
      })
      const txt = data.text ?? ''
      setTexto(txt)
      const { campos: extraidos } = extrairCampos(txt)
      setCampos(extraidos)
      // sugere um nome padrão com a data de hoje
      setNome(`Documento ${new Date().toLocaleDateString('pt-BR')}`)
      setFase('revisao')
    } catch (err) {
      console.error(err)
      setErro('Não consegui ler a imagem. Tente uma foto mais nítida e bem enquadrada.')
      setFase('idle')
    }
  }, [])

  const setCampo = (i: number, patch: Partial<CampoExtraido>) =>
    setCampos((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const removerCampo = (i: number) => setCampos((cs) => cs.filter((_, idx) => idx !== i))
  const adicionarCampo = () => setCampos((cs) => [...cs, { campo: '', valor: '' }])

  const totalDetectado = (() => {
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
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPickFile}
        style={{ display: 'none' }}
      />

      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leitor de Documentos</h1>
          <p className="page-subtitle">
            Fotografe uma nota, recibo ou romaneio pelo celular — o app lê os valores e monta uma planilha.
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={fase === 'lendo'}>
            <FontAwesomeIcon icon={faCamera} /> Fotografar / Enviar
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
            <div className="grid-2-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              {/* Foto */}
              <div>
                {imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagem} alt="documento" style={{ width: '100%', borderRadius: 8, border: '1px solid #E4E6EB' }} />
                ) : (
                  <div style={{ height: 200, borderRadius: 8, background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8D91' }}>
                    <FontAwesomeIcon icon={faImage} size="2x" />
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
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <a className="btn-primary" href={`/api/documentos/${detalhe.id}/export`}>
                  <FontAwesomeIcon icon={faDownload} /> Baixar planilha (CSV)
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
