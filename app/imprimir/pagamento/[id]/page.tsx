'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { calcularFechamento, arredondarCaixas } from '@/lib/fechamento-calc'

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
type ValeLinked = { id: string; valor: number; data: string; observacao: string | null }
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
  const [valesEmAberto, setValesEmAberto] = useState<ValeLinked[]>([])
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
      a.download = `recibo-produtor-${fechamento?.produtor.nome ?? 'produtor'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      window.open('whatsapp://', '_blank')
    } finally { setCapturing(false) }
  }

  useEffect(() => {
    fetch(`/api/fechamento/${id}`).then(r => r.json()).then(setFechamento)
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => setUsuario(d?.name ?? ''))
  }, [id])

  useEffect(() => {
    if (!fechamento?.produtor.id) return
    fetch(`/api/vales?produtorId=${fechamento.produtor.id}&status=ABERTO`)
      .then(r => r.json())
      .then((vs: { id: string; valor: string | number; data: string; observacao: string | null }[]) =>
        setValesEmAberto(
          Array.isArray(vs)
            ? vs.map(v => ({ id: v.id, valor: Number(v.valor), data: v.data, observacao: v.observacao }))
            : [],
        ),
      )
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

  const abatimEmprestimo = vales.reduce((s, v) => s + Number(v.valor), 0)
  const valesAbertos = valesEmAberto.reduce((s, v) => s + v.valor, 0)
  const calculo = calcularFechamento(
    colheitas,
    { combustivel, bandejaEmbalagem, valesDinheiro, creditos, debitosAnteriores },
    abatimEmprestimo,
  )
  const totalBruto = calculo.totalBruto
  const totalQtd = calculo.totalCaixas
  const donoBruto = calculo.produtor.bruto
  const fatorProdutor = totalBruto > 0 ? donoBruto / totalBruto : 0

  const descEmb = bandejaEmbalagem * fatorProdutor
  const outrasDeducoes = (combustivel + valesDinheiro + creditos + debitosAnteriores) * fatorProdutor
  const valorRecebido = calculo.produtor.liquido

  const rocas = Array.from(new Set(colheitas.map(c => c.roca?.nome).filter(Boolean))) as string[]
  // Só meeiros com participação nas colheitas do período (evita linhas zeradas)
  const parceirosComParticipacao = produtor.parceiros.filter(p => calculo.meeiros.some(m => m.parceiroId === p.id))

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
        /* Mobile: recibo tem largura fixa; permite scroll horizontal na tela
           (nunca na impressão) para não ser cortado no celular. */
        @media screen and (max-width: 767px) { html, body { overflow-x: auto; } }
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
              const caixasMeeiro = c.parceiroId ? arredondarCaixas(liquido * (c.percParceiro / 100)) : 0
              const repasse = sub - caixasMeeiro * c.preco
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

        {/* Detalha de onde vem o total da coluna "Abatim. emprést." */}
        {vales.length > 0 && (
          <div style={{ fontSize: 10, color: '#555', margin: '0 0 10px' }}>
            <div style={{ fontWeight: 700 }}>
              Abatim. emprést. ({fmtN(abatimEmprestimo)}) refere-se {vales.length === 1 ? 'ao vale' : `aos ${vales.length} vales`}:
            </div>
            {/* O descritivo de cada linha é a observação escrita no vale */}
            {vales.map(v => (
              <div key={v.id} style={{ paddingLeft: 10 }}>
                • {fmtDate(v.data)} — {v.observacao?.trim() ? `${v.observacao.trim()} — ` : ''}{fmtN(Number(v.valor))}
              </div>
            ))}
          </div>
        )}

        {/* Descreve a coluna "Empr. em aberto" — sem isto o produtor via só um
            valor solto, sem saber de que empréstimo se tratava. Mesmo formato do
            bloco de abatimento acima. */}
        {valesEmAberto.length > 0 && (
          <div style={{ fontSize: 10, color: '#555', margin: '0 0 10px' }}>
            <div style={{ fontWeight: 700 }}>
              Empr. em aberto ({fmtN(valesAbertos)}) refere-se {valesEmAberto.length === 1 ? 'ao vale' : `aos ${valesEmAberto.length} vales`} ainda não descontados:
            </div>
            {valesEmAberto.map(v => (
              <div key={v.id} style={{ paddingLeft: 10 }}>
                • {fmtDate(v.data)} — {v.observacao?.trim() ? `${v.observacao.trim()} — ` : ''}{fmtN(v.valor)}
              </div>
            ))}
          </div>
        )}

        {outrasDeducoes > 0 && (
          <p style={{ fontSize: 10, color: '#555', margin: '0 0 10px' }}>
            Outras deduções (combustível, vales de dinheiro, créditos, débitos anteriores) já incluídas no valor recebido: - {fmtN(outrasDeducoes)}
          </p>
        )}

        <p style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 0' }}>
          Total líquido a receber pelo produtor: <span style={{ color: NAVY }}>{fmtN(valorRecebido)}</span>
        </p>

        {/* Detalhamento por meeiro (informação complementar) */}
        {parceirosComParticipacao.length > 0 && (
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
                {parceirosComParticipacao.map(p => {
                  const participacao = calculo.meeiros.find(m => m.parceiroId === p.id)
                  const valorMeeiro = participacao?.liquido ?? 0
                  // Bruto do produtor referente às mesmas colheitas desse meeiro (a fatia complementar)
                  const brutoProdutor = colheitas.reduce((s, c) => {
                    if (c.parceiroId !== p.id) return s
                    const qtdMeeiro = arredondarCaixas((c.quantidadeTotal - c.descarte) * (c.percParceiro / 100))
                    return s + ((c.quantidadeTotal - c.descarte) - qtdMeeiro) * c.preco
                  }, 0)
                  const fatorProdutorRow = totalBruto > 0 ? brutoProdutor / totalBruto : 0
                  const valorProdutorMeeiro = brutoProdutor - calculo.totalDeducoes * fatorProdutorRow
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
        </div>{/* end contentRef */}
      </div>
    </>
  )
}
