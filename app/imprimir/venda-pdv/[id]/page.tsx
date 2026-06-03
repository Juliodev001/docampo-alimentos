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

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function ImprimirVendaPDV() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const printed = useRef(false)

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
  const hd: React.CSSProperties = { ...B, padding: '4px 6px', fontSize: 10, fontWeight: 700, backgroundColor: '#f0f0f0', textAlign: 'center' as const }

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #000; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '10px 0', fontFamily: 'Arial, sans-serif', fontSize: 11 }}>

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
        <div style={{ textAlign: 'center', marginBottom: 7 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textDecoration: 'underline', textTransform: 'uppercase' }}>
            {isFiado ? 'Comprovante de Venda — Fiado' : 'Comprovante de Venda'}
          </div>
        </div>

        {/* Dados do cliente */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '55%' }}><strong>Cliente:</strong> {pedido.cliente?.nome ?? '—'}</td>
              <td style={{ ...cell, width: '45%' }}><strong>CPF / CNPJ:</strong> {pedido.cliente?.cnpjCpf ?? '—'}</td>
            </tr>
            <tr>
              <td style={cell}><strong>Data da Compra:</strong> {fmtDate(pedido.data)}</td>
              <td style={cell}>
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
        <table style={{ borderCollapse: 'collapse', minWidth: 220, marginLeft: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ ...cell, fontWeight: 700, fontSize: 11 }}>Total</td>
              <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 800, fontSize: 12, width: 100 }}>
                R$ {fmtN(pedido.totalValor)}
              </td>
            </tr>
          </tbody>
        </table>

        {pedido.observacao && (
          <div style={{ marginTop: 6, padding: '3px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 9 }}>
            <strong>Obs:</strong> {pedido.observacao}
          </div>
        )}

        {/* Assinaturas */}
        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: 3 }}>
              <p style={{ fontSize: 9, margin: 0 }}>Assinatura do Cliente</p>
              <p style={{ fontSize: 9, margin: '2px 0 0', color: '#555' }}>{pedido.cliente?.nome ?? ''}</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: 3 }}>
              <p style={{ fontSize: 9, margin: 0 }}>Responsável pela Empresa</p>
              <p style={{ fontSize: 9, margin: '2px 0 0', color: '#555' }}>Do Campo Alimentos</p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
