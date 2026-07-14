'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faPrint, faPlus, faFileLines, faChevronDown, faChevronUp, faCheck, faXmark, faFilter, faDownload } from '@fortawesome/free-solid-svg-icons'
import PageSkeleton from '@/components/page-skeleton'
import { calcularFechamento } from '@/lib/fechamento-calc'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const PURPLE = '#7c3aed'
const BLUE   = '#3b82f6'

type Parceiro   = { id: string; nome: string; percentual: number; valorEmba: number }
type Produtor   = { id: string; nome: string; cpf: string | null; parceiros: Parceiro[] }
type Fechamento = {
  id: string; produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  combustivel: number; bandejaEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
}
type ColheitaItem = {
  id: string; data: string; nrDoc: string | null
  produto: { id: string; nome: string }
  roca: { id: string; nome: string; codigo: string | null } | null
  parceiro: { id: string; nome: string; percentual: number; valorEmba: number } | null
  produtor: { nome: string } | null
  quantidadeTotal: number; descarte: number; preco: number
  qualidade: string | null; percParceiro: number
  aprovado: boolean
  responsavel: { name: string }
  createdAt: string
}
type FechamentoDetalhe = Fechamento & {
  colheitas: { id: string; data: string; nrDoc: string | null; produto: { nome: string }; quantidadeTotal: number; descarte: number; preco: number; qualidade: string | null; parceiroId: string | null; percParceiro: number }[]
  vales?: { valor: number }[]
}

const fmt    = (d: string) => new Date(d).toLocaleDateString('pt-BR')
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN   = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d })

