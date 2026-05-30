'use client'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faFloppyDisk, faSpinner, faCircleCheck } from '@fortawesome/free-solid-svg-icons'

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
    </div>
  )
}
