'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { EMPRESA_NOME } from '@/lib/empresa'

const NAVY = '#2d3561'

type Fechamento = {
  id: string
  dataInicio: string; dataFim: string; dataPagamento: string
  valorBruto: number; valorPago: number; status: string
  combustivel: number; bandejaEmbalagem: number; valesDinheiro: number
  creditos: number; debitosAnteriores: number; valesDeduzidos: number
  observacao: string | null
}
type Parceiro = {
  id: string; nome: string; cpf: string | null; telefone: string | null
  percentual: number; chavePix: string | null
  produtor: { nome: string; codigo: string | null }
}

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

/** Tudo que foi abatido do bruto do meeiro neste fechamento. */
function descontos(f: Fechamento) {
  return f.combustivel + f.bandejaEmbalagem + f.valesDinheiro
    + f.creditos + f.debitosAnteriores + f.valesDeduzidos
}

export default function RelatorioMeeiro() {
  const { parceiroId } = useParams<{ parceiroId: string }>()
  const searchParams = useSearchParams()
  const idsParam        = searchParams.get('fechamentoIds') ?? ''
  const dataInicioParam = searchParams.get('dataInicio') ?? ''
  const dataFimParam    = searchParams.get('dataFim') ?? ''

  const [data, setData] = useState<{ parceiro: Parceiro; fechamentos: Fechamento[] } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [emitidoEm] = useState(() => new Date())

  useEffect(() => {
    const p = new URLSearchParams()
    if (idsParam) {
      p.set('fechamentoIds', idsParam)
    } else if (dataInicioParam && dataFimParam) {
      p.set('dataInicio', dataInicioParam)
      p.set('dataFim', dataFimParam)
    }
    const qs = p.toString()
    fetch(`/api/relatorio-meeiro/${parceiroId}${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then(setData)
  }, [parceiroId, idsParam, dataInicioParam, dataFimParam])

  async function captureImage(): Promise<Blob> {
    const html2canvas = (await import('html2canvas-pro')).default
    const el = contentRef.current!
    const canvas = await html2canvas(el, {
      scale: 2, backgroundColor: '#ffffff', useCORS: true,
      width: el.scrollWidth, height: el.scrollHeight,
      windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
      scrollX: 0, scrollY: 0,
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
      a.download = `extrato-meeiro-${data?.parceiro.nome.replace(/\s+/g, '-').toLowerCase() ?? 'meeiro'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      window.open('whatsapp://', '_blank')
    } finally { setCapturing(false) }
  }

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Carregando...
    </div>
  )

  const { parceiro, fechamentos } = data
  const totalBruto     = fechamentos.reduce((s, f) => s + f.valorBruto, 0)
  const totalDescontos = fechamentos.reduce((s, f) => s + descontos(f), 0)
  const totalLiquido   = fechamentos.reduce((s, f) => s + f.valorPago, 0)
  const totalPendente  = fechamentos.filter(f => f.status !== 'PAGO').reduce((s, f) => s + f.valorPago, 0)

  const B: React.CSSProperties = { border: '1px solid #000' }
  const cell: React.CSSProperties = { ...B, padding: '3px 6px', fontSize: 11 }
  const hd: React.CSSProperties = { ...B, padding: '5px 6px', fontSize: 11, fontWeight: 700, backgroundColor: NAVY, color: '#fff', textAlign: 'center' as const }
  const totHd: React.CSSProperties = { ...B, padding: '6px 6px', fontSize: 11, fontWeight: 700, backgroundColor: NAVY, color: '#fff', textAlign: 'center' as const }
  const totCell: React.CSSProperties = { ...B, padding: '8px 6px', fontSize: 13, textAlign: 'center' as const, fontWeight: 700 }

  return (
    <>
      <style>{`
        @page { margin: 8mm 10mm; size: A5; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #000; }
        @media screen and (max-width: 767px) { html, body { overflow-x: auto; } }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

        <div className="no-print" style={{ margin: '10px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={handleWhatsApp} disabled={capturing} style={{ padding: '8px 14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: capturing ? 'wait' : 'pointer', opacity: capturing ? 0.7 : 1 }}>
            {capturing ? 'Gerando...' : '💬 Enviar WhatsApp'}
          </button>
          <button onClick={() => window.close()} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        <div ref={contentRef}>
        <div style={{ width: 480, padding: '10px 8px', fontSize: 10, position: 'relative' }}>

          {/* Marca d'água */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo01.png" alt="" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, opacity: 0.3, zIndex: -1, pointerEvents: 'none', filter: 'grayscale(100%)' }} />

          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo01.png" alt={EMPRESA_NOME} style={{ height: 32, margin: '0 auto 6px', display: 'block', filter: 'grayscale(100%)' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
              Extrato de Fechamentos do Meeiro
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, fontSize: 11 }}>
            <span>Emitido em: {fmtDateTime(emitidoEm)}</span>
          </div>
          <div style={{ marginBottom: 12, fontSize: 11 }}>
            Período: {
              idsParam
                ? `${fechamentos.length} fechamento(s) selecionado(s)`
                : dataInicioParam && dataFimParam
                  ? `${fmtDate(dataInicioParam)} a ${fmtDate(dataFimParam)}`
                  : 'não filtrado'
            }
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span><strong>Outorgante:</strong> {EMPRESA_NOME}</span>
            <span><strong>Outorgado:</strong> {parceiro.nome}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span><strong>CPF:</strong> {parceiro.cpf ?? '—'}</span>
            <span><strong>Telefone:</strong> {parceiro.telefone ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11 }}>
            <span><strong>Produtor:</strong> {parceiro.produtor.nome}</span>
            <span><strong>Percentual:</strong> {parceiro.percentual}%</span>
          </div>

          {fechamentos.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: 4 }}>
              Nenhum fechamento encontrado.
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                <thead>
                  <tr>
                    <th style={hd}>Período</th>
                    <th style={hd}>Pago em</th>
                    <th style={{ ...hd, textAlign: 'right' as const }}>Bruto</th>
                    <th style={{ ...hd, textAlign: 'right' as const }}>Descontos</th>
                    <th style={{ ...hd, textAlign: 'right' as const }}>Líquido</th>
                    <th style={hd}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fechamentos.map(f => (
                    <tr key={f.id}>
                      <td style={cell}>{fmtDate(f.dataInicio)} a {fmtDate(f.dataFim)}</td>
                      <td style={{ ...cell, textAlign: 'center' as const }}>{fmtDate(f.dataPagamento)}</td>
                      <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(f.valorBruto)}</td>
                      <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(descontos(f))}</td>
                      <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>{fmtN(f.valorPago)}</td>
                      <td style={{ ...cell, textAlign: 'center' as const, color: f.status === 'PAGO' ? '#166534' : '#854d0e', fontWeight: 700 }}>
                        {f.status === 'PAGO' ? 'Pago' : 'Pendente'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
                <thead>
                  <tr>
                    <th style={totHd}>Fechamentos</th>
                    <th style={totHd}>Bruto</th>
                    <th style={totHd}>Descontos</th>
                    <th style={totHd}>Pendente</th>
                    <th style={totHd}>Total Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={totCell}>{fechamentos.length}</td>
                    <td style={totCell}>{fmtN(totalBruto)}</td>
                    <td style={totCell}>{fmtN(totalDescontos)}</td>
                    <td style={totCell}>{fmtN(totalPendente)}</td>
                    <td style={{ ...totCell, color: NAVY }}>{fmtN(totalLiquido)}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 0' }}>
                Total líquido dos fechamentos: <span style={{ color: NAVY }}>{fmtN(totalLiquido)}</span>
              </p>
            </>
          )}

        </div>
        </div>{/* end contentRef */}
      </div>
    </>
  )
}
