'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#2d3561'

type Produto = { id: string; nome: string }
type Produtor = { id: string; nome: string; codigo: string | null; cpf: string | null }
type Parceiro = { id: string; nome: string; cpf: string | null; percentual: number; valorEmba: number; chavePix: string | null; produtor: Produtor }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null; bandeja: number; percParceiro: number
  roca: { nome: string } | null
}
type Data = { parceiro: Parceiro; colheitas: Colheita[] }

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function ImprimirMeeiro() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [valesAbertos, setValesAbertos] = useState(0)
  const printed = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [emitidoEm] = useState(() => new Date())

  async function captureImage(): Promise<Blob> {
    const html2canvas = (await import('html2canvas-pro')).default
    const el = contentRef.current!
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      width: el.scrollWidth,
      height: el.scrollHeight,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    })
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.95))
  }

  async function handleWhatsApp() {
    setCapturing(true)
    try {
      const blob = await captureImage()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-meeiro-${data?.parceiro.nome ?? 'parceiro'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      window.open('whatsapp://', '_blank')
    } finally { setCapturing(false) }
  }

  useEffect(() => {
    fetch(`/api/imprimir-meeiro/${id}`).then(r => r.json()).then(setData)
  }, [id])

  useEffect(() => {
    fetch(`/api/vales?parceiroId=${id}&status=ABERTO`)
      .then(r => r.json())
      .then((vs: { valor: number }[]) => setValesAbertos(vs.reduce((s, v) => s + Number(v.valor), 0)))
  }, [id])

  useEffect(() => {
    if (data && !printed.current) {
      printed.current = true
      setTimeout(() => window.print(), 400)
    }
  }, [data])

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Carregando...
    </div>
  )

  const { parceiro, colheitas } = data

  const totalQtd     = colheitas.reduce((s, c) => { const perc = (c.percParceiro ?? parceiro.percentual) / 100; return s + Math.round(c.quantidadeTotal * perc) }, 0)
  const valorRepasse = colheitas.reduce((s, c) => { const perc = (c.percParceiro ?? parceiro.percentual) / 100; return s + Math.round(c.quantidadeTotal * perc) * c.preco }, 0)
  const descEmba     = colheitas.reduce((s, c) => { const perc = (c.percParceiro ?? parceiro.percentual) / 100; return s + Math.round(c.quantidadeTotal * perc) * (c.bandeja ?? 0) }, 0)
  const abatimEmprestimo = 0
  const valorRecebido = valorRepasse - descEmba - abatimEmprestimo

  const dataInicio = colheitas.length > 0 ? fmtDate(colheitas[0].data) : '—'
  const dataFim    = colheitas.length > 0 ? fmtDate(colheitas[colheitas.length - 1].data) : '—'
  const rocas = Array.from(new Set(colheitas.map(c => c.roca?.nome).filter(Boolean))) as string[]

  const B: React.CSSProperties = { border: '1px solid #000' }
  const cell: React.CSSProperties = { ...B, padding: '3px 6px', fontSize: 11 }
  const hd: React.CSSProperties = { ...B, padding: '5px 6px', fontSize: 11, fontWeight: 700, backgroundColor: NAVY, color: '#fff', textAlign: 'center' as const }
  const totHd: React.CSSProperties = { ...B, padding: '6px 6px', fontSize: 11, fontWeight: 700, backgroundColor: NAVY, color: '#fff', textAlign: 'center' as const }
  const totCell: React.CSSProperties = { ...B, padding: '8px 6px', fontSize: 13, textAlign: 'center' as const, fontWeight: 700 }

  function renderVia(label: string, assinatura: string) {
    return (
      <div style={{ padding: '8px 0', fontFamily: 'Arial, sans-serif', fontSize: 10, position: 'relative', breakInside: 'avoid' }}>

        {/* Marca d'água */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo01.png" alt="" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 280, opacity: 0.25, zIndex: -1, pointerEvents: 'none', filter: 'grayscale(100%)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo01.png" alt="Do Campo Alimentos" style={{ height: 28, display: 'block', filter: 'grayscale(100%)' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Recibo de Repasse ao Parceiro</div>
            <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 4, padding: '1px 6px' }}>
              {label}
            </span>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, fontSize: 9 }}>
          <span>Emitido em: {fmtDateTime(emitidoEm)}</span>
        </div>

        <div style={{ marginBottom: 10, fontSize: 11 }}>
          Período: {colheitas.length > 0 ? `${dataInicio} a ${dataFim}` : 'não filtrado'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
          <span><strong>Outorgante:</strong> DO CAMPO ALIMENTOS</span>
          <span><strong>Outorgado:</strong> {parceiro.nome}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11 }}>
          <span><strong>Inscrição estadual:</strong> —</span>
          <span><strong>Roça:</strong> {rocas.length > 0 ? rocas.join(', ') : '—'} (Produtor: {parceiro.produtor.codigo ? `${parceiro.produtor.codigo} — ` : ''}{parceiro.produtor.nome})</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={hd}>Data</th>
              <th style={hd}>Nº Doc.</th>
              <th style={hd}>Quant.</th>
              <th style={hd}>Produto</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Preço</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Valor total</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Repasse</th>
            </tr>
          </thead>
          <tbody>
            {colheitas.length === 0 ? (
              <tr><td colSpan={7} style={{ ...cell, textAlign: 'center' as const, color: '#666' }}>Nenhum lançamento</td></tr>
            ) : colheitas.map(c => {
              const percShare = (c.percParceiro ?? parceiro.percentual) / 100
              const qtdParceiro = Math.round(c.quantidadeTotal * percShare)
              const subParceiro = qtdParceiro * c.preco
              const repasse = subParceiro
              return (
                <tr key={c.id}>
                  <td style={cell}>{fmtDate(c.data)}</td>
                  <td style={{ ...cell, textAlign: 'center' as const }}>{c.nrDoc ?? '—'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{qtdParceiro.toFixed(0)}</td>
                  <td style={cell}>{c.produto.nome}{c.qualidade ? ` — ${c.qualidade}` : ''}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(c.preco)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(subParceiro)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>{fmtN(repasse)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={totHd}>Total caixas</th>
              <th style={totHd}>Valor Repasse</th>
              <th style={totHd}>Desc Emb.</th>
              <th style={totHd}>Empr. em aberto</th>
              <th style={totHd}>Abatim. emprést.</th>
              <th style={totHd}>Valor recebido</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={totCell}>{totalQtd.toFixed(0)}</td>
              <td style={totCell}>{fmtN(valorRepasse)}</td>
              <td style={totCell}>{fmtN(descEmba)}</td>
              <td style={totCell}>{fmtN(valesAbertos)}</td>
              <td style={totCell}>{fmtN(abatimEmprestimo)}</td>
              <td style={{ ...totCell, color: NAVY }}>{fmtN(valorRecebido)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: 12, fontWeight: 700, margin: '10px 0 16px' }}>
          Total líquido a receber pelo parceiro: <span style={{ color: NAVY }}>{fmtN(valorRecebido)}</span>
        </p>

        <div style={{ marginTop: 18, fontSize: 10 }}>
          <div style={{ borderTop: '1px solid #000', width: '70%', margin: '0 auto' }} />
          <div style={{ textAlign: 'center', marginTop: 4 }}>{assinatura}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 8mm 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #000; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

        <div className="no-print" style={{ margin: '10px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={{ padding: '7px 18px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={handleWhatsApp} disabled={capturing} style={{ padding: '7px 14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: capturing ? 'wait' : 'pointer', opacity: capturing ? 0.7 : 1 }}>
            {capturing ? 'Gerando...' : '💬 Enviar WhatsApp'}
          </button>
          <button onClick={() => window.close()} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        <div ref={contentRef}>
          <div style={{ width: 700, padding: '0 8px' }}>
            {renderVia('VIA DO PARCEIRO', 'Assinatura do Parceiro')}
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #999', textAlign: 'center', margin: '4px 0' }}>
          <span style={{ position: 'relative', top: -8, background: '#fff', padding: '0 8px', fontSize: 12, color: '#999' }}>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
        </div>

        {renderVia('VIA DA EMPRESA', 'Assinatura do Parceiro')}

      </div>
    </>
  )
}
