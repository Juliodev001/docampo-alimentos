'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

const NAVY = '#2d3561'

type Item = { id: string; produto: string; unidade: string; quantidade: number; valorUnit: number; desconto: number; total: number }
type Pedido = { id: string; numero: number; tipo: string; data: string; formaPagamento: string | null; dataCobranca: string | null; status: string; totalValor: number; itens: Item[] }
type Endereco = { logradouro: string | null; numero: string | null; bairro: string | null; cidade: string | null; estado: string | null }
type Cliente = { id: string; nome: string; cnpjCpf: string | null; telefone: string | null; email: string | null; enderecos: Endereco[] }

function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtDateTime(d: Date) { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const STATUS_LABEL: Record<string, string> = { ABERTO: 'Pendente', CONFIRMADO: 'Confirmado', ENTREGUE: 'Concluído', PAGO: 'Pago', CANCELADO: 'Cancelado' }

function statusPagamento(p: Pedido): { label: string; color: string } {
  if (p.status === 'PAGO') return { label: 'Pago', color: '#166534' }
  if (p.formaPagamento === 'FIADO') {
    if (!p.dataCobranca) return { label: 'A vencer', color: '#854d0e' }
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const venc = new Date(p.dataCobranca); venc.setHours(0, 0, 0, 0)
    return venc.getTime() < hoje.getTime()
      ? { label: `Vencido em ${fmtDate(p.dataCobranca)}`, color: '#991b1b' }
      : { label: `A vencer em ${fmtDate(p.dataCobranca)}`, color: '#854d0e' }
  }
  return { label: STATUS_LABEL[p.status] ?? p.status, color: '#6b7280' }
}

export default function RelatorioCliente() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const searchParams = useSearchParams()
  const dataFiltro = searchParams.get('data') ?? ''

  const [data, setData] = useState<{ cliente: Cliente; pedidos: Pedido[]; usuario: string } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [emitidoEm] = useState(() => new Date())

  useEffect(() => {
    const url = `/api/relatorio-cliente/${clienteId}${dataFiltro ? `?data=${dataFiltro}` : ''}`
    fetch(url).then(r => r.json()).then(setData)
  }, [clienteId, dataFiltro])

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
      a.download = `extrato-${data?.cliente.nome.replace(/\s+/g, '-').toLowerCase() ?? 'cliente'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      window.open('whatsapp://', '_blank')
    } finally { setCapturing(false) }
  }

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Carregando...
    </div>
  )

  const { cliente, pedidos, usuario } = data
  const endereco = cliente.enderecos[0]
  const enderecoStr = endereco
    ? [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean).join(', ')
    : null

  const todosItens = pedidos.flatMap(p => p.itens.map(it => ({ ...it, pedido: p })))
  const totalQtd = todosItens.reduce((s, it) => s + it.quantidade, 0)
  const subtotal = todosItens.reduce((s, it) => s + it.valorUnit * it.quantidade, 0)
  const totalDescontos = todosItens.reduce((s, it) => s + it.desconto, 0)
  const totalGeral = pedidos.reduce((s, p) => s + p.totalValor, 0)
  const pendenteFiado = pedidos.filter(p => p.formaPagamento === 'FIADO' && p.status !== 'PAGO').reduce((s, p) => s + p.totalValor, 0)

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
              Extrato de Compras do Cliente
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span>Usuário: {usuario || '—'}</span>
            <span>Emitido em: {fmtDateTime(emitidoEm)}</span>
          </div>
          <div style={{ marginBottom: 12, fontSize: 11 }}>
            Período: {dataFiltro ? fmtDate(dataFiltro) : 'não filtrado'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span><strong>Outorgante:</strong> DO CAMPO ALIMENTOS</span>
            <span><strong>Outorgado:</strong> {cliente.nome}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11 }}>
            <span><strong>CPF/CNPJ:</strong> {cliente.cnpjCpf ?? '—'}</span>
            <span><strong>Telefone:</strong> {cliente.telefone ?? '—'}</span>
          </div>
          {enderecoStr && (
            <div style={{ marginBottom: 14, fontSize: 11 }}>
              <strong>Endereço:</strong> {enderecoStr}
            </div>
          )}

          {pedidos.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: 4 }}>
              Nenhuma compra encontrada{dataFiltro ? ` em ${fmtDate(dataFiltro)}` : ''}.
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                <thead>
                  <tr>
                    <th style={hd}>Data</th>
                    <th style={hd}>Nº Pedido</th>
                    <th style={hd}>Quant.</th>
                    <th style={hd}>Produto</th>
                    <th style={{ ...hd, textAlign: 'right' as const }}>Preço</th>
                    <th style={{ ...hd, textAlign: 'right' as const }}>Valor total</th>
                    <th style={hd}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todosItens.map(it => {
                    const st = statusPagamento(it.pedido)
                    return (
                      <tr key={it.id}>
                        <td style={cell}>{fmtDate(it.pedido.data)}</td>
                        <td style={{ ...cell, textAlign: 'center' as const }}>{it.pedido.tipo === 'PDV' ? `PDV-${it.pedido.numero}` : `#${it.pedido.numero}`}</td>
                        <td style={{ ...cell, textAlign: 'right' as const }}>{it.quantidade}</td>
                        <td style={cell}>{it.produto}</td>
                        <td style={{ ...cell, textAlign: 'right' as const }}>{fmtN(it.valorUnit)}</td>
                        <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700 }}>{fmtN(it.total)}</td>
                        <td style={{ ...cell, textAlign: 'center' as const, color: st.color, fontWeight: 700 }}>{st.label}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
                <thead>
                  <tr>
                    <th style={totHd}>Total Pedidos</th>
                    <th style={totHd}>Total Itens</th>
                    <th style={totHd}>Subtotal</th>
                    <th style={totHd}>Descontos</th>
                    <th style={totHd}>Pendente (Fiado)</th>
                    <th style={totHd}>Total Geral</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={totCell}>{pedidos.length}</td>
                    <td style={totCell}>{totalQtd}</td>
                    <td style={totCell}>{fmtN(subtotal)}</td>
                    <td style={totCell}>{fmtN(totalDescontos)}</td>
                    <td style={totCell}>{fmtN(pendenteFiado)}</td>
                    <td style={{ ...totCell, color: NAVY }}>{fmtN(totalGeral)}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 0' }}>
                Total geral das compras: <span style={{ color: NAVY }}>{fmtN(totalGeral)}</span>
              </p>
            </>
          )}

        </div>
        </div>{/* end contentRef */}
      </div>
    </>
  )
}
