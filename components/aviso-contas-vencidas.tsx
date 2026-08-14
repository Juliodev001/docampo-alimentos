'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTriangleExclamation, faXmark, faArrowRight, faPhone, faUser,
} from '@fortawesome/free-solid-svg-icons'
import { formatCurrency, formatDate } from '@/lib/utils'

const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'

type Conta = {
  id: string
  origem: 'CARTEIRA' | 'RECEBER'
  descricao: string
  cliente: string
  telefone: string | null
  valor: number
  vencimento: string
  diasAtraso: number
}

const ORIGEM = {
  CARTEIRA: { rotulo: 'Carteira',        cor: ORANGE },
  RECEBER:  { rotulo: 'Contas a receber', cor: BLUE  },
} as const

/**
 * Conta vencida só é útil se alguém lembrar dela. O aviso abre sozinho na
 * primeira tela depois do login — uma vez por dia, por sessão do navegador,
 * para não virar barulho a cada página aberta.
 */
export default function AvisoContasVencidas() {
  const [contas, setContas] = useState<Conta[]>([])
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const hoje = new Date()
    const chave = `aviso-vencidas:${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`
    if (sessionStorage.getItem(chave)) return

    let cancelado = false
    fetch('/api/notificacoes/vencidas')
      .then(r => (r.ok ? r.json() : []))
      .then((dados: Conta[]) => {
        if (cancelado || !Array.isArray(dados) || dados.length === 0) return
        setContas(dados)
        setAberto(true)
        sessionStorage.setItem(chave, '1')
      })
      .catch(() => {})

    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aberto])

  const total = contas.reduce((s, c) => s + c.valor, 0)
  const temCarteira = contas.some(c => c.origem === 'CARTEIRA')

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAberto(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
          />

          <div className="modal-wrapper">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 540,
                boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
              }}
            >
              {/* Cabeçalho */}
              <div style={{
                padding: '18px 22px', background: `${PINK}0e`,
                borderBottom: `1px solid ${PINK}22`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: `${PINK}20`, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 18, color: PINK }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: 0 }}>
                    Contas vencidas
                  </h2>
                  <p style={{ fontSize: 12.5, color: '#6b7280', margin: '2px 0 0' }}>
                    {contas.length === 1
                      ? '1 conta passou do prazo e não foi paga'
                      : `${contas.length} contas passaram do prazo e não foram pagas`}
                  </p>
                </div>
                <motion.button
                  onClick={() => setAberto(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Fechar"
                  style={{
                    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8,
                    padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex',
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
                </motion.button>
              </div>

              {/* Total */}
              <div style={{
                padding: '14px 22px', borderBottom: '1px solid #f3f4f6',
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280' }}>Total em atraso</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: PINK }}>{formatCurrency(total)}</span>
              </div>

              {/* Lista */}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}>
                {contas.map(c => {
                  const origem = ORIGEM[c.origem]
                  return (
                    <li key={c.id} style={{
                      padding: '12px 22px', borderBottom: '1px solid #f9fafb',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 13.5, fontWeight: 600, color: NAVY,
                        }}>
                          <FontAwesomeIcon icon={faUser} style={{ fontSize: 11, color: '#9ca3af' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.cliente}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: origem.cor,
                            background: `${origem.cor}18`, padding: '2px 7px',
                            borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            {origem.rotulo}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 11.5, color: '#9ca3af', marginTop: 2,
                          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                            {c.descricao}
                          </span>
                          <span>venceu em {formatDate(c.vencimento)}</span>
                          {c.telefone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FontAwesomeIcon icon={faPhone} style={{ fontSize: 9 }} />
                              {c.telefone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                          {formatCurrency(c.valor)}
                        </div>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, color: 'white', background: PINK,
                          padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 3,
                        }}>
                          {c.diasAtraso === 1 ? '1d em atraso' : `${c.diasAtraso}d em atraso`}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Ações */}
              <div style={{
                padding: '14px 22px', borderTop: '1px solid #f3f4f6',
                display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap',
              }}>
                <button
                  onClick={() => setAberto(false)}
                  style={{
                    background: '#f3f4f6', border: 'none', borderRadius: 9,
                    padding: '9px 16px', fontSize: 13, fontWeight: 600,
                    color: '#4b5563', cursor: 'pointer',
                  }}
                >
                  Depois
                </button>
                {temCarteira && (
                  <Link
                    href="/avisos"
                    onClick={() => setAberto(false)}
                    style={{
                      background: '#ffffff', border: '1.5px solid #e5e7eb', borderRadius: 9,
                      padding: '8px 16px', fontSize: 13, fontWeight: 600,
                      color: NAVY, textDecoration: 'none', display: 'flex', alignItems: 'center',
                    }}
                  >
                    Ver carteira
                  </Link>
                )}
                <Link
                  href="/contas-receber"
                  onClick={() => setAberto(false)}
                  style={{
                    background: NAVY, borderRadius: 9, padding: '9px 16px',
                    fontSize: 13, fontWeight: 600, color: 'white', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  Ver contas a receber
                  <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 12 }} />
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
