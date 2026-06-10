'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'
const PURPLE = '#7c3aed'

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
  combustivel: number; bandejaEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
  colheitas: Colheita[]
}

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

function ImprimirPagamentoMeeiro() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const printed = useRef(false)

  // ?p=0 selects which parceiro (meeiro) to print; defaults to 0
  const parceiroIdx = parseInt(searchParams.get('p') ?? '0', 10)

  useEffect(() => {
    fetch(`/api/fechamento/${id}`)
      .then(r => r.json())
      .then(data => setFechamento(data))
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

  const { produtor, colheitas, dataInicio, dataFim, dataPagamento, combustivel, bandejaEmbalagem, valesDinheiro, creditos, debitosAnteriores } = fechamento

  const meeiro = produtor.parceiros[parceiroIdx]
  if (!meeiro) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: PINK }}>
        Nenhum meeiro cadastrado para este produtor.
      </div>
    )
  }

  const percMeeiro = meeiro.percentual
  const fator = percMeeiro / 100

  const totalFaturaBruto = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * Number(c.preco), 0)
  const totalFatura = totalFaturaBruto * fator
  const dedCombustivel = Number(combustivel) * fator
  const dedBandeja = Number(bandejaEmbalagem) * fator
  const dedValesDinheiro = Number(valesDinheiro) * fator
  const dedCreditos = Number(creditos) * fator
  const dedDebitos = Number(debitosAnteriores) * fator
  const totalDeducoes = dedCombustivel + dedBandeja + dedValesDinheiro + dedCreditos + dedDebitos
  const aReceber = totalFatura - totalDeducoes

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
              <h1 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Pagamento de Meeiro</h1>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                Período: {fmtDate(dataInicio)} a {fmtDate(dataFim)}
              </p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
                Data Pagamento: {fmtDate(dataPagamento)}
              </p>
            </div>
          </div>
        </div>

        {/* Dados do meeiro + produtor */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
          <div style={{ flex: 1, backgroundColor: '#faf5ff', borderRadius: 8, padding: '12px 16px', border: `1px solid ${PURPLE}30` }}>
            <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Meeiro</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{meeiro.nome}</span>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Participação: </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: PURPLE }}>{percMeeiro.toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f8faff', borderRadius: 8, padding: '12px 16px', border: '1px solid #e0e7ff' }}>
            <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Produtor</p>
            <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{produtor.nome}</span>
          </div>
        </div>

        {/* Tabela de colheitas */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              {['Data', 'Nº Doc', 'Produto / Qualidade', 'Qtd.', 'Descarte', 'Líquido', 'Preço/cx', 'Sub-total Bruto', `Parte (${percMeeiro.toFixed(0)}%)`].map(h => (
                <th key={h} style={{ ...th, textAlign: h.startsWith('Sub') || h.startsWith('Parte') ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colheitas.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const subBruto = liquido * Number(c.preco)
              const subParte = subBruto * fator
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
                  <td style={td}>{fmtBRL(Number(c.preco))}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#6b7280' }}>{fmtBRL(subBruto)}</td>
                  <td style={{ ...td, fontWeight: 700, color: PURPLE, textAlign: 'right' }}>{fmtBRL(subParte)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #d1d5db', backgroundColor: '#f9fafb' }}>
              <td colSpan={7} style={{ padding: '10px', fontSize: 12, fontWeight: 700, color: NAVY }}>Total Bruto</td>
              <td style={{ padding: '10px', fontSize: 13, fontWeight: 700, color: '#6b7280', textAlign: 'right' }}>{fmtBRL(totalFaturaBruto)}</td>
              <td style={{ padding: '10px', fontSize: 14, fontWeight: 800, color: PURPLE, textAlign: 'right' }}>{fmtBRL(totalFatura)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Resumo */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 380, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(combustivel > 0 || bandejaEmbalagem > 0) && (
                  <tr>
                    <td colSpan={2} style={{ padding: '7px 14px 2px', fontSize: 10, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, backgroundColor: '#fff7ed' }}>
                      Insumos ({percMeeiro.toFixed(0)}%)
                    </td>
                  </tr>
                )}
                {combustivel > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff7ed' }}>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: '#6b7280' }}>
                      Combustível
                      <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>({fmtBRL(combustivel)} × {percMeeiro.toFixed(0)}%)</span>
                    </td>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: ORANGE, textAlign: 'right' }}>- {fmtBRL(dedCombustivel)}</td>
                  </tr>
                )}
                {bandejaEmbalagem > 0 && (
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff7ed' }}>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: '#6b7280' }}>
                      Bandeja e Embalagens
                      <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>({fmtBRL(bandejaEmbalagem)} × {percMeeiro.toFixed(0)}%)</span>
                    </td>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: ORANGE, textAlign: 'right' }}>- {fmtBRL(dedBandeja)}</td>
                  </tr>
                )}
                {(valesDinheiro > 0 || creditos > 0 || debitosAnteriores > 0) && (
                  <tr>
                    <td colSpan={2} style={{ padding: '7px 14px 2px', fontSize: 10, fontWeight: 700, color: PINK, textTransform: 'uppercase', letterSpacing: 0.8, backgroundColor: '#fff0f3' }}>
                      Deduções ({percMeeiro.toFixed(0)}%)
                    </td>
                  </tr>
                )}
                {valesDinheiro > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff0f3' }}>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: '#6b7280' }}>
                      Vales Dinheiro
                      <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>({fmtBRL(valesDinheiro)} × {percMeeiro.toFixed(0)}%)</span>
                    </td>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: PINK, textAlign: 'right' }}>- {fmtBRL(dedValesDinheiro)}</td>
                  </tr>
                )}
                {creditos > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff0f3' }}>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: '#6b7280' }}>
                      Créditos (Coleta e Filmagem)
                      <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>({fmtBRL(creditos)} × {percMeeiro.toFixed(0)}%)</span>
                    </td>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: PINK, textAlign: 'right' }}>- {fmtBRL(dedCreditos)}</td>
                  </tr>
                )}
                {debitosAnteriores > 0 && (
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff0f3' }}>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: '#6b7280' }}>
                      Débitos Anteriores
                      <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>({fmtBRL(debitosAnteriores)} × {percMeeiro.toFixed(0)}%)</span>
                    </td>
                    <td style={{ padding: '6px 14px', fontSize: 12, color: PINK, textAlign: 'right' }}>- {fmtBRL(dedDebitos)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: `${PURPLE}10` }}>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: NAVY }}>A Receber</td>
                  <td style={{ padding: '12px 14px', fontSize: 18, fontWeight: 800, color: aReceber >= 0 ? PURPLE : PINK, textAlign: 'right' }}>{fmtBRL(aReceber)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Assinaturas */}
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ borderTop: '1px solid #374151', paddingTop: 6 }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Assinatura do Meeiro</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{meeiro.nome}</p>
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

export default function Page() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6b7280' }}>Carregando...</div>}>
      <ImprimirPagamentoMeeiro />
    </Suspense>
  )
}
