'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faFloppyDisk, faSpinner, faCircleCheck, faTriangleExclamation, faXmark, faLock } from '@fortawesome/free-solid-svg-icons'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 8, fontSize: 14, outline: 'none', color: NAVY,
  boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 6,
}

export default function ConfiguracoesPage() {
  const [caixasBandeja, setCaixasBandeja] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erro, setErro] = useState('')

  /* ── zerar estoque ── */
  const [modalZerar, setModalZerar] = useState(false)
  const [senhaZerar, setSenhaZerar] = useState('')
  const [zerando, setZerando] = useState(false)
  const [erroZerar, setErroZerar] = useState('')
  const [zerado, setZerado] = useState<number | null>(null)

  async function confirmarZerarEstoque() {
    setZerando(true); setErroZerar('')
    try {
      const res = await fetch('/api/estoque/zerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senhaZerar }),
      })
      const data = await res.json()
      if (!res.ok) { setErroZerar(data.error ?? 'Erro ao zerar estoque.'); return }
      setZerado(data.produtosZerados)
      setModalZerar(false); setSenhaZerar('')
    } catch {
      setErroZerar('Erro de rede. Tente novamente.')
    } finally {
      setZerando(false)
    }
  }

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(r => r.json())
      .then(d => {
        if (d.caixas_bandeja_padrao !== undefined) setCaixasBandeja(d.caixas_bandeja_padrao)
      })
      .finally(() => setLoading(false))
  }, [])

  async function salvar() {
    setSaving(true); setSaved(false); setErro('')
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caixas_bandeja_padrao: caixasBandeja }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${NAVY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={faGear} style={{ fontSize: 22, color: NAVY }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Configurações</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Valores padrão aplicados automaticamente nos fechamentos</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
          Deduções — Fechamento de Produtores
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 20, color: GREEN }} className="animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={lbl}>Caixas e Bandeja — Valor padrão (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={caixasBandeja}
                onChange={e => { setCaixasBandeja(e.target.value); setSaved(false) }}
                placeholder="Ex: 25,00"
                style={{ ...inp, textAlign: 'right' }}
              />
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
                Este valor será pré-preenchido automaticamente ao criar um novo fechamento.
                Você poderá ajustá-lo individualmente em cada fechamento.
              </p>
            </div>

            {erro && (
              <p style={{ fontSize: 13, color: PINK, margin: 0 }}>{erro}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.button
                onClick={salvar}
                disabled={saving}
                whileHover={!saving ? { scale: 1.04, backgroundColor: '#4aa344' } : {}}
                whileTap={!saving ? { scale: 0.96 } : {}}
                style={{ padding: '10px 22px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
                {saving ? <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 14 }} className="animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} style={{ fontSize: 14 }} />}
                {saving ? 'Salvando...' : 'Salvar'}
              </motion.button>
              {saved && (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: GREEN, fontSize: 13, fontWeight: 500 }}>
                  <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 15 }} /> Salvo com sucesso
                </motion.div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Zona de Perigo ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, marginTop: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${PINK}30` }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: PINK, margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 14 }} /> Zona de Perigo
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>Zerar estoque</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Cria um ajuste para levar o estoque de todos os produtos a zero. Não apaga o histórico de movimentações. Protegido por senha.
            </p>
          </div>
          <button
            onClick={() => { setModalZerar(true); setErroZerar(''); setSenhaZerar('') }}
            style={{ padding: '10px 18px', backgroundColor: 'white', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 13 }} /> Zerar Estoque
          </button>
        </div>
        {zerado !== null && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ fontSize: 13, color: GREEN, margin: '14px 0 0', fontWeight: 500 }}>
            Estoque zerado com sucesso ({zerado} produto{zerado === 1 ? '' : 's'} ajustado{zerado === 1 ? '' : 's'}).
          </motion.p>
        )}
      </motion.div>

      {/* ── Modal de confirmação ── */}
      <AnimatePresence>
        {modalZerar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !zerando && setModalZerar(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${PINK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesomeIcon icon={faLock} style={{ fontSize: 15, color: PINK }} />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Confirmar zerar estoque</h2>
                  </div>
                  <button onClick={() => setModalZerar(false)} disabled={zerando}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} />
                  </button>
                </div>

                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
                  Esta ação leva o estoque de <strong>todos os produtos</strong> a zero. Digite a senha para confirmar.
                </p>

                <label style={lbl}>Senha</label>
                <input
                  type="password"
                  value={senhaZerar}
                  onChange={e => { setSenhaZerar(e.target.value); setErroZerar('') }}
                  onKeyDown={e => { if (e.key === 'Enter' && senhaZerar && !zerando) confirmarZerarEstoque() }}
                  autoFocus
                  style={inp}
                />

                {erroZerar && <p style={{ fontSize: 13, color: PINK, margin: '10px 0 0' }}>{erroZerar}</p>}

                <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModalZerar(false)} disabled={zerando}
                    style={{ padding: '10px 18px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                  <button onClick={confirmarZerarEstoque} disabled={zerando || !senhaZerar}
                    style={{ padding: '10px 22px', backgroundColor: PINK, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (zerando || !senhaZerar) ? 'not-allowed' : 'pointer', opacity: (zerando || !senhaZerar) ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {zerando ? 'Zerando...' : 'Zerar Estoque'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
