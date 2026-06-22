'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#2d3561'

type Produto = { id: string; nome: string }
type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; codigo: string | null; inscricaoEstadual: string | null; parceiros: Parceiro[] }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null
  parceiroId: string | null; percParceiro: number; bandeja: number
  roca: { nome: string } | null
}
type ValeLinked = { valor: number }
type Fechamento = {
  produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  combustivel: number; bandejaEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
  colheitas: Colheita[]
  vales: ValeLinked[]
}

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function ImprimirPagamento() {
  const { id } = useParams<{ id: string }>()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [usuario, setUsuario] = useState('')
  const [valesAbertos, setValesAbertos] = useState(0)
  const printed = useRef(false)
  const [emitidoEm] = useState(() => new Date())

  useEffect(() => {
    fetch(`/api/fechamento/${id}`).then(r => r.json()).then(setFechamento)
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => setUsuario(d?.name ?? ''))
  }, [id])

  useEffect(() => {
    if (!fechamento?.produtor.id) return
    fetch(`/api/vales?produtorId=${fechamento.produtor.id}&status=ABERTO`)
      .then(r => r.json())
      .then((vs: { valor: number }[]) => setValesAbertos(vs.reduce((s, v) => s + Number(v.valor), 0)))
  }, [fechamento?.produtor.id])

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

  const { produtor, colheitas, dataInicio, dataFim, dataPagamento, combustivel, bandejaEmbalagem, valesDinheiro, creditos, debitosAnteriores, vales } = fechamento

  const totalBruto = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalQtd   = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)

  const totalMeeirosBruto = colheitas.reduce((s, c) => {
    if (!c.parceiroId) return s
    return s + (c.quantidadeTotal - c.descarte) * c.preco * (c.percParceiro / 100)
  }, 0)
  const donoBruto = totalBruto - totalMeeirosBruto
  const fatorProdutor = totalBruto > 0 ? donoBruto / totalBruto : 0

  const descEmb = bandejaEmbalagem * fatorProdutor
  const outrasDeducoes = (combustivel + creditos + debitosAnteriores) * fatorProdutor
  const abatimEmprestimo = vales.reduce((s, v) => s + Number(v.valor), 0)
  const valorRecebido = donoBruto - descEmb - outrasDeducoes - abatimEmprestimo

  const rocas = Array.from(new Set(colheitas.map(c => c.roca?.nome).filter(Boolean))) as string[]

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
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '10px 0', fontFamily: 'Arial, sans-serif', fontSize: 10, position: 'relative' }}>

        {/* Marca d'água */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo01.png" alt="" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, opacity: 0.3, zIndex: -1, pointerEvents: 'none', filter: 'grayscale(100%)' }} />

        <div className="no-print" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={() => window.close()} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo01.png" alt="Do Campo Alimentos" style={{ height: 32, margin: '0 auto 6px', display: 'block', filter: 'grayscale(100%)' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
            Recibo de Repasse ao Produtor
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
          <span>Usuário: {usuario || '—'}</span>
          <span>Emitido em: {fmtDateTime(emitidoEm)}</span>
        </div>
        <div style={{ marginBottom: 12, fontSize: 11 }}>
          Período: {fmtDate(dataInicio)} a {fmtDate(dataFim)} — Pagamento em {fmtDate(dataPagamento)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
          <span><strong>Outorgante:</strong> DO CAMPO ALIMENTOS</span>
          <span><strong>Outorgado:</strong> {produtor.codigo ? `${produtor.codigo} — ` : ''}{produtor.nome}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11 }}>
          <span><strong>Inscrição estadual:</strong> {produtor.inscricaoEstadual ?? '—'}</span>
          <span><strong>Roça:</strong> {rocas.length > 0 ? rocas.join(', ') : '—'}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <thead>
            <tr>
              <th style={hd}>Data</th>
              <th style={hd}>Nº Doc.</th>
              <th style={hd}>Quant.</th>
              <th style={hd}>Produto</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Preço</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Valor total</th>
              <th style={{ ...hd, textAlign: 'right' as const }}>Repasse</th>
            </tr>
          </thead>
          <tbody>
            {colheitas.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const sub = liquido * c.preco
              const percProdutorRow = c.parceiroId ? 100 - c.percParceiro : 100
              const repasse = sub * (percProdutorRow / 100)
              return (
                <tr key={c.id}>
                  <td style={cell}>{fmtDate(c.data)}</td>
                  <td style={{ ...cell, textAlign: 'center' as const }}>{c.nrDoc ?? '—'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{liquido.toFixed(0)}</td>
                  <td style={cell}>{c.produto.nome}{c.qualidade ? ` — ${c.qualidade}` : ''}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(c.preco)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(sub)}</td>
                  <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>{fmtN(repasse)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={totHd}>Total caixas</th>
              <th style={totHd}>Valor Repasse</th>
              <th style={totHd}>Desc Emb.</th>
              <th style={totHd}>Empr. em aberto</th>
              <th style={totHd}>Abatim. emprést.</th>
              <th style={totHd}>Valor recebido</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={totCell}>{totalQtd.toFixed(0)}</td>
              <td style={totCell}>{fmtN(donoBruto)}</td>
              <td style={totCell}>{fmtN(descEmb)}</td>
              <td style={totCell}>{fmtN(valesAbertos)}</td>
              <td style={totCell}>{fmtN(abatimEmprestimo)}</td>
              <td style={{ ...totCell, color: NAVY }}>{fmtN(valorRecebido)}</td>
            </tr>
          </tbody>
        </table>

        {outrasDeducoes > 0 && (
          <p style={{ fontSize: 10, color: '#555', margin: '0 0 10px' }}>
            Outras deduções (combustível, créditos, débitos anteriores) já incluídas no valor recebido: - {fmtN(outrasDeducoes)}
          </p>
        )}

        <p style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 0' }}>
          Total líquido a receber pelo produtor: <span style={{ color: NAVY }}>{fmtN(valorRecebido)}</span>
        </p>

        {/* Detalhamento por meeiro (informação complementar) */}
        {produtor.parceiros.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Detalhamento por meeiro</p>
            <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
              <thead>
                <tr>
                  <th style={hd}>Meeiro</th>
                  <th style={{ ...hd, textAlign: 'right' as const }}>%</th>
                  <th style={{ ...hd, textAlign: 'right' as const }}>Valor Meeiro</th>
                  <th style={{ border: 'none', backgroundColor: 'transparent', width: 24 }}></th>
                  <th style={{ ...hd, textAlign: 'right' as const }}>Valor Produtor</th>
                </tr>
              </thead>
              <tbody>
                {produtor.parceiros.map(p => {
                  const bruto = colheitas.reduce((s, c) => {
                    if (c.parceiroId !== p.id) return s
                    return s + (c.quantidadeTotal - c.descarte) * c.preco * (c.percParceiro / 100)
                  }, 0)
                  // Bruto do produtor referente às mesmas colheitas desse meeiro (a fatia complementar)
                  const brutoProdutor = colheitas.reduce((s, c) => {
                    if (c.parceiroId !== p.id) return s
                    return s + (c.quantidadeTotal - c.descarte) * c.preco * ((100 - c.percParceiro) / 100)
                  }, 0)
                  const totalDed = combustivel + bandejaEmbalagem + valesDinheiro + creditos + debitosAnteriores
                  const fator = totalBruto > 0 ? bruto / totalBruto : 0
                  const fatorProdutor = totalBruto > 0 ? brutoProdutor / totalBruto : 0
                  const valorMeeiro = bruto - totalDed * fator
                  const valorProdutorMeeiro = brutoProdutor - totalDed * fatorProdutor
                  return (
                    <tr key={p.id}>
                      <td style={cell}>{p.nome}</td>
                      <td style={{ ...cell, textAlign: 'right' as const }}>{p.percentual.toFixed(0)}%</td>
                      <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>{fmtN(valorMeeiro)}</td>
                      <td style={{ border: 'none' }}></td>
                      <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>{fmtN(valorProdutorMeeiro)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </>
  )
}
