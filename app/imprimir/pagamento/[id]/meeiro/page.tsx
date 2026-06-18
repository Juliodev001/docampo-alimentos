'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

type Produto = { id: string; nome: string }
type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { nome: string; cpf: string | null; parceiros: Parceiro[] }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null
  parceiroId: string | null; percParceiro: number; bandeja: number
}
type Fechamento = {
  produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  combustivel: number; bandejaEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
  colheitas: Colheita[]
}

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }

function ImprimirPagamentoMeeiro() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const printed = useRef(false)

  // ?p=0 selects which parceiro (meeiro) to print; defaults to 0
  const parceiroIdx = parseInt(searchParams.get('p') ?? '0', 10)

  useEffect(() => {
    fetch(`/api/fechamento/${id}`).then(r => r.json()).then(setFechamento)
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

  const { produtor, colheitas, dataInicio, dataFim, dataPagamento, combustivel, bandejaEmbalagem, valesDinheiro, creditos, debitosAnteriores } = fechamento

  const meeiro = produtor.parceiros[parceiroIdx]
  if (!meeiro) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#e8255a' }}>
        Nenhum meeiro cadastrado para este produtor.
      </div>
    )
  }

  // Apenas os lançamentos (colheitas) que de fato pertencem a este meeiro
  const colheitasMeeiro = colheitas.filter(c => c.parceiroId === meeiro.id)
  const percMeeiro = colheitasMeeiro[0]?.percParceiro ?? meeiro.percentual

  const totalGeralBruto = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * Number(c.preco), 0)
  const totalQtd = colheitasMeeiro.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const totalFaturaBruto = colheitasMeeiro.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * Number(c.preco), 0)
  const totalDedGeral = combustivel + bandejaEmbalagem + valesDinheiro + creditos + debitosAnteriores

  // Deduções (combustível, embalagem, vales...) rateadas proporcionalmente ao bruto deste meeiro no total geral
  const fator = totalGeralBruto > 0 ? totalFaturaBruto / totalGeralBruto : 0
  const dedCombustivel = combustivel * fator
  const dedBandeja = bandejaEmbalagem * fator
  const dedValesDinheiro = valesDinheiro * fator
  const dedCreditos = creditos * fator
  const dedDebitos = debitosAnteriores * fator
  const totalDeducoes = dedCombustivel + dedBandeja + dedValesDinheiro + dedCreditos + dedDebitos
  const valorLiquido = totalFaturaBruto - totalDeducoes
  const aReceber = valorLiquido * (percMeeiro / 100)

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

        {/* Botão imprimir - só na tela */}
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo01.png" alt="Do Campo Alimentos" style={{ height: 44, margin: '0 auto 6px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textTransform: 'uppercase' }}>
            Pagamento de Meeiro
          </div>
        </div>

        {/* Período e data pagamento */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
          <span>Período de <strong>{fmtDate(dataInicio)}</strong> a <strong>{fmtDate(dataFim)}</strong></span>
          <span>Pagamento em <strong>{fmtDate(dataPagamento)}</strong></span>
        </div>

        {/* Dados do meeiro */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '50%' }}>
                <strong>Meeiro:</strong> {meeiro.nome}
              </td>
              <td style={{ ...cell, width: '30%' }}>
                <strong>Produtor:</strong> {produtor.nome}
              </td>
              <td style={{ ...cell, width: '20%' }}>
                <strong>Part.:</strong> {percMeeiro.toFixed(0)}%
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
            {colheitasMeeiro.length === 0 ? (
              <tr><td colSpan={8} style={{ ...cell, textAlign: 'center' as const, color: '#888' }}>Nenhum lançamento neste período</td></tr>
            ) : colheitasMeeiro.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const sub = liquido * Number(c.preco)
              return (
                <tr key={c.id}>
                  <td style={cell}>{fmtDate(c.data)}</td>
                  <td style={{ ...cell, textAlign: 'center' as const }}>{c.nrDoc ?? '0000'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{liquido.toFixed(0)}</td>
                  <td style={cell}>{c.produto.nome}{c.qualidade ? ` — ${c.qualidade}` : ''}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{c.bandeja > 0 ? fmtN(c.bandeja) : '—'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(Number(c.preco))}</td>
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
              <td style={{ ...cell, textAlign: 'right' as const, width: 100 }}>{fmtN(totalQtd)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Faturas</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(totalFaturaBruto)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Vales de Embalagens e Outros</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(dedBandeja)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Combustível</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(dedCombustivel)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Vales de Dinheiro</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(dedValesDinheiro)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Créditos (Coleta e Filmagem)</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(dedCreditos)}</td>
            </tr>
            <tr>
              <td style={{ ...cell }}>Débitos Anteriores</td>
              <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(dedDebitos)}</td>
            </tr>
            {totalDeducoes > 0 && (
              <tr>
                <td style={{ ...cell, fontSize: 10, color: '#555' }}>Valor Líquido Total</td>
                <td style={{ ...cell, textAlign: 'right' as const, fontSize: 10, color: '#555' }}>{fmtN(valorLiquido)}</td>
              </tr>
            )}
            <tr>
              <td style={{ ...cell, fontWeight: 700, fontSize: 13 }}>
                A Receber ({percMeeiro.toFixed(0)}%)
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
              <p style={{ fontSize: 10, margin: '2px 0 0', color: '#555' }}>{meeiro.nome}</p>
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

export default function Page() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6b7280' }}>Carregando...</div>}>
      <ImprimirPagamentoMeeiro />
    </Suspense>
  )
}
