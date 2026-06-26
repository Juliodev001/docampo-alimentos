'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#2d3561'

type Vale = { id: string; valor: number; data: string; observacao: string | null; status: string }
type Produto = { id: string; nome: string }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; percParceiro: number; nrDoc: string | null
  roca: { nome: string } | null
}
type Parceiro = { id: string; nome: string; cpf: string | null; percentual: number; produtor: { nome: string; codigo: string | null; inscricaoEstadual: string | null } }
type Fechamento = {
  parceiro: Parceiro
  dataInicio: string; dataFim: string; dataPagamento: string
  valorBruto: number
  combustivel: number; bandejaEmbalagem: number; valesDinheiro: number
  creditos: number; debitosAnteriores: number
  valesDeduzidos: number; valorPago: number
  status: string; observacao: string | null
  vales: Vale[]
  colheitas: Colheita[]
}

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function ImprimirFechamentoMeeiro() {
  const { id } = useParams<{ id: string }>()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [valesAbertos, setValesAbertos] = useState(0)
  const printed = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [emitidoEm] = useState(() => new Date())

  async function captureImage(): Promise<Blob> {
    const html2canvas = (await import('html2canvas-pro')).default
    const canvas = await html2canvas(contentRef.current!, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.95))
  }

  async function handleSaveJpeg() {
    setCapturing(true)
    try {
      const blob = await captureImage()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-meeiro-${fechamento?.parceiro.nome ?? 'parceiro'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setCapturing(false) }
  }

  async function handleWhatsApp() {
    setCapturing(true)
    try {
      const blob = await captureImage()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-meeiro-${fechamento?.parceiro.nome ?? 'parceiro'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      window.open('https://web.whatsapp.com/', '_blank')
    } finally { setCapturing(false) }
  }

  useEffect(() => {
    fetch(`/api/fechamento-meeiro/${id}`).then(r => r.json()).then(setFechamento)
  }, [id])

  useEffect(() => {
    if (!fechamento?.parceiro.id) return
    fetch(`/api/vales?parceiroId=${fechamento.parceiro.id}&status=ABERTO`)
      .then(r => r.json())
      .then((vs: { valor: number }[]) => setValesAbertos(vs.reduce((s, v) => s + Number(v.valor), 0)))
  }, [fechamento?.parceiro.id])

  useEffect(() => {
    if (fechamento && !printed.current) {
      printed.current = true
      setTimeout(() => window.print(), 400)
    }
  }, [fechamento])

  if (!fechamento) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Carregando...
    </div>
  )

  const {
    parceiro, dataInicio, dataFim, dataPagamento, valorBruto,
    combustivel, bandejaEmbalagem, valesDinheiro, creditos, debitosAnteriores,
    valesDeduzidos, valorPago, vales, colheitas,
  } = fechamento
  const valesDescontados = vales.filter(v => v.status === 'DESCONTADO')
  const outrasDeducoes = combustivel + valesDinheiro + creditos + debitosAnteriores
  const totalQtd = colheitas.reduce((s, c) => s + c.quantidadeTotal, 0)
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
          Período: {fmtDate(dataInicio)} a {fmtDate(dataFim)} — Pagamento em {fmtDate(dataPagamento)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
          <span><strong>Outorgante:</strong> DO CAMPO ALIMENTOS</span>
          <span><strong>Outorgado:</strong> {parceiro.nome}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11 }}>
          <span><strong>Inscrição estadual:</strong> {parceiro.produtor.inscricaoEstadual ?? '—'}</span>
          <span><strong>Roça:</strong> {rocas.length > 0 ? rocas.join(', ') : '—'} (Produtor: {parceiro.produtor.codigo ? `${parceiro.produtor.codigo} — ` : ''}{parceiro.produtor.nome})</span>
        </div>

        {colheitas.length > 0 && (
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
              {colheitas.map(c => {
                const liquido = c.quantidadeTotal
                const sub = liquido * c.preco
                const repasse = sub * (c.percParceiro / 100)
                return (
                  <tr key={c.id}>
                    <td style={cell}>{fmtDate(c.data)}</td>
                    <td style={{ ...cell, textAlign: 'center' as const }}>{c.nrDoc ?? '—'}</td>
                    <td style={{ ...cell, textAlign: 'right' as const }}>{liquido.toFixed(0)}</td>
                    <td style={cell}>{c.produto.nome}{c.qualidade ? ` — ${c.qualidade}` : ''}</td>
                    <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(c.preco)}</td>
                    <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(sub)}</td>
                    <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>{fmtN(repasse)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {valesDescontados.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={hd}>Vale — Data</th>
                <th style={hd}>Observação</th>
                <th style={{ ...hd, textAlign: 'right' as const }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {valesDescontados.map(v => (
                <tr key={v.id}>
                  <td style={cell}>{fmtDate(v.data)}</td>
                  <td style={cell}>{v.observacao ?? '—'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(v.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

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
              <td style={totCell}>{fmtN(valorBruto)}</td>
              <td style={totCell}>{fmtN(bandejaEmbalagem)}</td>
              <td style={totCell}>{fmtN(valesAbertos)}</td>
              <td style={totCell}>{fmtN(valesDeduzidos)}</td>
              <td style={{ ...totCell, color: NAVY }}>{fmtN(valorPago)}</td>
            </tr>
          </tbody>
        </table>

        {outrasDeducoes > 0 && (
          <p style={{ fontSize: 10, color: '#555', margin: '0 0 8px' }}>
            Outras deduções (combustível, vales de dinheiro, créditos, débitos anteriores) já incluídas no valor recebido: - {fmtN(outrasDeducoes)}
          </p>
        )}

        <p style={{ fontSize: 12, fontWeight: 700, margin: '10px 0 16px' }}>
          Total líquido a receber pelo parceiro: <span style={{ color: NAVY }}>{fmtN(valorPago)}</span>
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
          <button onClick={handleSaveJpeg} disabled={capturing} style={{ padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: capturing ? 'wait' : 'pointer', opacity: capturing ? 0.7 : 1 }}>
            {capturing ? 'Gerando...' : '📷 Salvar como imagem'}
          </button>
          <button onClick={handleWhatsApp} disabled={capturing} style={{ padding: '7px 14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: capturing ? 'wait' : 'pointer', opacity: capturing ? 0.7 : 1 }}>
            {capturing ? 'Gerando...' : '💬 Enviar WhatsApp'}
          </button>
          <button onClick={() => window.close()} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        <div ref={contentRef}>
          {renderVia('VIA DO PARCEIRO', 'Assinatura do Parceiro')}

          <div style={{ borderTop: '1px dashed #999', textAlign: 'center', margin: '4px 0' }}>
            <span style={{ position: 'relative', top: -8, background: '#fff', padding: '0 8px', fontSize: 12, color: '#999' }}>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
          </div>

          {renderVia('VIA DA EMPRESA', 'Assinatura do Parceiro')}
        </div>

      </div>
    </>
  )
}
