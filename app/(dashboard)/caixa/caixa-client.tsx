'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLandmark, faCircleArrowUp, faCircleArrowDown, faCircleExclamation, faPlus, faBuilding, faXmark, faFileLines, faCartShopping, faCalendar, faCreditCard, faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const TEAL   = '#3d6b6e'
const BLUE   = '#2563eb'

type Conta = {
  id: string; nome: string; tipo: string
  saldoInicial: number
  movimentacoes: Mov[]
}
type Mov = {
  id: string; descricao: string; tipo: string
  valor: number; data: Date; conciliado: boolean; contaNome?: string
}
type SimpleItem = { id: string; nome: string }

/* ── form state ── */
const EMPTY_FORM = {
  contaBancariaId: '',
  descricao: '',
  tipo: 'ENTRADA',
  valor: '',
  dataEmissao: new Date().toISOString().split('T')[0],
  dataVencimento: '',
  dataPagamento: '',
  formaPagamento: '',
  clienteId: '',
  fornecedorId: '',
  centroCustoId: '',
  observacao: '',
}

/* ── seção do modal ── */
function Section({
  icon, label, color, children,
}: { icon: IconDefinition; label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 15, color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
      </div>
      <div style={{ height: 1, background: '#f0f2f5', marginBottom: 16 }} />
      {children}
    </div>
  )
}