/* ─── PDF MINIMALISTA ─────────────────────────────────────────────── */
function gerarPDFLancamentos(produtor: Produtor, lancamentos: ColheitaItem[], filtro: string) {
  const lista = filtro === 'aprovados'  ? lancamentos.filter(c => c.aprovado)
               : filtro === 'pendentes' ? lancamentos.filter(c => !c.aprovado)
               : lancamentos

  const style = `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:13px}
      .page{max-width:800px;margin:0 auto;padding:36px 40px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid #2d3561;margin-bottom:24px}
      .brand{font-size:20px;font-weight:800;color:#2d3561;letter-spacing:-0.5px}
      .brand span{color:#5ab952}
      .doc-title{text-align:right}
      .doc-title h1{font-size:15px;font-weight:700;color:#2d3561;text-transform:uppercase;letter-spacing:1px}
      .doc-title p{font-size:11px;color:#6b7280;margin-top:3px}
      .info-bar{display:flex;gap:32px;background:#f8faff;border-radius:8px;padding:12px 16px;margin-bottom:20px;border:1px solid #e0e7ff}
      .info-bar .field label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px}
      .info-bar .field span{font-size:13px;font-weight:600;color:#1a1a2e}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead tr{background:#2d3561;color:#fff}
      thead th{padding:9px 10px;font-size:11px;font-weight:600;text-align:left;letter-spacing:0.3px}
      thead th.r{text-align:right}
      tbody tr:nth-child(even){background:#f9fafb}
      tbody tr:hover{background:#f0f9ff}
      tbody td{padding:8px 10px;font-size:12px;border-bottom:1px solid #f3f4f6;color:#374151}
      tbody td.r{text-align:right}
      tbody td.bold{font-weight:700;color:#2d3561}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
      .badge.ok{background:#f0faf0;color:#5ab952}
      .badge.no{background:#fff0f3;color:#e8255a}
      tfoot td{padding:10px;font-size:12px;border-top:2px solid #e5e7eb;background:#f9fafb}
      tfoot .total-row td{padding:12px 10px;font-size:14px;font-weight:800;background:#2d356108;border-top:2px solid #2d3561}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
      .summary-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
      .summary-card label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px}
      .summary-card .val{font-size:18px;font-weight:800;color:#2d3561}
      .summary-card.green .val{color:#5ab952}
      .summary-card.purple .val{color:#7c3aed}
      .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
      .footer p{font-size:10px;color:#9ca3af}
      .sig{text-align:center;width:180px}
      .sig .line{border-top:1px solid #374151;padding-top:6px;margin-top:40px;font-size:10px;color:#6b7280}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}
      @page{margin:14mm;size:A4}
    </style>
  `

  const totalBruto   = lista.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalQtd     = lista.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const aprovados    = lista.filter(c => c.aprovado).length
  const parceiros    = produtor.parceiros

  const rows = lista.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:24px;color:#9ca3af">Nenhum lançamento encontrado</td></tr>`
    : lista.map(c => {
        const sub = (c.quantidadeTotal - c.descarte) * c.preco
        return `
          <tr>
            <td>${fmt(c.data)}</td>
            <td class="bold">${c.produto.nome}${c.qualidade ? ` <span style="font-size:10px;color:#e87320">${c.qualidade}</span>` : ''}</td>
            <td>${c.roca?.nome ?? '—'}</td>
            <td class="r">${fmtN(c.quantidadeTotal, 0)}</td>
            <td class="r">${fmtBRL(c.preco)}</td>
            <td class="r bold">${fmtBRL(sub)}</td>
            <td style="text-align:center"><span class="badge ${c.aprovado ? 'ok' : 'no'}">${c.aprovado ? '✓ OK' : '✗ Pendente'}</span></td>
          </tr>`
      }).join('')

  // Divisão canônica: floor por colheita, só nas colheitas de cada meeiro (sem deduções neste relatório)
  const divisao = calcularFechamento(
    lista.map(c => ({ quantidadeTotal: c.quantidadeTotal, descarte: c.descarte, preco: c.preco, parceiroId: c.parceiro?.id ?? null, percParceiro: c.percParceiro })),
    { combustivel: 0, bandejaEmbalagem: 0, valesDinheiro: 0, creditos: 0, debitosAnteriores: 0 },
  )
  const parteRows = parceiros.map(p => {
    const m = divisao.meeiros.find(x => x.parceiroId === p.id)
    return `<tr><td>${p.nome}</td><td class="r">${p.percentual}%</td><td class="r bold" style="color:#7c3aed">${fmtBRL(m?.bruto ?? 0)}</td></tr>`
  }).join('')
  const percProdutor = Math.max(0, 100 - parceiros.reduce((s, p) => s + p.percentual, 0))

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Lançamentos — ${produtor.nome}</title>${style}</head>
<body>
<div class="page">
  <div class="no-print" style="margin-bottom:16px;display:flex;gap:8px">
    <button onclick="window.print()" style="padding:8px 20px;background:#2d3561;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">🖨️ Imprimir / PDF</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;cursor:pointer">Fechar</button>
  </div>

  <div class="header">
    <div>
      <div class="brand">do campo <span>Alimentos</span></div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px">Sistema de Gestão</div>
    </div>
    <div class="doc-title">
      <h1>Relatório de Lançamentos</h1>
      <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>

  <div class="info-bar">
    <div class="field"><label>Produtor</label><span>${produtor.nome}</span></div>
    <div class="field"><label>CPF / CNPJ</label><span>${produtor.cpf ?? '—'}</span></div>
    <div class="field"><label>Participação</label><span>${percProdutor}%</span></div>
    <div class="field"><label>Registros</label><span>${lista.length} lançamentos</span></div>
    <div class="field"><label>Aprovados</label><span>${aprovados} / ${lista.length}</span></div>
  </div>

  <div class="summary">
    <div class="summary-card green">
      <label>Total Bruto</label>
      <div class="val">${fmtBRL(totalBruto)}</div>
    </div>
    <div class="summary-card">
      <label>Total Caixas</label>
      <div class="val">${fmtN(totalQtd, 0)} cx</div>
    </div>
    <div class="summary-card purple">
      <label>A Receber (${percProdutor}%)</label>
      <div class="val">${fmtBRL(divisao.produtor.bruto)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th><th>Produto</th><th>Roça</th>
        <th class="r">Qtde</th><th class="r">Preço/cx</th>
        <th class="r">Sub-total</th><th style="text-align:center">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3"><strong>Total Geral</strong></td>
        <td class="r"><strong>${fmtN(totalQtd, 0)} cx</strong></td>
        <td></td>
        <td class="r"><strong>${fmtBRL(totalBruto)}</strong></td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  ${parceiros.length > 0 ? `
  <p style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px">Divisão por participante</p>
  <table style="max-width:360px">
    <thead><tr><th>Nome</th><th class="r">%</th><th class="r">Valor</th></tr></thead>
    <tbody>
      ${parteRows}
      <tr>
        <td class="bold">${produtor.nome}</td>
        <td class="r">${percProdutor}%</td>
        <td class="r bold" style="color:#2d3561">${fmtBRL(divisao.produtor.bruto)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  <div class="footer">
    <p>Do Campo Alimentos · Sistema de Gestão</p>
    <div class="sig">
      <div class="line">Assinatura do Produtor<br>${produtor.nome}</div>
    </div>
    <div class="sig">
      <div class="line">Responsável<br>Do Campo Alimentos</div>
    </div>
  </div>
</div>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 500)
}

/* ─── FECHAMENTO INLINE ────────────────────────────────────────────── */
function RelatorioInline({ fechamento, produtor }: { fechamento: FechamentoDetalhe; produtor: Produtor }) {
  const valesVinculados = (fechamento.vales ?? []).reduce((s, v) => s + Number(v.valor), 0)
  const calculo = calcularFechamento(
    fechamento.colheitas.map(c => ({ quantidadeTotal: c.quantidadeTotal, descarte: c.descarte, preco: c.preco, parceiroId: c.parceiroId, percParceiro: c.percParceiro })),
    { combustivel: fechamento.combustivel, bandejaEmbalagem: fechamento.bandejaEmbalagem, valesDinheiro: fechamento.valesDinheiro, creditos: fechamento.creditos, debitosAnteriores: fechamento.debitosAnteriores },
    valesVinculados,
  )
  const bruto = calculo.totalBruto
  const partes = [
    { nome: produtor.nome, cor: NAVY, tipo: 'Produtor', bruto: calculo.produtor.bruto, vales: calculo.produtor.abatimentoVales, liquido: calculo.produtor.liquido },
    ...produtor.parceiros.map(p => {
      const m = calculo.meeiros.find(x => x.parceiroId === p.id)
      return { nome: p.nome, cor: PURPLE, tipo: 'Meeiro', bruto: m?.bruto ?? 0, vales: 0, liquido: m?.liquido ?? 0 }
    }),
  ]
  const th: React.CSSProperties = { padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#6b7280', backgroundColor: '#f9fafb', textAlign: 'left' as const }
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6', color: '#374151' }
  return (
    <div style={{ padding: '0 0 4px' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 8px' }}>Colheitas do período</p>
      {fechamento.colheitas.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>Nenhuma colheita registrada neste período.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Data','Nº Doc','Produto','Qtd','Descarte','Líquido','Preço/cx','Sub-total'].map(h => <th key={h} style={{ ...th, textAlign: h === 'Sub-total' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {fechamento.colheitas.map(c => {
                const liq = c.quantidadeTotal - c.descarte
                return (
                  <tr key={c.id}>
                    <td style={td}>{fmt(c.data)}</td>
                    <td style={{ ...td, color: '#9ca3af' }}>{c.nrDoc ?? '—'}</td>
                    <td style={{ ...td, fontWeight: 600, color: NAVY }}>{c.produto.nome}{c.qualidade && <span style={{ fontSize: 10, color: ORANGE, marginLeft: 6, fontWeight: 700 }}>{c.qualidade}</span>}</td>
                    <td style={td}>{c.quantidadeTotal.toFixed(1)}</td>
                    <td style={{ ...td, color: PINK }}>{c.descarte > 0 ? c.descarte.toFixed(1) : '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{liq.toFixed(1)}</td>
                    <td style={td}>{fmtBRL(c.preco)}</td>
                    <td style={{ ...td, fontWeight: 700, color: GREEN, textAlign: 'right' }}>{fmtBRL(liq * c.preco)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}><td colSpan={7} style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: NAVY }}>Total Bruto</td><td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 800, color: GREEN, textAlign: 'right' }}>{fmtBRL(bruto)}</td></tr></tfoot>
          </table>
        </div>
      )}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 10px' }}>Resumo por participante</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {partes.map(parte => {
          const fator = bruto > 0 ? parte.bruto / bruto : 0
          const pctReal = Math.round(fator * 100)
          return (
            <div key={parte.nome} style={{ flex: 1, minWidth: 220, border: `1.5px solid ${parte.cor}20`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ backgroundColor: `${parte.cor}10`, padding: '10px 14px', borderBottom: `1px solid ${parte.cor}15` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: parte.cor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{parte.tipo}</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: NAVY }}>{parte.nome}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{pctReal}% da produção</p>
              </div>
              <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Bruto</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{fmtBRL(parte.bruto)}</span>
                </div>
                {fechamento.combustivel > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 12, color: '#9ca3af' }}>Combustível</span><span style={{ fontSize: 12, color: ORANGE }}>- {fmtBRL(fechamento.combustivel * fator)}</span></div>}
                {fechamento.bandejaEmbalagem > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 12, color: '#9ca3af' }}>Bandeja/Embalagens</span><span style={{ fontSize: 12, color: ORANGE }}>- {fmtBRL(fechamento.bandejaEmbalagem * fator)}</span></div>}
                {fechamento.valesDinheiro > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 12, color: '#9ca3af' }}>Vales Dinheiro</span><span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(fechamento.valesDinheiro * fator)}</span></div>}
                {fechamento.creditos > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 12, color: '#9ca3af' }}>Créditos</span><span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(fechamento.creditos * fator)}</span></div>}
                {fechamento.debitosAnteriores > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 12, color: '#9ca3af' }}>Déb. Anteriores</span><span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(fechamento.debitosAnteriores * fator)}</span></div>}
                {parte.vales > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 12, color: '#9ca3af' }}>Vales vinculados</span><span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(parte.vales)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4, borderTop: `2px solid ${parte.cor}20` }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>A Receber</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: parte.liquido >= 0 ? parte.cor : PINK }}>{fmtBRL(parte.liquido)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FechamentoCard({ f, produtor }: { f: Fechamento; produtor: Produtor }) {
  const [aberto, setAberto]             = useState(false)
  const [detalhe, setDetalhe]           = useState<FechamentoDetalhe | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const totalParceirosPct = produtor.parceiros.reduce((s, p) => s + p.percentual, 0)
  const percProdutor      = Math.max(0, 100 - totalParceirosPct)
  const totalDed          = f.combustivel + f.bandejaEmbalagem + f.valesDinheiro + f.creditos + f.debitosAnteriores

  async function toggle() {
    if (!aberto && !detalhe) {
      setLoadingDetalhe(true)
      const data = await fetch(`/api/fechamento/${f.id}`).then(r => r.json())
      setDetalhe(data)
      setLoadingDetalhe(false)
    }
    setAberto(v => !v)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ backgroundColor: 'white', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden', border: aberto ? `1.5px solid ${GREEN}30` : '1.5px solid transparent' }}>
      <div onClick={toggle} style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: NAVY }}>{fmt(f.dataInicio)} – {fmt(f.dataFim)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>Pagamento: {fmt(f.dataPagamento)}</p>
        </div>
        {totalDed > 0 && (
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Deduções</p>
            <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 700, color: PINK }}>- {fmtBRL(totalDed)}</p>
          </div>
        )}
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, backgroundColor: f.status === 'PAGO' ? '#f0faf0' : '#fff7ed', color: f.status === 'PAGO' ? GREEN : ORANGE }}>
          {f.status === 'PAGO' ? 'Pago' : 'Pendente'}
        </span>
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          <motion.button onClick={() => window.open(`/imprimir/pagamento/${f.id}`, '_blank')}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faPrint} style={{ fontSize: 11 }} />
            {produtor.parceiros.length > 0 ? `Produtor (${percProdutor}%)` : 'Imprimir'}
          </motion.button>
          {produtor.parceiros.map((p, pi) => (
            <motion.button key={p.id} onClick={() => window.open(`/imprimir/pagamento/${f.id}/meeiro?p=${pi}`, '_blank')}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', backgroundColor: PURPLE, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faPrint} style={{ fontSize: 11 }} />
              {p.nome} ({p.percentual}%)
            </motion.button>
          ))}
        </div>
        <FontAwesomeIcon icon={aberto ? faChevronUp : faChevronDown} style={{ fontSize: 13, color: '#9ca3af', flexShrink: 0 }} />
      </div>
      <AnimatePresence>
        {aberto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
              {loadingDetalhe ? <p style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Carregando...</p>
                : detalhe ? <div style={{ paddingTop: 16 }}><RelatorioInline fechamento={detalhe} produtor={produtor} /></div>
                : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
export default function PagamentoClient() {
  const [produtores, setProdutores]   = useState<Produtor[]>([])
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [lancamentos, setLancamentos] = useState<ColheitaItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingLanc, setLoadingLanc] = useState(false)
  const [busca, setBusca]             = useState('')
  const [produtorSel, setProdutorSel] = useState<Produtor | null>(null)
  const [aba, setAba]                 = useState<'fechamentos' | 'lancamentos'>('fechamentos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aprovados' | 'pendentes'>('todos')
  const [aprovando, setAprovando]     = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/produtores').then(r => r.json()),
      fetch('/api/fechamento').then(r => r.json()),
    ]).then(([p, f]) => { setProdutores(p); setFechamentos(f) }).finally(() => setLoading(false))
  }, [])

  const carregarLancamentos = useCallback(async (produtorId: string) => {
    setLoadingLanc(true)
    const data = await fetch(`/api/colheita?produtorId=${produtorId}`).then(r => r.json())
    setLancamentos(data)
    setLoadingLanc(false)
  }, [])

  function selecionar(produtor: Produtor, label: string) {
    setProdutorSel(produtor)
    setBusca(label)
    carregarLancamentos(produtor.id)
  }
  function limpar() { setProdutorSel(null); setBusca(''); setLancamentos([]) }

  async function toggleAprovado(id: string, atual: boolean) {
    setAprovando(id)
    try {
      await fetch(`/api/colheita/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovado: !atual }),
      })
      setLancamentos(prev => prev.map(c => c.id === id ? { ...c, aprovado: !atual } : c))
    } finally { setAprovando(null) }
  }

  const sugestoes = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q || produtorSel) return []
    const res: { tipo: 'produtor' | 'meeiro'; label: string; sub: string; produtor: Produtor }[] = []
    for (const p of produtores) {
      if (p.nome.toLowerCase().includes(q) || p.cpf?.includes(q))
        res.push({ tipo: 'produtor', label: p.nome, sub: p.cpf ?? '', produtor: p })
      for (const parc of p.parceiros)
        if (parc.nome.toLowerCase().includes(q))
          res.push({ tipo: 'meeiro', label: parc.nome, sub: `Meeiro de ${p.nome}`, produtor: p })
    }
    return res.slice(0, 8)
  }, [busca, produtores, produtorSel])

  const fechamentosDoProd = useMemo(() =>
    produtorSel ? fechamentos.filter(f => f.produtor.id === produtorSel.id) : [],
    [produtorSel, fechamentos])

  const lancamentosFiltrados = useMemo(() => {
    if (filtroStatus === 'aprovados')  return lancamentos.filter(c => c.aprovado)
    if (filtroStatus === 'pendentes')  return lancamentos.filter(c => !c.aprovado)
    return lancamentos
  }, [lancamentos, filtroStatus])

  const totalParceirosPct = produtorSel ? produtorSel.parceiros.reduce((s, p) => s + p.percentual, 0) : 0
  const percProdutor      = Math.max(0, 100 - totalParceirosPct)

  const totalBruto   = lancamentosFiltrados.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalQtd     = lancamentosFiltrados.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const qtdAprovados = lancamentos.filter(c => c.aprovado).length
  const qtdPendentes = lancamentos.filter(c => !c.aprovado).length

  if (loading) return <PageSkeleton cards={0} rows={4} />

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 10, padding: '14px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb',
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Demonstrativos</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Lançamentos e fechamentos por produtor</p>
      </motion.div>

      {/* Busca */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ position: 'relative', maxWidth: 520, marginBottom: 28 }}>
        <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9ca3af', pointerEvents: 'none', zIndex: 1 }} />
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); if (produtorSel) setProdutorSel(null) }}
          placeholder="Nome do produtor ou meeiro..."
          autoFocus
          style={{ width: '100%', padding: '13px 40px 13px 44px', border: `2px solid ${produtorSel ? GREEN : '#e5e7eb'}`, borderRadius: 12, fontSize: 15, outline: 'none', color: NAVY, boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        />
        {busca && (
          <button onClick={limpar} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        )}
        <AnimatePresence>
          {sugestoes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden' }}>
              {sugestoes.map((s, i) => (
                <motion.button key={i} onMouseDown={() => selecionar(s.produtor, s.label)}
                  whileHover={{ backgroundColor: '#f8fffe' }}
                  style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < sugestoes.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, backgroundColor: s.tipo === 'produtor' ? `${GREEN}15` : `${PURPLE}15`, color: s.tipo === 'produtor' ? GREEN : PURPLE, textTransform: 'uppercase', flexShrink: 0 }}>
                    {s.tipo === 'produtor' ? 'Produtor' : 'Meeiro'}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: NAVY }}>{s.label}</p>
                    {s.sub && <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{s.sub}</p>}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Conteúdo */}
      <AnimatePresence mode="wait">
        {produtorSel && (
          <motion.div key={produtorSel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Header do produtor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{produtorSel.nome}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, backgroundColor: `${GREEN}12`, padding: '2px 10px', borderRadius: 20 }}>{percProdutor}%</span>
                {produtorSel.parceiros.map(p => (
                  <span key={p.id} style={{ fontSize: 12, fontWeight: 700, color: PURPLE, backgroundColor: `${PURPLE}10`, padding: '2px 10px', borderRadius: 20 }}>
                    {p.nome} {p.percentual}%
                  </span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #f3f4f6', marginBottom: 20 }}>
              {([
                { id: 'fechamentos', label: 'Fechamentos', count: fechamentosDoProd.length },
                { id: 'lancamentos', label: 'Lançamentos', count: lancamentos.length },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setAba(tab.id)}
                  style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: aba === tab.id ? `3px solid ${NAVY}` : '3px solid transparent', marginBottom: -2, fontSize: 14, fontWeight: aba === tab.id ? 700 : 500, color: aba === tab.id ? NAVY : '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {tab.label}
                  <span style={{ fontSize: 11, fontWeight: 700, background: aba === tab.id ? NAVY : '#e5e7eb', color: aba === tab.id ? '#fff' : '#6b7280', borderRadius: 999, padding: '1px 7px' }}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* ── ABA FECHAMENTOS ─────────────────────────────────── */}
            {aba === 'fechamentos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <a href="/lavoura/pagamento/novo" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', backgroundColor: GREEN, color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12 }} /> Novo Fechamento
                  </a>
                </div>
                {fechamentosDoProd.length === 0 ? (
                  <div style={{ backgroundColor: 'white', borderRadius: 12, padding: '40px 24px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', color: '#9ca3af' }}>
                    <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 30, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                    <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>Nenhum fechamento para {produtorSel.nome}</p>
                  </div>
                ) : fechamentosDoProd.map(f => (
                  <FechamentoCard key={f.id} f={f} produtor={produtorSel} />
                ))}
              </div>
            )}

            {/* ── ABA LANÇAMENTOS ─────────────────────────────────── */}
            {aba === 'lancamentos' && (
              <div>
                {/* Barra de ações */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                  {/* Filtro status */}
                  <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
                    {([['todos','Todos'], ['aprovados','Aprovados'], ['pendentes','Pendentes']] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setFiltroStatus(val)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filtroStatus === val ? '#fff' : 'transparent', color: filtroStatus === val ? NAVY : '#6b7280', boxShadow: filtroStatus === val ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                        {label}
                        {val === 'aprovados'  && <span style={{ marginLeft: 5, fontSize: 10, background: `${GREEN}20`, color: GREEN, borderRadius: 10, padding: '1px 6px' }}>{qtdAprovados}</span>}
                        {val === 'pendentes'  && <span style={{ marginLeft: 5, fontSize: 10, background: `${ORANGE}20`, color: ORANGE, borderRadius: 10, padding: '1px 6px' }}>{qtdPendentes}</span>}
                      </button>
                    ))}
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Aprovar todos pendentes */}
                  {qtdPendentes > 0 && (
                    <button onClick={async () => {
                      const pendentes = lancamentos.filter(c => !c.aprovado)
                      for (const c of pendentes) await toggleAprovado(c.id, false)
                    }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `${GREEN}15`, color: GREEN, border: `1px solid ${GREEN}40`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faCheck} /> Aprovar todos ({qtdPendentes})
                    </button>
                  )}

                  {/* PDF */}
                  <button onClick={() => gerarPDFLancamentos(produtorSel, lancamentos, filtroStatus)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: NAVY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faDownload} /> PDF
                  </button>
                </div>

                {/* Cards de resumo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={{ ...cardStyle, borderLeft: `3px solid ${GREEN}` }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Total Bruto</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: GREEN }}>{fmtBRL(totalBruto)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{fmtN(totalQtd, 0)} caixas</div>
                  </div>
                  <div style={{ ...cardStyle, borderLeft: `3px solid ${NAVY}` }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>A Receber ({percProdutor}%)</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{fmtBRL(totalBruto * percProdutor / 100)}</div>
                  </div>
                  {produtorSel.parceiros.map(p => (
                    <div key={p.id} style={{ ...cardStyle, borderLeft: `3px solid ${PURPLE}` }}>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Meeiro {p.nome} ({p.percentual}%)</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: PURPLE }}>{fmtBRL(totalBruto * p.percentual / 100)}</div>
                    </div>
                  ))}
                </div>

                {/* Tabela de lançamentos */}
                {loadingLanc ? (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>Carregando lançamentos...</div>
                ) : lancamentosFiltrados.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>Nenhum lançamento encontrado</div>
                ) : (
                  <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          {['Data', 'Produto', 'Roça', 'Qtde', 'Preço/cx', 'Sub-total', 'Meeiro', 'Status', 'Ação'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lancamentosFiltrados.map((c, i) => {
                          const sub    = (c.quantidadeTotal - c.descarte) * c.preco
                          const meeiro = c.parceiro?.nome ?? (produtorSel.parceiros[0]?.nome ?? '—')
                          return (
                            <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '11px 14px', color: '#374151' }}>{fmt(c.data)}</td>
                              <td style={{ padding: '11px 14px', fontWeight: 600, color: NAVY }}>
                                {c.produto.nome}
                                {c.qualidade && <span style={{ fontSize: 10, color: ORANGE, marginLeft: 5, fontWeight: 700 }}>{c.qualidade}</span>}
                              </td>
                              <td style={{ padding: '11px 14px', color: '#6b7280' }}>{c.roca?.nome ?? '—'}</td>
                              <td style={{ padding: '11px 14px', color: '#374151' }}>{fmtN(c.quantidadeTotal, 0)}</td>
                              <td style={{ padding: '11px 14px', color: '#374151' }}>{fmtBRL(c.preco)}</td>
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: GREEN }}>{fmtBRL(sub)}</td>
                              <td style={{ padding: '11px 14px', color: PURPLE, fontSize: 12 }}>{meeiro}</td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.aprovado ? `${GREEN}15` : `${ORANGE}15`, color: c.aprovado ? GREEN : ORANGE }}>
                                  {c.aprovado ? '✓ Aprovado' : '⏳ Pendente'}
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <button
                                  disabled={aprovando === c.id}
                                  onClick={() => toggleAprovado(c.id, c.aprovado)}
                                  style={{ padding: '5px 12px', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: c.aprovado ? `${PINK}15` : `${GREEN}15`, color: c.aprovado ? PINK : GREEN, opacity: aprovando === c.id ? 0.5 : 1 }}>
                                  {aprovando === c.id ? '...' : c.aprovado ? '✗ Rejeitar' : '✓ Aprovar'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {!produtorSel && !busca && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faSearch} style={{ fontSize: 40, opacity: 0.2, display: 'block', margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 600, fontSize: 15, color: '#6b7280', margin: '0 0 4px' }}>Digite o nome para começar</p>
            <p style={{ fontSize: 13, margin: 0 }}>Produtores e meeiros cadastrados no sistema</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
