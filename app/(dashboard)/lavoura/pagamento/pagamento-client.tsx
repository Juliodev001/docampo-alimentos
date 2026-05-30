'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSearch, faPrint, faCircleCheck, faClock, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import PageSkeleton from '@/components/page-skeleton'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'
const PURPLE = '#7c3aed'

type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; parceiros: Parceiro[] }
type Fechamento = {
  id: string
  produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  valesEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
}

function fmt(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function PagamentoClient() {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  useEffect(() => {
    fetch('/api/fechamento').then(r => r.json()).then(setFechamentos).finally(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return fechamentos.filter(f => {
      const matchStatus = filtroStatus === 'TODOS' || f.status === filtroStatus
      if (!matchStatus) return false
      if (!q) return true
      if (f.produtor.nome.toLowerCase().includes(q)) return true
      if (f.produtor.cpf?.includes(q)) return true
      if (f.produtor.parceiros.some(p => p.nome.toLowerCase().includes(q))) return true
      return false
    })
  }, [fechamentos, busca, filtroStatus])

  if (loading) return <PageSkeleton cards={2} rows={5} />

  const pendentes = fechamentos.filter(f => f.status === 'PENDENTE').length
  const pagos = fechamentos.filter(f => f.status === 'PAGO').length

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Demonstrativos de Pagamento</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Busque pelo nome do produtor ou meeiro para imprimir o demonstrativo</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/lavoura/pagamento/novo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Novo Fechamento
          </Link>
        </motion.div>
      </motion.div>

      {/* KPIs */}
      <div className="stats-grid-2" style={{ marginBottom: 24 }}>
        {[
          { label: 'Pendentes', value: pendentes, color: ORANGE, icon: faClock },
          { label: 'Pagos', value: pagos, color: GREEN, icon: faCircleCheck },
        ].map(({ label, value, color, icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.09, duration: 0.4, type: 'spring', stiffness: 180 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{label}</p>
                <p style={{ color, fontSize: 32, fontWeight: 700, margin: '4px 0 0' }}>{value}</p>
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 10, padding: 10 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 20, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Busca + filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por produtor ou meeiro..."
            style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', color: NAVY, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            onFocus={e => (e.target.style.borderColor = GREEN)}
            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['TODOS', 'PENDENTE', 'PAGO'] as const).map(s => (
            <motion.button key={s} onClick={() => setFiltroStatus(s)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ padding: '9px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: filtroStatus === s ? NAVY : '#f3f4f6', color: filtroStatus === s ? 'white' : '#6b7280' }}>
              {s === 'TODOS' ? 'Todos' : s === 'PENDENTE' ? 'Pendentes' : 'Pagos'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <AnimatePresence mode="wait">
        {filtrados.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: 64, textAlign: 'center', color: '#9ca3af', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <FontAwesomeIcon icon={faSearch} style={{ fontSize: 36, opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px', color: '#6b7280' }}>
              {busca ? `Nenhum resultado para "${busca}"` : 'Nenhum fechamento encontrado'}
            </p>
            {!busca && <Link href="/lavoura/pagamento/novo" style={{ color: GREEN, fontSize: 13 }}>Criar fechamento →</Link>}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtrados.map((f, i) => {
              const totalParceirosPct = f.produtor.parceiros.reduce((s, p) => s + p.percentual, 0)
              const percProdutor = Math.max(0, 100 - totalParceirosPct)
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${f.status === 'PAGO' ? GREEN : ORANGE}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                    {/* Produtor + meeiros */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: f.produtor.parceiros.length > 0 ? 6 : 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{f.produtor.nome}</span>
                        <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, backgroundColor: `${GREEN}12`, padding: '2px 8px', borderRadius: 20 }}>{percProdutor}%</span>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, backgroundColor: f.status === 'PAGO' ? '#f0faf0' : '#fff7ed', color: f.status === 'PAGO' ? GREEN : ORANGE }}>
                          {f.status === 'PAGO' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                      {f.produtor.parceiros.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {f.produtor.parceiros.map(p => (
                            <span key={p.id} style={{ fontSize: 11, color: PURPLE, backgroundColor: `${PURPLE}10`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                              Meeiro: {p.nome} ({p.percentual}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Período */}
                    <div style={{ textAlign: 'center', minWidth: 130 }}>
                      <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 2px' }}>Período</p>
                      <p style={{ fontSize: 13, color: '#374151', fontWeight: 500, margin: 0 }}>{fmt(f.dataInicio)} – {fmt(f.dataFim)}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Pag: {fmt(f.dataPagamento)}</p>
                    </div>

                    {/* Botões de impressão */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <motion.button
                        onClick={() => window.open(`/imprimir/pagamento/${f.id}`, '_blank')}
                        whileHover={{ scale: 1.05, backgroundColor: '#1e2550' }}
                        whileTap={{ scale: 0.95 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <FontAwesomeIcon icon={faPrint} style={{ fontSize: 12 }} />
                        {f.produtor.parceiros.length > 0 ? `Produtor (${percProdutor}%)` : 'Imprimir'}
                      </motion.button>

                      {f.produtor.parceiros.map((p, pi) => (
                        <motion.button
                          key={p.id}
                          onClick={() => window.open(`/imprimir/pagamento/${f.id}/meeiro?p=${pi}`, '_blank')}
                          whileHover={{ scale: 1.05, backgroundColor: '#6d28d9' }}
                          whileTap={{ scale: 0.95 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: PURPLE, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          <FontAwesomeIcon icon={faPrint} style={{ fontSize: 12 }} />
                          {p.nome} ({p.percentual}%)
                        </motion.button>
                      ))}

                      <Link href={`/lavoura/pagamento/${f.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        Detalhe <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11 }} />
                      </Link>
                    </div>

                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
