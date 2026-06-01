'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell, faHandshake, faUser, faPhone, faCheckCircle,
  faExclamationTriangle, faClock, faShoppingBag, faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons'
import { formatCurrency } from '@/lib/utils'

const NAVY   = '#2d3561'
const GREEN  = '#5ab952'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'
const YELLOW = '#f59e0b'

type Fiado = {
  id: string; numero: number
  clienteNome: string; telefone: string | null
  valor: number; dataVenda: string; dataCobranca: string | null; status: string
}

type ClienteResumo = {
  id: string; nome: string; telefone: string | null; email: string | null
  totalComprado: number; qtdPedidos: number; ultimaCompra: string
}

function diasRestantes(dataCobranca: string | null, hoje: string): number | null {
  if (!dataCobranca) return null
  const venc = new Date(dataCobranca); venc.setHours(0, 0, 0, 0)
  const hj   = new Date(hoje);        hj.setHours(0, 0, 0, 0)
  return Math.round((venc.getTime() - hj.getTime()) / (1000 * 60 * 60 * 24))
}

function BadgeDias({ dias }: { dias: number | null }) {
  if (dias === null) return (
    <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>
      Sem prazo
    </span>
  )
  if (dias < 0) return (
    <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: PINK, padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
      <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 9 }} />
      {Math.abs(dias)}d em atraso
    </span>
  )
  if (dias === 0) return (
    <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: ORANGE, padding: '3px 10px', borderRadius: 20 }}>
      Vence hoje
    </span>
  )
  if (dias <= 7) return (
    <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: ORANGE, padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
      <FontAwesomeIcon icon={faClock} style={{ fontSize: 9 }} />
      {dias}d restantes
    </span>
  )
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: GREEN, background: `${GREEN}18`, padding: '3px 10px', borderRadius: 20 }}>
      {dias}d restantes
    </span>
  )
}

export default function AvisosClient({
  fiados, clientes, hoje,
}: { fiados: Fiado[]; clientes: ClienteResumo[]; hoje: string }) {
  const router = useRouter()
  const [fiadosState, setFiadosState] = useState(fiados)
  const [markingId, setMarkingId]   = useState<string | null>(null)

  const atrasados = fiadosState.filter(f => {
    const d = diasRestantes(f.dataCobranca, hoje)
    return d !== null && d < 0
  })
  const hojeVenc = fiadosState.filter(f => diasRestantes(f.dataCobranca, hoje) === 0)
  const proximosSete = fiadosState.filter(f => {
    const d = diasRestantes(f.dataCobranca, hoje)
    return d !== null && d > 0 && d <= 7
  })

  async function marcarPago(id: string) {
    setMarkingId(id)
    await fetch(`/api/pedidos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAGO' }),
    })
    setFiadosState(prev => prev.filter(f => f.id !== id))
    setMarkingId(null)
    router.refresh()
  }

  const totalFiado = fiadosState.reduce((s, f) => s + f.valor, 0)

  return (
    <div style={{ padding: '0 4px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${YELLOW}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={faBell} style={{ fontSize: 20, color: YELLOW }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: 0 }}>Avisos</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Cobranças fiado e histórico de clientes</p>
        </div>
      </div>

      {/* KPIs fiado */}
      <div className="kpi-grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total em aberto',  value: formatCurrency(totalFiado),       color: NAVY,   sub: `${fiadosState.length} cobranças` },
          { label: 'Em atraso',        value: String(atrasados.length),         color: PINK,   sub: 'cobranças vencidas' },
          { label: 'Vencem hoje',      value: String(hojeVenc.length),          color: ORANGE, sub: 'cobranças hoje' },
          { label: 'Próximos 7 dias',  value: String(proximosSete.length),      color: BLUE,   sub: 'cobranças chegando' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <p className="kpi-val" style={{ fontSize: 22, fontWeight: 700, color: k.color, margin: '0 0 4px', wordBreak: 'break-word' }}>{k.value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: NAVY, margin: '0 0 2px' }}>{k.label}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Lista de fiados */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FontAwesomeIcon icon={faHandshake} style={{ fontSize: 16, color: ORANGE }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Cobranças Fiado em Aberto</span>
          {fiadosState.length > 0 && (
            <span style={{ background: ORANGE, color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 8px' }}>
              {fiadosState.length}
            </span>
          )}
        </div>

        {fiadosState.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 36, marginBottom: 10, color: `${GREEN}80` }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Nenhuma cobrança fiado em aberto</p>
          </div>
        ) : (
          <div>
            {fiadosState.map(f => {
              const dias = diasRestantes(f.dataCobranca, hoje)
              const atrasado = dias !== null && dias < 0
              return (
                <div
                  key={f.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid #f9fafb',
                    background: atrasado ? '#fff5f7' : 'white',
                    flexWrap: 'wrap', gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${ORANGE}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FontAwesomeIcon icon={faUser} style={{ fontSize: 14, color: ORANGE }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>{f.clienteNome}</p>
                      {f.telefone && (
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FontAwesomeIcon icon={faPhone} style={{ fontSize: 10 }} />
                          {f.telefone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>{formatCurrency(f.valor)}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                        Pedido #{f.numero} · {new Date(f.dataVenda).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <BadgeDias dias={dias} />
                      {f.dataCobranca && (
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                          Vence: {new Date(f.dataCobranca).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => marcarPago(f.id)}
                      disabled={markingId === f.id}
                      style={{
                        padding: '8px 16px', background: markingId === f.id ? '#d1d5db' : GREEN,
                        color: 'white', border: 'none', borderRadius: 8,
                        fontSize: 12, fontWeight: 700, cursor: markingId === f.id ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 12 }} />
                      {markingId === f.id ? 'Salvando...' : 'Recebido'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Histórico por cliente */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FontAwesomeIcon icon={faShoppingBag} style={{ fontSize: 16, color: BLUE }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Histórico de Clientes</span>
        </div>

        {clientes.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <p style={{ margin: 0 }}>Nenhuma compra registrada ainda</p>
          </div>
        ) : (
          <div>
            {clientes.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', borderBottom: i < clientes.length - 1 ? '1px solid #f9fafb' : 'none',
                  flexWrap: 'wrap', gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${BLUE}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FontAwesomeIcon icon={faUser} style={{ fontSize: 14, color: BLUE }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>{c.nome}</p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                      {c.telefone && (
                        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FontAwesomeIcon icon={faPhone} style={{ fontSize: 10 }} />
                          {c.telefone}
                        </span>
                      )}
                      {c.email && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{c.email}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: GREEN, margin: 0 }}>{formatCurrency(c.totalComprado)}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>total comprado</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>{c.qtdPedidos}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{c.qtdPedidos === 1 ? 'pedido' : 'pedidos'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: 11, color: '#9ca3af' }} />
                      Última compra
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                      {new Date(c.ultimaCompra).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
