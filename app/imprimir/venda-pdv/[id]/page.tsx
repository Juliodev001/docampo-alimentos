'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { EMPRESA_NOME } from '@/lib/empresa'

type Item = { id: string; produto: string; unidade: string; quantidade: number; valorUnit: number; total: number }
type Cliente = { id: string; nome: string; cnpjCpf: string | null; telefone: string | null }
type Pedido = {
  id: string; data: string; formaPagamento: string | null; dataCobranca: string | null
  totalValor: number; observacao: string | null
  cliente: Cliente | null
  itens: Item[]
}

const NAVY = '#2d3561'

function fmtFormaPagamento(v: string | null) { return v === 'FIADO' ? 'Carteira' : (v ?? '—') }
function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function ImprimirVendaPDV() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const printed = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [emitidoEm] = useState(() => new Date())

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
      a.download = `comprovante-venda-${pedido?.cliente?.nome ?? 'cliente'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      window.open('whatsapp://', '_blank')
    } finally { setCapturing(false) }
  }

  useEffect(() => {
    fetch(`/api/pedidos/${id}`).then(r => r.json()).then(setPedido)
  }, [id])

  useEffect(() => {
    if (pedido && !printed.current) {
      printed.current = true
      setTimeout(() => window.print(), 400)
    }
  }, [pedido])

  if (!pedido) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Carregando...
    </div>
  )

  const isFiado = pedido.formaPagamento === 'FIADO'
  const B: React.CSSProperties = { border: '1px solid #000' }
  const cell: React.CSSProperties = { ...B, padding: '3px 6px', fontSize: 10 }
  const hd: React.CSSProperties = { ...B, padding: '5px 6px', fontSize: 10, fontWeight: 700, backgroundColor: NAVY, color: '#fff', textAlign: 'center' as const }
  const totHd: React.CSSProperties = { ...B, padding: '5px 6px', fontSize: 10, fontWeight: 700, backgroundColor: NAVY, color: '#fff', textAlign: 'center' as const }
  const totCell: React.CSSProperties = { ...B, padding: '7px 6px', fontSize: 12, textAlign: 'center' as const, fontWeight: 700 }

  function renderVia(label: string, assinatura: string) {
    return (
      <div key={label} style={{ padding: '8px 0', fontFamily: 'Arial, sans-serif', fontSize: 10, position: 'relative', breakInside: 'avoid' }}>

        {/* Marca d'água */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo01.png" alt="" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 220, opacity: 0.25, zIndex: -1, pointerEvents: 'none', filter: 'grayscale(100%)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo01.png" alt={EMPRESA_NOME} style={{ height: 24, display: 'block', filter: 'grayscale(100%)' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
              {isFiado ? 'Comprovante de Venda — Carteira' : 'Comprovante de Venda'}
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 4, padding: '1px 6px' }}>
              {label}
            </span>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, fontSize: 9 }}>
          <span>Emitido em: {fmtDateTime(emitidoEm)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10 }}>
          <span><strong>Vendedor:</strong> {EMPRESA_NOME}</span>
          <span><strong>Cliente:</strong> {pedido!.cliente?.nome ?? '—'}</span>
        </div>

        {/* Dados do cliente */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '55%' }}><strong>CPF / CNPJ:</strong> {pedido!.cliente?.cnpjCpf ?? '—'}</td>
              <td style={{ ...cell, width: '45%' }}><strong>Data da Compra:</strong> {fmtDate(pedido!.data)}</td>
            </tr>
            <tr>
              <td style={cell} colSpan={2}>
                {isFiado && pedido!.dataCobranca
                  ? <><strong>Vencimento:</strong> {fmtDate(pedido!.dataCobranca)}</>
                  : <><strong>Pagamento:</strong> {fmtFormaPagamento(pedido!.formaPagamento)}</>
                }
              </td>
            </tr>
          </tbody>
        </table>

        {/* Itens */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={hd}>Produto</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Qtde</th>
              <th style={hd}>Unid.</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Valor Unit.</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {pedido!.itens.map(it => (
              <tr key={it.id}>
                <td style={cell}>{it.produto}</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{it.quantidade}</td>
                <td style={{ ...cell, textAlign: 'center' as const }}>{it.unidade}</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>R$ {fmtN(it.valorUnit)}</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>R$ {fmtN(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={totHd}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...totCell, color: NAVY }}>R$ {fmtN(pedido!.totalValor)}</td>
            </tr>
          </tbody>
        </table>

        {pedido!.observacao && (
          <div style={{ marginBottom: 6, padding: '3px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 9 }}>
            <strong>Obs:</strong> {pedido!.observacao}
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, margin: '8px 0 16px' }}>
          Total líquido da venda: <span style={{ color: NAVY }}>R$ {fmtN(pedido!.totalValor)}</span>
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
        /* Mobile: recibo tem largura fixa; permite scroll horizontal na tela
           (nunca na impressão) para não ser cortado no celular. */
        @media screen and (max-width: 767px) { html, body { overflow-x: auto; } }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

        {/* Botões — só na tela */}
        <div className="no-print" style={{ margin: '10px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={{ padding: '7px 18px', background: '#2d3561', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
            {renderVia('VIA DO CLIENTE', 'Assinatura do Cliente')}
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #999', textAlign: 'center', margin: '4px 0' }}>
          <span style={{ position: 'relative', top: -8, background: '#fff', padding: '0 8px', fontSize: 12, color: '#999' }}>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
        </div>

        {renderVia('VIA DO VENDEDOR', 'Assinatura do Vendedor')}

      </div>
    </>
  )
}