/* ── campo de formulário ── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: BLUE }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

const INPUT: React.CSSProperties = {
  border: '1.5px solid #e5e7eb',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
  color: NAVY,
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  background: 'white',
  boxSizing: 'border-box' as const,
}

/* ════════════════════════════════════════
   MODAL NOVA TRANSAÇÃO
════════════════════════════════════════ */
function ModalNovaTransacao({
  contas, clientes, fornecedores, centrosCusto,
  onClose, onSuccess,
}: {
  contas: Conta[]
  clientes: SimpleItem[]
  fornecedores: SimpleItem[]
  centrosCusto: SimpleItem[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, contaBancariaId: contas[0]?.id ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.contaBancariaId) { setError('Selecione uma conta bancária'); return }
    if (!form.descricao.trim()) { setError('Descrição é obrigatória'); return }
    if (!form.valor || Number(form.valor) <= 0) { setError('Valor deve ser maior que zero'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contaBancariaId: form.contaBancariaId,
          data: form.dataEmissao,
          descricao: form.descricao,
          tipo: form.tipo,
          valor: Number(form.valor),
        }),
      })
      if (!res.ok) throw new Error('Erro ao registrar transação')
      onSuccess()
    } catch {
      setError('Erro ao registrar transação. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.18 }}
        style={{
          background: 'white', borderRadius: 14,
          width: '100%', maxWidth: 640,
          maxHeight: '90vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* cabeçalho */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f0f2f5',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Nova Transação</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              Preencha os campos abaixo para registrar uma nova transação financeira.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b7280', padding: 4, borderRadius: 6,
            }}
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* conteúdo scrollável */}
        <form onSubmit={submit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

          {/* ── Informações Básicas ── */}
          <Section icon={faFileLines} label="Informações Básicas" color={BLUE}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Descrição" required>
                <input
                  style={INPUT}
                  placeholder="Ex: Pagamento de venda"
                  value={form.descricao}
                  onChange={e => set('descricao', e.target.value)}
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Tipo" required>
                  <select style={INPUT} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    <option value="ENTRADA">Receita</option>
                    <option value="SAIDA">Despesa</option>
                  </select>
                </Field>
                <Field label="Valor Original" required>
                  <input
                    style={INPUT}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.valor}
                    onChange={e => set('valor', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* ── Relacionamentos ── */}
          <Section icon={faCartShopping} label="Relacionamentos" color={BLUE}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Conta Bancária" required>
                <select
                  style={INPUT}
                  value={form.contaBancariaId}
                  onChange={e => set('contaBancariaId', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <Field label="Cliente">
                <select style={INPUT} value={form.clienteId} onChange={e => set('clienteId', e.target.value)}>
                  <option value="">Nenhum</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <Field label="Fornecedor">
                <select style={INPUT} value={form.fornecedorId} onChange={e => set('fornecedorId', e.target.value)}>
                  <option value="">Nenhum</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </Field>
              <Field label="Roça">
                <select style={INPUT} value={form.centroCustoId} onChange={e => set('centroCustoId', e.target.value)}>
                  <option value="">Nenhuma</option>
                  {centrosCusto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* ── Datas ── */}
          <Section icon={faCalendar} label="Datas" color={BLUE}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Data de Emissão" required>
                <input
                  style={INPUT}
                  type="date"
                  value={form.dataEmissao}
                  onChange={e => set('dataEmissao', e.target.value)}
                />
              </Field>
              <Field label="Data de Vencimento">
                <input
                  style={INPUT}
                  type="date"
                  value={form.dataVencimento}
                  onChange={e => set('dataVencimento', e.target.value)}
                />
              </Field>
              <Field label="Data de Pagamento">
                <input
                  style={INPUT}
                  type="date"
                  value={form.dataPagamento}
                  onChange={e => set('dataPagamento', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* ── Pagamento ── */}
          <Section icon={faCreditCard} label="Pagamento" color={BLUE}>
            <Field label="Forma de Pagamento">
              <select style={INPUT} value={form.formaPagamento} onChange={e => set('formaPagamento', e.target.value)}>
                <option value="">Nenhuma</option>
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="BOLETO">Boleto</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
              </select>
            </Field>
          </Section>

          {/* ── Observações ── */}
          <Section icon={faCircleInfo} label="Observações" color={BLUE}>
            <textarea
              style={{ ...INPUT, minHeight: 80, resize: 'vertical' }}
              placeholder="Observações adicionais sobre a transação"
              value={form.observacao}
              onChange={e => set('observacao', e.target.value)}
            />
          </Section>

          {error && (
            <p style={{ color: PINK, fontSize: 13, margin: '0 0 12px', textAlign: 'center' }}>{error}</p>
          )}

          {/* ── botão submit ── */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '13px',
              background: NAVY, color: 'white',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Registrando...' : 'Registrar Transação'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════
   MAIN CLIENT
════════════════════════════════════════ */
const tipoIcone: Record<string, string> = {
  CAIXA_FISICO: '💵', CONTA_CORRENTE: '🏦', POUPANCA: '🏛', INVESTIMENTO: '📈',
}

export default function CaixaClient({
  contas, todasMovimentacoes, saldoTotal, entradPeriodo, saidPeriodo, pendentes,
  clientes, fornecedores, centrosCusto,
}: {
  contas: Conta[]
  todasMovimentacoes: Mov[]
  saldoTotal: number
  entradPeriodo: number
  saidPeriodo: number
  pendentes: number
  clientes: SimpleItem[]
  fornecedores: SimpleItem[]
  centrosCusto: SimpleItem[]
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const cards = [
    { label: 'Saldo atual',              value: formatCurrency(saldoTotal),   color: saldoTotal >= 0 ? TEAL : PINK, icon: faLandmark },
    { label: 'Entradas do período',      value: formatCurrency(entradPeriodo), color: GREEN,  icon: faCircleArrowUp   },
    { label: 'Saídas do período',        value: formatCurrency(saidPeriodo),   color: PINK,   icon: faCircleArrowDown },
    { label: 'Pendentes de conciliação', value: String(pendentes),             color: ORANGE, icon: faCircleExclamation },
  ]

  return (
    <div>
      {/* ── header ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header"
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Financeiro</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Controle suas receitas e despesas</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', backgroundColor: GREEN, color: 'white',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Nova Transação
        </motion.button>
      </motion.div>

      {/* ── KPI cards ── */}
      <div className="kpi-grid-4">
        {cards.map(({ label, value, color, icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, type: 'spring', stiffness: 180 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}
            style={{
              backgroundColor: 'white', borderRadius: 14, padding: '20px 22px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{label}</p>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 + 0.18 }}
                  className="kpi-val" style={{ color, fontSize: 20, fontWeight: 700, margin: '6px 0 0', wordBreak: 'break-word' }}
                >{value}</motion.p>
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 10, padding: 8, flexShrink: 0, marginLeft: 6 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── mini-cards por conta ── */}
      {contas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20, marginTop: 16 }}>
          {contas.map((c, i) => {
            const entradas = c.movimentacoes.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.valor, 0)
            const saidas   = c.movimentacoes.filter(m => m.tipo === 'SAIDA').reduce((s, m) => s + m.valor, 0)
            const saldo    = c.saldoInicial + entradas - saidas
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.34 + i * 0.06, type: 'spring', stiffness: 220 }}
                whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.09)' }}
                style={{
                  backgroundColor: 'white', borderRadius: 12, padding: '16px 20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: `4px solid ${TEAL}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{tipoIcone[c.tipo] ?? '🏦'}</span>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0, fontWeight: 500 }}>{c.nome}</p>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: saldo >= 0 ? TEAL : PINK, margin: 0 }}>
                  {formatCurrency(saldo)}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── tabela de movimentações ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.4 }}
        style={{
          backgroundColor: 'white', borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FontAwesomeIcon icon={faBuilding} style={{ fontSize: 16, color: TEAL }} />
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Movimentações</h3>
          </div>
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.55, type: 'spring', stiffness: 400 }}
            style={{
              backgroundColor: `${NAVY}12`, color: NAVY,
              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            }}
          >
            {todasMovimentacoes.length}
          </motion.span>
        </div>

        {todasMovimentacoes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}
          >
            <FontAwesomeIcon icon={faLandmark} style={{ fontSize: 40, opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, margin: 0 }}>Nenhuma movimentação encontrada</p>
          </motion.div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Data', 'Descrição', 'Tipo', 'Valor', 'Conciliação'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 11, color: '#6b7280', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todasMovimentacoes.slice(0, 50).map((m, i) => (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.03 }}
                  whileHover={{ backgroundColor: '#f8fffe' }}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '12px 16px', fontSize: 13, color: NAVY }}>
                    {formatDate(m.data)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: NAVY, fontWeight: 500 }}>
                    {m.descricao}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      width: 'fit-content',
                      backgroundColor: m.tipo === 'ENTRADA' ? '#f0faf0' : '#fff0f3',
                      color: m.tipo === 'ENTRADA' ? GREEN : PINK,
                      padding: '3px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {m.tipo === 'ENTRADA' ? '↑ Entrada' : '↓ Saída'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: m.tipo === 'ENTRADA' ? GREEN : PINK }}>
                    {m.tipo === 'ENTRADA' ? '+' : '-'} {formatCurrency(m.valor)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      backgroundColor: m.conciliado ? '#f0faf0' : '#fff7ed',
                      color: m.conciliado ? GREEN : ORANGE,
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    }}>
                      {m.conciliado ? 'Conciliado' : 'Pendente'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* ── modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <ModalNovaTransacao
            contas={contas}
            clientes={clientes}
            fornecedores={fornecedores}
            centrosCusto={centrosCusto}
            onClose={() => setModalOpen(false)}
            onSuccess={() => {
              setModalOpen(false)
              router.refresh()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
