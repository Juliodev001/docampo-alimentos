'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

const NAVY = '#2d3561'

type Produto = { id: string; nome: string }
type Parceiro = { id: string; nome: string; percentual: number; valorEmba: number }
type Produtor = { nome: string; cpf: string | null; parceiros: Parceiro[] }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null
  parceiroId: string | null; percParceiro: number; bandeja: number
  roca: { nome: string } | null
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
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

function ImprimirPagamentoMeeiro() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [usuario, setUsuario] = useState('')
  const [valesAbertos, setValesAbertos] = useState(0)
  const printed = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [emitidoEm] = useState(() => new Date())

  async function captureImage(): Promise<Blob> {
    const html2canvas = (await import('html2canvas-pro')).default
    const el = contentRef.current!
    const canvas = await html2canvas(el, {
      scale: 2, backgroundColor: '#ffffff', useCORS: true,
      width: el.scrollWidth, height: el.scrollHeight,
      windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
      scrollX: 0, scrollY: 0,
    })
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.95))
  }

  async function handleWhatsApp() {
    setCapturing(true)
    try {
      const blob = await captureImage()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-meeiro-${meeiro?.nome ?? 'meeiro'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      window.open('whatsapp://', '_blank')
    } finally { setCapturing(false) }
  }

  // ?p=0 selects which parceiro (meeiro) to print; defaults to 0
  const parceiroIdx = parseInt(searchParams.get('p') ?? '0', 10)

  useEffect(() => {
    fetch(`/api/fechamento/${id}`).then(r => r.json()).then(setFechamento)
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => setUsuario(d?.name ?? ''))
  }, [id])

  const meeiro = fechamento?.produtor.parceiros[parceiroIdx]

  useEffect(() => {
    if (!meeiro?.id) return
    fetch(`/api/vales?parceiroId=${meeiro.id}&status=ABERTO`)
      .then(r => r.json())
      .then((vs: { valor: number }[]) => setValesAbertos(vs.reduce((s, v) => s + Number(v.valor), 0)))
  }, [meeiro?.id])

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

  // Deduções proporcional ao bruto deste meeiro no total geral (exceto embalagem)
  const fator = totalGeralBruto > 0 ? totalFaturaBruto / totalGeralBruto : 0
  const outrasDeducoes = (combustivel + valesDinheiro + creditos + debitosAnteriores) * fator
  const valorRepasse = totalFaturaBruto * (percMeeiro / 100)
  // Desc. embalagem = caixas do parceiro × bandeja do lançamento
  const descEmbMeeiro = colheitasMeeiro.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * (c.percParceiro / 100) * (c.bandeja ?? 0), 0)
  const outrasDeducoesMeeiro = outrasDeducoes * (percMeeiro / 100)
  const abatimEmprestimo = 0
  const valorRecebido = valorRepasse - descEmbMeeiro - outrasDeducoesMeeiro - abatimEmprestimo

  const rocas = Array.from(new Set(colheitasMeeiro.map(c => c.roca?.nome).filter(Boolean))) as string[]

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

      <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

        <div className="no-print" style={{ margin: '10px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={handleWhatsApp} disabled={capturing} style={{ padding: '8px 14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: capturing ? 'wait' : 'pointer', opacity: capturing ? 0.7 : 1 }}>
            {capturing ? 'Gerando...' : '💬 Enviar WhatsApp'}
          </button>
          <button onClick={() => window.close()} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
        </div>

        <div ref={contentRef}>
        <div style={{ width: 480, padding: '10px 8px', fontSize: 10, position: 'relative' }}>

        {/* Marca d'água */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo01.png" alt="" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, opacity: 0.3, zIndex: -1, pointerEvents: 'none', filter: 'grayscale(100%)' }} />

        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo01.png" alt="Do Campo Alimentos" style={{ height: 32, margin: '0 auto 6px', display: 'block', filter: 'grayscale(100%)' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
            Recibo de Repasse ao Parceiro
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
          <span><strong>Outorgado:</strong> {meeiro.nome}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11 }}>
          <span><strong>Inscrição estadual:</strong> —</span>
          <span><strong>Roça:</strong> {rocas.length > 0 ? rocas.join(', ') : '—'} (Produtor: {produtor.nome})</span>
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
            {colheitasMeeiro.length === 0 ? (
              <tr><td colSpan={7} style={{ ...cell, textAlign: 'center' as const, color: '#888' }}>Nenhum lançamento neste período</td></tr>
            ) : colheitasMeeiro.map(c => {
              const liquido = c.quantidadeTotal - c.descarte
              const sub = liquido * Number(c.preco)
              const repasse = sub * (c.percParceiro / 100)
              return (
                <tr key={c.id}>
                  <td style={cell}>{fmtDate(c.data)}</td>
                  <td style={{ ...cell, textAlign: 'center' as const }}>{c.nrDoc ?? '—'}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{liquido.toFixed(0)}</td>
                  <td style={cell}>{c.produto.nome}{c.qualidade ? ` — ${c.qualidade}` : ''}</td>
                  <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(Number(c.preco))}</td>
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
              <td style={totCell}>{fmtN(descEmbMeeiro)}</td>
              <td style={totCell}>{fmtN(valesAbertos)}</td>
              <td style={totCell}>{fmtN(abatimEmprestimo)}</td>
              <td style={{ ...totCell, color: NAVY }}>{fmtN(valorRecebido)}</td>
            </tr>
          </tbody>
        </table>

        {outrasDeducoesMeeiro > 0 && (
          <p style={{ fontSize: 10, color: '#555', margin: '0 0 10px' }}>
            Outras deduções (combustível, vales de dinheiro, créditos, débitos anteriores) já incluídas no valor recebido: - {fmtN(outrasDeducoesMeeiro)}
          </p>
        )}

        <p style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 0' }}>
          Total líquido a receber pelo parceiro: <span style={{ color: NAVY }}>{fmtN(valorRecebido)}</span>
        </p>

        </div>
        </div>{/* end contentRef */}
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
