'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#2d3561'

type Produto = { id: string; nome: string }
type Produtor = { id: string; nome: string; codigo: string | null; cpf: string | null }
type Parceiro = { id: string; nome: string; cpf: string | null; percentual: number; valorEmba: number; chavePix: string | null; produtor: Produtor }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null; bandeja: number; percParceiro: number
  roca: { nome: string } | null
}
type Data = { parceiro: Parceiro; colheitas: Colheita[] }

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function ImprimirMeeiro() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [usuario, setUsuario] = useState('')
  const [valesAbertos, setValesAbertos] = useState(0)
  const printed = useRef(false)
  const [emitidoEm] = useState(() => new Date())

  useEffect(() => {
    fetch(`/api/imprimir-meeiro/${id}`).then(r => r.json()).then(setData)
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => setUsuario(d?.name ?? ''))
  }, [id])

  useEffect(() => {
    fetch(`/api/vales?parceiroId=${id}&status=ABERTO`)
      .then(r => r.json())
      .then((vs: { valor: number }[]) => setValesAbertos(vs.reduce((s, v) => s + Number(v.valor), 0)))
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

  const totalQtd     = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  // Repasse e embalagem usam só a fatia do parceiro naquele lançamento (percParceiro),
  // nunca a caixa inteira do lote — o lote é compartilhado com o produtor.
  const valorRepasse = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco * ((c.percParceiro ?? parceiro.percentual) / 100), 0)
  const descEmba     = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * (c.bandeja ?? 0) * ((c.percParceiro ?? parceiro.percentual) / 100), 0)
  const abatimEmprestimo = 0
  const valorRecebido = valorRepasse - descEmba - abatimEmprestimo

  const dataInicio = colheitas.length > 0 ? fmtDate(colheitas[0].data) : '—'
  const dataFim    = colheitas.length > 0 ? fmtDate(colheitas[colheitas.length - 1].data) : '—'
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

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '10px 0', fontFamily: 'Arial, sans-serif', fontSize: 10 }}>

        {/* Marca d'água */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo01.png" alt="" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, opacity: 0.3, zIndex: -1, pointerEvents: 'none', filter: 'grayscale(100%)' }} />

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
            Recibo de Repasse ao Parceiro
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
          <span>Usuário: {usuario || '—'}</span>
          <span>Emitido em: {fmtDateTime(emitidoEm)}</span>
        </div>
        <div style={{ marginBottom: 12, fontSize: 11 }}>
          Período: {colheitas.length > 0 ? `${dataInicio} a ${dataFim}` : 'não filtrado'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
          <span><strong>Outorgante:</strong> DO CAMPO ALIMENTOS</span>
          <span><strong>Outorgado:</strong> {parceiro.nome}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11 }}>
          <span><strong>Inscrição estadual:</strong> —</span>
          <span><strong>Roça:</strong> {rocas.length > 0 ? rocas.join(', ') : '—'} (Produtor: {parceiro.produtor.codigo ? `${parceiro.produtor.codigo} — ` : ''}{parceiro.produtor.nome})</span>
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
            {colheitas.length === 0 ? (
              <tr><td colSpan={7} style={{ ...cell, textAlign: 'center' as const, color: '#666' }}>Nenhum lançamento</td></tr>
            ) : colheitas.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const sub = liquido * c.preco
              const repasse = sub * ((c.percParceiro ?? parceiro.percentual) / 100)
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
              <td style={totCell}>{fmtN(valorRepasse)}</td>
              <td style={totCell}>{fmtN(descEmba)}</td>
              <td style={totCell}>{fmtN(valesAbertos)}</td>
              <td style={totCell}>{fmtN(abatimEmprestimo)}</td>
              <td style={{ ...totCell, color: NAVY }}>{fmtN(valorRecebido)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 0' }}>
          Total líquido a receber pelo parceiro: <span style={{ color: NAVY }}>{fmtN(valorRecebido)}</span>
        </p>

      </div>
    </>
  )
}
