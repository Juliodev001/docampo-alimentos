'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

type Produto = { id: string; nome: string }
type Parceiro = { nome: string; percentual: number }
type Produtor = { nome: string; cpf: string | null; codigo: string | null; parceiros: Parceiro[] }
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

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function ImprimirPagamento() {
  const { id } = useParams<{ id: string }>()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const printed = useRef(false)

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

  const totalParceirosPct = produtor.parceiros.reduce((s, p) => s + p.percentual, 0)
  const percProdutor = Math.max(0, 100 - totalParceirosPct)

  const totalBruto = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalQtd   = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const totalDed   = combustivel + bandejaEmbalagem + valesDinheiro + creditos + debitosAnteriores
  const valorLiquido = totalBruto - totalDed
  const aReceberProdutor = valorLiquido * (percProdutor / 100)

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
          <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textTransform: 'uppercase' }}>
            Pagamento de Produtores
          </div>
        </div>

        {/* Período e data pagamento */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
          <span>Período de <strong>{fmtDate(dataInicio)}</strong> a <strong>{fmtDate(dataFim)}</strong></span>
          <span>Pagamento em <strong>{fmtDate(dataPagamento)}</strong></span>
        </div>

        {/* Dados do produtor */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '50%' }}>
                <strong>Produtor:</strong> {produtor.codigo ? `${produtor.codigo} — ` : ''}{produtor.nome}
              </td>
              <td style={{ ...cell, width: '30%' }}>
                <strong>CPF / CNPJ:</strong> {produtor.cpf ?? ''}
              </td>
              <td style={{ ...cell, width: '20%' }}>
                <strong>Part.:</strong> {percProdutor.toFixed(0)}%
              </td>
            </tr>
            <tr>
              <td style={{ ...cell }} colSpan={3}><strong>Região:</strong></td>
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
              <th style={{ ...hd, textAlign: 'right' as const }}>Preço</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Sub-total</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Descarte</th>
            </tr>
          </thead>
          <tbody>
            {colheitas.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const sub = liquido * c.preco
              return (
                <tr key={c.id}>
                  <td style={cell}>{fmtDate(c.data)}</td>
                  <td style={{ ...cell, textAlign: 'center' as const }}>{c.nrDoc ?? '0000'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{liquido.toFixed(0)}</td>
                  <td style={cell}>{c.produto.nome}{c.qualidade ? ` — ${c.qualidade}` : ''}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(c.preco)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(sub)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{c.descarte > 0 ? c.descarte.toFixed(0) : '0'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Resumo + Meeiro lado a lado */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Resumo financeiro */}
          <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
            <tbody>
              <tr>
                <td style={{ ...cell, fontWeight: 700, textAlign: 'right' as const }}>Total</td>
                <td style={{ ...cell, textAlign: 'right' as const, width: 100 }}>{fmtN(totalQtd)}</td>
              </tr>
              <tr>
                <td style={{ ...cell }}>Faturas</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(totalBruto)}</td>
              </tr>
              <tr>
                <td style={{ ...cell }}>Vales de Embalagens e Outros</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(bandejaEmbalagem)}</td>
              </tr>
              <tr>
                <td style={{ ...cell }}>Combustível</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(combustivel)}</td>
              </tr>
              <tr>
                <td style={{ ...cell }}>Vales de Dinheiro</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(valesDinheiro)}</td>
              </tr>
              <tr>
                <td style={{ ...cell }}>Créditos (Coleta e Filmagem)</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(creditos)}</td>
              </tr>
              <tr>
                <td style={{ ...cell }}>Débitos Anteriores</td>
                <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(debitosAnteriores)}</td>
              </tr>
              {totalDed > 0 && (
                <tr>
                  <td style={{ ...cell, fontSize: 10, color: '#555' }}>Valor Líquido Total</td>
                  <td style={{ ...cell, textAlign: 'right' as const, fontSize: 10, color: '#555' }}>{fmtN(valorLiquido)}</td>
                </tr>
              )}
              <tr>
                <td style={{ ...cell, fontWeight: 700, fontSize: 13 }}>
                  A Receber {percProdutor < 100 ? `(${percProdutor.toFixed(0)}%)` : ''}
                </td>
                <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 800, fontSize: 14 }}>
                  {fmtN(aReceberProdutor)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tabela do meeiro — só aparece se tiver parceiros */}
          {produtor.parceiros.length > 0 && (
            <table style={{ borderCollapse: 'collapse', flex: 1 }}>
              <thead>
                <tr>
                  <th style={hd}>Meeiro</th>
                  <th style={{ ...hd, textAlign: 'right' as const }}>%</th>
                  <th style={{ ...hd, textAlign: 'right' as const }}>Valor Meeiro</th>
                </tr>
              </thead>
              <tbody>
                {produtor.parceiros.map(p => (
                  <tr key={p.nome}>
                    <td style={cell}>{p.nome}</td>
                    <td style={{ ...cell, textAlign: 'right' as const }}>{p.percentual.toFixed(0)}%</td>
                    <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>
                      {fmtN(valorLiquido * p.percentual / 100)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...cell, fontWeight: 700 }} colSpan={2}>Total Meeiros</td>
                  <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 800 }}>
                    {fmtN(valorLiquido * totalParceirosPct / 100)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Assinaturas */}
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: 200 }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
              <p style={{ fontSize: 10, margin: 0 }}>Assinatura do Produtor</p>
              <p style={{ fontSize: 10, margin: '2px 0 0', color: '#555' }}>{produtor.nome}</p>
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
