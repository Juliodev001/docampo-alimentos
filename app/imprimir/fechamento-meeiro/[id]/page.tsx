'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

type Vale = { id: string; valor: number; data: string; observacao: string | null; status: string }
type Parceiro = { id: string; nome: string; cpf: string | null; percentual: number; produtor: { nome: string; codigo: string | null } }
type Fechamento = {
  parceiro: Parceiro
  dataInicio: string; dataFim: string; dataPagamento: string
  valorBruto: number
  combustivel: number; bandejaEmbalagem: number; valesDinheiro: number
  creditos: number; debitosAnteriores: number
  valesDeduzidos: number; valorPago: number
  status: string; observacao: string | null
  vales: Vale[]
}

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }

export default function ImprimirFechamentoMeeiro() {
  const { id } = useParams<{ id: string }>()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const printed = useRef(false)

  useEffect(() => {
    fetch(`/api/fechamento-meeiro/${id}`).then(r => r.json()).then(setFechamento)
  }, [id])

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
    bandejaEmbalagem, valesDinheiro,
    valesDeduzidos, valorPago, vales,
  } = fechamento
  const valesDescontados = vales.filter(v => v.status === 'DESCONTADO')

  const B: React.CSSProperties = { border: '1px solid #000' }
  const cell: React.CSSProperties = { ...B, padding: '3px 6px', fontSize: 11 }
  const hd: React.CSSProperties = { ...B, padding: '4px 6px', fontSize: 11, fontWeight: 700, backgroundColor: '#f0f0f0', textAlign: 'center' as const }

  return (
    <>
      <style>{`
        @page { margin: 12mm 14mm; size: A4; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #000; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 750, margin: '0 auto', padding: '20px 0', fontFamily: 'Arial, sans-serif', fontSize: 12 }}>

        {/* Marca d'água */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo01.png" alt="" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 480, opacity: 0.3, zIndex: -1, pointerEvents: 'none' }} />

        <div className="no-print" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#2d3561', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={() => window.close()} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo01.png" alt="Do Campo Alimentos" style={{ height: 44, margin: '0 auto 6px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textTransform: 'uppercase' }}>
            Fechamento de Pagamento — Meeiro
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
          <span>Período de <strong>{fmtDate(dataInicio)}</strong> a <strong>{fmtDate(dataFim)}</strong></span>
          <span>Pagamento em <strong>{fmtDate(dataPagamento)}</strong></span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '40%' }}><strong>Meeiro:</strong> {parceiro.nome}</td>
              <td style={{ ...cell, width: '40%' }}><strong>Produtor:</strong> {parceiro.produtor.codigo ? `${parceiro.produtor.codigo} — ` : ''}{parceiro.produtor.nome}</td>
              <td style={{ ...cell, width: '20%' }}><strong>Part.:</strong> {parceiro.percentual.toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>

        {valesDescontados.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
            <thead>
              <tr>
                <th style={hd}>Data</th>
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

        <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
          <tbody>
            <tr>
              <td style={{ ...cell }}>Valor Bruto (saldo no fechamento)</td>
              <td style={{ ...cell, textAlign: 'right' as const, width: 110 }}>{fmtN(valorBruto)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Percentual (Part.)</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{parceiro.percentual.toFixed(0)}%</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Embalagem</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(bandejaEmbalagem)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Vales em Dinheiro</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(valesDinheiro + valesDeduzidos)}</td>
            </tr>
            <tr>
              <td style={{ ...cell, fontWeight: 700, fontSize: 13 }}>Valor Líquido Pago</td>
              <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 800, fontSize: 14 }}>{fmtN(valorPago)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
              <p style={{ fontSize: 10, margin: 0 }}>Assinatura do Meeiro</p>
              <p style={{ fontSize: 10, margin: '2px 0 0', color: '#555' }}>{parceiro.nome}</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
              <p style={{ fontSize: 10, margin: 0 }}>Responsável pela Empresa</p>
              <p style={{ fontSize: 10, margin: '2px 0 0', color: '#555' }}>Do Campo Alimentos</p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
