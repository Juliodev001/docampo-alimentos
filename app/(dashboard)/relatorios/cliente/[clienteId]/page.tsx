'use client'
import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faFileLines, faCheckSquare, faSquare } from '@fortawesome/free-solid-svg-icons'

const NAVY = '#2d3561'
const GREEN = '#5ab952'

type Item = { id: string; produto: string; quantidade: number; total: number }
type Pedido = {
  id: string; numero: number; tipo: string; data: string
  formaPagamento: string | null; dataCobranca: string | null
  status: string; totalValor: number; itens: Item[]
}
type Cliente = { id: string; nome: string }
type ApiData = { cliente: Cliente; pedidos: Pedido[] }

function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#6b7280' }}>Carregando...</div>}>
      <SelecaoPedidosPage />
    </Suspense>
  )
}

function SelecaoPedidosPage() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const dataInicio = searchParams.get('dataInicio') ?? ''
  const dataFim    = searchParams.get('dataFim') ?? ''

  const [apiData, setApiData]         = useState<ApiData | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [carregando, setCarregando]   = useState(true)
  const [erro, setErro]               = useState('')

  useEffect(() => {
    const p = new URLSearchParams()
    if (dataInicio && dataFim) { p.set('dataInicio', dataInicio); p.set('dataFim', dataFim) }
    const qs = p.toString()
    fetch(`/api/relatorio-cliente/${clienteId}${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then((d: ApiData) => {
        setApiData(d)
        setSelecionados(new Set(d.pedidos.map(p => p.id)))
        setCarregando(false)
      })
      .catch(() => { setErro('Erro ao carregar pedidos.'); setCarregando(false) })
  }, [clienteId, dataInicio, dataFim])

  function toggleTodos() {
    if (!apiData) return
    setSelecionados(prev =>
      prev.size === apiData.pedidos.length
        ? new Set()
        : new Set(apiData.pedidos.map(p => p.id))
    )
  }

  function togglePedido(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function gerarPDF() {
    if (selecionados.size === 0) return
    const ids = Array.from(selecionados).join(',')
    window.open(`/imprimir/relatorio-cliente/${clienteId}?pedidoIds=${ids}`, '_blank')
  }

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#6b7280', fontSize: 15 }}>
      Carregando pedidos...
    </div>
  )

  if (erro || !apiData) return (
    <div style={{ color: '#e8255a', padding: 24 }}>{erro || 'Erro desconhecido.'}</div>
  )

  const { cliente, pedidos } = apiData
  const todosSelected = selecionados.size === pedidos.length && pedidos.length > 0
  const periodo = dataInicio && dataFim
    ? `${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`
    : 'todos os pedidos'

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '4px 0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 12 }} />
          Voltar
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>
          {cliente.nome}
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
          Selecione os pedidos para incluir no relatório · <span style={{ fontWeight: 500 }}>{periodo}</span>
        </p>
      </div>

      {/* Barra de controles */}
      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: '14px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleTodos}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: NAVY, fontSize: 14, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
          >
            <FontAwesomeIcon
              icon={todosSelected ? faCheckSquare : faSquare}
              style={{ fontSize: 20, color: todosSelected ? GREEN : '#d1d5db' }}
            />
            {todosSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>
            {selecionados.size} de {pedidos.length} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={gerarPDF}
          disabled={selecionados.size === 0}
          style={{
            padding: '10px 22px',
            backgroundColor: selecionados.size === 0 ? '#e5e7eb' : NAVY,
            color: selecionados.size === 0 ? '#9ca3af' : 'white',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: selecionados.size === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13 }} />
          Gerar PDF
        </button>
      </div>

      {/* Lista de pedidos */}
      {pedidos.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          Nenhum pedido encontrado para o período selecionado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pedidos.map(p => {
            const sel = selecionados.has(p.id)
            const numFormatado = p.tipo === 'PDV' ? `PDV-${p.numero}` : `#${p.numero}`
            const resumoItens = p.itens.slice(0, 2).map(i => i.produto).join(', ') + (p.itens.length > 2 ? ` +${p.itens.length - 2} mais` : '')
            return (
              <div
                key={p.id}
                onClick={() => togglePedido(p.id)}
                style={{
                  backgroundColor: 'white', borderRadius: 12, padding: '14px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: `2px solid ${sel ? NAVY + '40' : 'transparent'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'border-color 0.15s',
                }}
              >
                <FontAwesomeIcon
                  icon={sel ? faCheckSquare : faSquare}
                  style={{ fontSize: 22, color: sel ? GREEN : '#d1d5db', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{numFormatado}</span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{fmtDate(p.data)}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</span>
                  </div>
                  {resumoItens && (
                    <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {resumoItens}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>R$ {fmtN(Number(p.totalValor))}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: p.status === 'PAGO' ? '#16a34a' : p.formaPagamento === 'FIADO' ? '#b45309' : '#6b7280' }}>
                    {p.status === 'PAGO' ? 'Pago' : p.formaPagamento === 'FIADO' ? 'Fiado' : (p.status === 'ENTREGUE' ? 'Entregue' : p.status === 'CONFIRMADO' ? 'Confirmado' : p.status)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total dos selecionados */}
      {selecionados.size > 0 && (
        <div style={{ marginTop: 16, backgroundColor: `${NAVY}08`, border: `1.5px solid ${NAVY}20`, borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>
            Total dos {selecionados.size} pedido{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>
            R$ {fmtN(pedidos.filter(p => selecionados.has(p.id)).reduce((s, p) => s + Number(p.totalValor), 0))}
          </span>
        </div>
      )}
    </div>
  )
}
