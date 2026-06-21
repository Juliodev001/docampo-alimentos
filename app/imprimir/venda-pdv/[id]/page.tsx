'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

type Item = { id: string; produto: string; unidade: string; quantidade: number; valorUnit: number; total: number }
type Cliente = { id: string; nome: string; cnpjCpf: string | null; telefone: string | null }
type Pedido = {
  id: string; data: string; formaPagamento: string | null; dataCobranca: string | null
  totalValor: number; observacao: string | null
  cliente: Cliente | null
  itens: Item[]
}

const NAVY = '#2d3561'

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function ImprimirVendaPDV() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [usuario, setUsuario] = useState('')
  const printed = useRef(false)
  const [emitidoEm] = useState(() => new Date())

  useEffect(() => {
    fetch(`/api/pedidos/${id}`).then(r => r.json()).then(setPedido)
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => setUsuario(d?.name ?? ''))
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

  return (
    <>
      <style>{`
        @page { size: A5 portrait; margin: 8mm 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #000; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '10px 0', fontFamily: 'Arial, sans-serif', fontSize: 10, position: 'relative' }}>

        {/* Marca d'água */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo01.png" alt="" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, opacity: 0.3, zIndex: -1, pointerEvents: 'none', filter: 'grayscale(100%)' }} />

        {/* Botões — só na tela */}
        <div className="no-print" style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '7px 18px', background: '#2d3561', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={() => window.close()} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo01.png" alt="Do Campo Alimentos" style={{ height: 30, margin: '0 auto 6px', display: 'block', filter: 'grayscale(100%)' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
            {isFiado ? 'Comprovante de Venda — Fiado' : 'Comprovante de Venda'}
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
          <span>Usuário: {usuario || '—'}</span>
          <span>Emitido em: {fmtDateTime(emitidoEm)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 10 }}>
          <span><strong>Vendedor:</strong> DO CAMPO ALIMENTOS</span>
          <span><strong>Cliente:</strong> {pedido.cliente?.nome ?? '—'}</span>
        </div>

        {/* Dados do cliente */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '55%' }}><strong>CPF / CNPJ:</strong> {pedido.cliente?.cnpjCpf ?? '—'}</td>
              <td style={{ ...cell, width: '45%' }}><strong>Data da Compra:</strong> {fmtDate(pedido.data)}</td>
            </tr>
            <tr>
              <td style={cell} colSpan={2}>
                {isFiado && pedido.dataCobranca
                  ? <><strong>Vencimento:</strong> {fmtDate(pedido.dataCobranca)}</>
                  : <><strong>Pagamento:</strong> {pedido.formaPagamento ?? '—'}</>
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
            {pedido.itens.map(it => (
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
              <td style={{ ...totCell, color: NAVY }}>R$ {fmtN(pedido.totalValor)}</td>
            </tr>
          </tbody>
        </table>

        {pedido.observacao && (
          <div style={{ marginTop: 6, padding: '3px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 9 }}>
            <strong>Obs:</strong> {pedido.observacao}
          </div>
        )}

        <p style={{ fontSize: 12, fontWeight: 700, margin: '14px 0 0' }}>
          Total líquido da venda: <span style={{ color: NAVY }}>R$ {fmtN(pedido.totalValor)}</span>
        </p>

      </div>
    </>
  )
}
