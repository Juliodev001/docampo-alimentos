'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

type Produto = { id: string; nome: string }
type Parceiro = { nome: string; percentual: number }
type Produtor = { nome: string; cpf: string | null; parceiros: Parceiro[] }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null
}
type Fechamento = {
  produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  valesEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
  colheitas: Colheita[]
}

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function ImprimirPagamento() {
  const { id } = useParams<{ id: string }>()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const printed = useRef(false)

  useEffect(() => {
    fetch(`/api/fechamento/${id}`)
      .then(r => r.json())
      .then(data => {
        setFechamento(data)
      })
  }, [id])

  useEffect(() => {
    if (fechamento && !printed.current) {
      printed.current = true
      setTimeout(() => window.print(), 400)
    }
  }, [fechamento])

  if (!fechamento) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6b7280' }}>
        Carregando documento...
      </div>
    )
  }

  const { produtor, colheitas, dataInicio, dataFim, dataPagamento, valesEmbalagem, valesDinheiro, creditos, debitosAnteriores } = fechamento
  const totalFaturas = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalDeducoes = valesEmbalagem + valesDinheiro + creditos + debitosAnteriores
  const aReceber = totalFaturas - totalDeducoes

  const td: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #e5e7eb', color: '#374151' }
  const th: React.CSSProperties = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', backgroundColor: '#f9fafb', textAlign: 'left' }

  return (
    <>
      <style>{`
        @page { margin: 14mm; size: A4; }
        body { margin: 0; font-family: Arial, sans-serif; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 0', fontFamily: 'Arial, sans-serif' }}>

        {/* Cabeçalho */}
        <div style={{ borderBottom: `3px solid ${NAVY}`, paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${GREEN}, #3a8435)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍓</div>
                <div>
                  <span style={{ color: PINK, fontSize: 16, fontWeight: 800, fontStyle: 'italic' }}>do campo </span>
                  <span style={{ color: GREEN, fontSize: 16, fontWeight: 800, fontStyle: 'italic' }}>Alimentos</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Pagamento de Produtores</h1>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                Período: {fmtDate(dataInicio)} a {fmtDate(dataFim)}
              </p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
                Data Pagamento: {fmtDate(dataPagamento)}
              </p>
            </div>
          </div>
        </div>

        {/* Dados do produtor */}
        <div style={{ backgroundColor: '#f8faff', borderRadius: 8, padding: '12px 16px', marginBottom: 18, border: '1px solid #e0e7ff' }}>
          <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Produtor</p>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{produtor.nome}</span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: '#6b7280' }}>CPF: </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{produtor.cpf}</span>
            </div>
          </div>
        </div>

        {/* Tabela de colheitas */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              {['Data', 'Nº Doc', 'Produto / Qualidade', 'Qtd.', 'Descarte', 'Líquido', 'Preço/cx', 'Sub-total'].map(h => (
                <th key={h} style={{ ...th, textAlign: h === 'Sub-total' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colheitas.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const sub = liquido * c.preco
              return (
                <tr key={c.id}>
                  <td style={td}>{fmtDate(c.data)}</td>
                  <td style={td}>{c.nrDoc ?? '—'}</td>
                  <td style={{ ...td, fontWeight: 600, color: NAVY }}>
                    {c.produto.nome}
                    {c.qualidade && <span style={{ fontSize: 10, color: ORANGE, marginLeft: 5, fontWeight: 700 }}>{c.qualidade}</span>}
                  </td>
                  <td style={td}>{c.quantidadeTotal.toFixed(1)}</td>
                  <td style={{ ...td, color: PINK }}>{c.descarte > 0 ? c.descarte.toFixed(1) : '—'}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{liquido.toFixed(1)}</td>
                  <td style={td}>{fmtBRL(c.preco)}</td>
                  <td style={{ ...td, fontWeight: 700, color: GREEN, textAlign: 'right' }}>{fmtBRL(sub)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #d1d5db', backgroundColor: '#f9fafb' }}>
              <td colSpan={7} style={{ padding: '10px', fontSize: 12, fontWeight: 700, color: NAVY }}>Total Faturas</td>
              <td style={{ padding: '10px', fontSize: 14, fontWeight: 800, color: GREEN, textAlign: 'right' }}>{fmtBRL(totalFaturas)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Resumo */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 320, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {valesEmbalagem > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: '#6b7280' }}>Caixas e Bandeja</td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: PINK, textAlign: 'right' }}>- {fmtBRL(valesEmbalagem)}</td>
                  </tr>
                )}
                {valesDinheiro > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: '#6b7280' }}>Vales Dinheiro</td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: PINK, textAlign: 'right' }}>- {fmtBRL(valesDinheiro)}</td>
                  </tr>
                )}
                {creditos > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: '#6b7280' }}>Créditos (Coleta e Filmagem)</td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: PINK, textAlign: 'right' }}>- {fmtBRL(creditos)}</td>
                  </tr>
                )}
                {debitosAnteriores > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: '#6b7280' }}>Débitos Anteriores</td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: PINK, textAlign: 'right' }}>- {fmtBRL(debitosAnteriores)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: `${GREEN}15` }}>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: NAVY }}>A Receber</td>
                  <td style={{ padding: '12px 14px', fontSize: 18, fontWeight: 800, color: aReceber >= 0 ? GREEN : PINK, textAlign: 'right' }}>{fmtBRL(aReceber)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Assinaturas */}
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Assinatura do Produtor</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{produtor.nome}</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Responsável pela Empresa</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Do Campo Alimentos</p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
