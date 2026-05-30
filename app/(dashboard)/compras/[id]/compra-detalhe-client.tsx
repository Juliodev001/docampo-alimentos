'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faBuilding, faCalendar, faTag, faCreditCard, faFileLines, faTrash, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const NAVY  = '#2d3561'
const GREEN = '#5ab952'
const PINK  = '#e8255a'
const ORANGE = '#e87320'
const BLUE  = '#3b82f6'

const categoriaLabel: Record<string, string> = {
  MATERIA_PRIMA:          'Matéria Prima',
  INSUMO:                 'Insumo',
  DESPESA_OPERACIONAL:    'Desp. Operacional',
  DESPESA_ADMINISTRATIVA: 'Desp. Administrativa',
  OUTROS:                 'Outros',
}

const statusCfg: Record<string, { label: string; bg: string; color: string }> = {
  PAGO:    { label: 'Pago',    bg: '#f0faf0', color: '#2d7d28' },
  A_PAGAR: { label: 'A Pagar', bg: '#fff7ed', color: '#b85c00' },
  VENCIDO: { label: 'Vencido', bg: '#fff0f3', color: '#c0113a' },
}

type Item = { id: string; produto: string; unidade: string; quantidade: number; valorUnit: number; total: number }
type Compra = {
  id: string; data: Date | string; vencimento: Date | string; status: string
  totalValor: number; categoria: string; observacao: string | null
  condicao: string; formaPagamento: string
  fornecedor: { nome: string }
  centroCusto: { nome: string } | null
  itens: Item[]
}

function InfoRow({ icon, label, value, color }: { icon: IconDefinition; label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${NAVY}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 15, color: NAVY }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: color ?? NAVY }}>{value}</p>
      </div>
    </div>
  )
}

export default function CompraDetalheClient({ compra: inicial }: { compra: Compra }) {
  const router = useRouter()
  const [compra, setCompra] = useState(inicial)
  const [loadingPago, setLoadingPago] = useState(false)
  const [loadingDel,  setLoadingDel]  = useState(false)

  const status = compra.status === 'A_PAGAR' && new Date(compra.vencimento) < new Date()
    ? 'VENCIDO'
    : compra.status
  const st = statusCfg[status] ?? statusCfg.A_PAGAR

  async function marcarPago() {
    setLoadingPago(true)
    const res = await fetch(`/api/compras/${compra.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAGO' }),
    })
    if (res.ok) setCompra(c => ({ ...c, status: 'PAGO' }))
    setLoadingPago(false)
  }

  async function excluir() {
    if (!confirm('Excluir esta compra? Esta ação não pode ser desfeita.')) return
    setLoadingDel(true)
    await fetch(`/api/compras/${compra.id}`, { method: 'DELETE' })
    router.push('/compras')
  }

  const condicaoLabel: Record<string, string> = { A_VISTA: 'À vista', A_PRAZO: 'A prazo', PARCELADO: 'Parcelado' }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/compras" style={{ display: 'flex', alignItems: 'center', color: '#6b7280', textDecoration: 'none' }}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 20 }} />
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Detalhe da Compra</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>#{compra.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {compra.status !== 'PAGO' && (
            <button
              onClick={marcarPago}
              disabled={loadingPago}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: GREEN, color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: loadingPago ? 'not-allowed' : 'pointer', opacity: loadingPago ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 15 }} />
              {loadingPago ? 'Salvando...' : 'Marcar como Pago'}
            </button>
          )}
          <button
            onClick={excluir}
            disabled={loadingDel}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: '#fff0f3', color: PINK,
              border: `1px solid ${PINK}40`, borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: loadingDel ? 'not-allowed' : 'pointer', opacity: loadingDel ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
            Excluir
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div style={{
        background: st.bg, border: `1px solid ${st.color}30`,
        borderRadius: 10, padding: '10px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: st.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {st.label}
        </span>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          · Vencimento: {formatDate(new Date(compra.vencimento))}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: NAVY }}>
          {formatCurrency(compra.totalValor)}
        </span>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 16px' }}>Dados da Compra</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <InfoRow icon={faBuilding}   label="Fornecedor"   value={compra.fornecedor.nome} />
            <InfoRow icon={faCalendar}   label="Data"         value={formatDate(new Date(compra.data))} />
            <InfoRow icon={faTag}        label="Categoria"    value={categoriaLabel[compra.categoria] ?? compra.categoria} />
            <InfoRow icon={faFileLines}  label="Roça"         value={compra.centroCusto?.nome ?? '—'} />
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 16px' }}>Pagamento</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <InfoRow icon={faCreditCard}  label="Condição"        value={condicaoLabel[compra.condicao] ?? compra.condicao} />
            <InfoRow icon={faCreditCard}  label="Forma"           value={compra.formaPagamento.replace('_', ' ')} />
            <InfoRow icon={faCalendar}    label="Vencimento"      value={formatDate(new Date(compra.vencimento))} color={status === 'VENCIDO' ? PINK : undefined} />
            {compra.observacao && (
              <InfoRow icon={faFileLines} label="Observação" value={compra.observacao} />
            )}
          </div>
        </div>
      </div>

      {/* Itens */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: NAVY }}>Itens</h2>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{compra.itens.length} {compra.itens.length === 1 ? 'item' : 'itens'}</span>
        </div>
        {compra.itens.length === 0 ? (
          <p style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14, margin: 0 }}>
            Nenhum item registrado.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Produto', 'Unidade', 'Qtd', 'Valor Unit.', 'Total'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compra.itens.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: NAVY }}>{item.produto}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{item.unidade}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{item.quantidade}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{formatCurrency(item.valorUnit)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: NAVY }}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #f3f4f6', background: '#f9fafb' }}>
                <td colSpan={4} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: NAVY, textAlign: 'right' }}>Total</td>
                <td style={{ padding: '12px 16px', fontSize: 16, fontWeight: 800, color: GREEN }}>{formatCurrency(compra.totalValor)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
