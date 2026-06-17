'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

type Produto = { id: string; nome: string }
type Produtor = { id: string; nome: string; codigo: string | null; cpf: string | null }
type Parceiro = { id: string; nome: string; cpf: string | null; percentual: number; valorEmba: number; chavePix: string | null; produtor: Produtor }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null; bandeja: number
}
type Data = { parceiro: Parceiro; colheitas: Colheita[] }

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }

export default function ImprimirMeeiro() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Data | null>(null)
  const printed = useRef(false)

  useEffect(() => {
    fetch(`/api/imprimir-meeiro/${id}`).then(r => r.json()).then(setData)
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
  const hoje = new Date().toLocaleDateString('pt-BR')

  const totalBruto   = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalQtd     = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const bruteMeeiro  = totalBruto * (parceiro.percentual / 100)       // 40% do bruto — sem desconto
  const descEmba     = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * (c.bandeja ?? 0), 0) // desconto embalagem
  const aReceber     = bruteMeeiro - descEmba                         // valor líquido a receber

  const dataInicio = colheitas.length > 0 ? fmtDate(colheitas[0].data) : '—'
  const dataFim    = colheitas.length > 0 ? fmtDate(colheitas[colheitas.length - 1].data) : '—'

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

        {/* Botões — só na tela */}
        <div className="no-print" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#2d3561', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={() => window.close()} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textTransform: 'uppercase' }}>
            Pagamento de Meeiros
          </div>
        </div>

        {/* Período e data */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
          <span>Período de <strong>{dataInicio}</strong> a <strong>{dataFim}</strong></span>
          <span>Emitido em <strong>{hoje}</strong></span>
        </div>

        {/* Dados do meeiro */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '50%' }}>
                <strong>Meeiro:</strong> {parceiro.nome}
              </td>
              <td style={{ ...cell, width: '30%' }}>
                <strong>CPF:</strong> {parceiro.cpf ?? ''}
              </td>
              <td style={{ ...cell, width: '20%' }}>
                <strong>Part.:</strong> {parceiro.percentual.toFixed(0)}%
              </td>
            </tr>
            <tr>
              <td style={{ ...cell }} colSpan={3}>
                <strong>Produtor:</strong> {parceiro.produtor.codigo ? `${parceiro.produtor.codigo} — ` : ''}{parceiro.produtor.nome}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tabela de colheitas */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <thead>
            <tr>
              <th style={hd}>Data</th>
              <th style={hd}>Nº Doc.</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Quant.</th>
              <th style={hd}>Produto / Qualidade</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Embalagem</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Preço</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Sub-total</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Descarte</th>
            </tr>
          </thead>
          <tbody>
            {colheitas.length === 0 ? (
              <tr><td colSpan={8} style={{ ...cell, textAlign: 'center' as const, color: '#666' }}>Nenhum lançamento</td></tr>
            ) : colheitas.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const sub = liquido * c.preco
              return (
                <tr key={c.id}>
                  <td style={cell}>{fmtDate(c.data)}</td>
                  <td style={{ ...cell, textAlign: 'center' as const }}>{c.nrDoc ?? '0000'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{liquido.toFixed(0)}</td>
                  <td style={cell}>{c.produto.nome}{c.qualidade ? ` — ${c.qualidade}` : ''}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{c.bandeja > 0 ? fmtN(c.bandeja) : '—'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(c.preco)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(sub)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{c.descarte > 0 ? c.descarte.toFixed(0) : '0'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Resumo financeiro */}
        <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, fontWeight: 700, textAlign: 'right' as const }}>Total</td>
              <td style={{ ...cell, textAlign: 'right' as const, width: 110 }}>{fmtN(totalQtd)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Valor Bruto ({parceiro.percentual.toFixed(0)}%) — sem desconto</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(bruteMeeiro)}</td>
            </tr>
            {descEmba > 0 && (
              <tr>
                <td style={{ ...cell }}>Desconto Embalagem</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(descEmba)}</td>
              </tr>
            )}
            <tr>
              <td style={{ ...cell, fontWeight: 700, fontSize: 13 }}>
                A Receber ({parceiro.percentual.toFixed(0)}%) — com desconto
              </td>
              <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 800, fontSize: 14 }}>
                {fmtN(aReceber)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Assinaturas */}
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
