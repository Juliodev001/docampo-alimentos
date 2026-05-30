'use client'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faPlus, faPhone, faChevronRight, faTrash } from '@fortawesome/free-solid-svg-icons'
import { formatCPF } from '@/lib/utils'
import PageSkeleton from '@/components/page-skeleton'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; telefone: string | null; parceiros: Parceiro[] }

export default function ProdutoresClient() {
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/produtores')
      .then((r) => r.json())
      .then(setProdutores)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string, nome: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Excluir "${nome}" e todos os seus parceiros? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/produtores/${id}`, { method: 'DELETE' })
      if (res.ok) setProdutores((prev) => prev.filter((p) => p.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <PageSkeleton cards={0} rows={5} />

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Produtores e Parceiros</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie produtores e participações nos resultados</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/produtores/novo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Novo Produtor
          </Link>
        </motion.div>
      </motion.div>

      {produtores.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          style={{ backgroundColor: 'white', borderRadius: 14, padding: 64, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: 48, color: '#d1d5db', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 6px' }}>Nenhum produtor cadastrado</p>
          <Link href="/produtores/novo" style={{ color: GREEN, fontSize: 13 }}>Cadastrar agora →</Link>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {produtores.map((p, i) => {
            const totalPerc = p.parceiros.reduce((s, pa) => s + pa.percentual, 0)
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4, type: 'spring', stiffness: 180 }}
                whileHover={{ y: -4, boxShadow: '0 12px 36px rgba(0,0,0,0.1)' }}
              >
                <Link href={`/produtores/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${GREEN}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: NAVY, fontSize: 17, margin: 0 }}>{p.nome}</p>
                        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>CPF/CNPJ: {formatCPF(p.cpf)}</p>
                        {p.telefone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <FontAwesomeIcon icon={faPhone} style={{ fontSize: 12, color: '#9ca3af' }} />
                            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{p.telefone}</p>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <div style={{ backgroundColor: `${NAVY}10`, borderRadius: 10, padding: '6px 12px', textAlign: 'right' }}>
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Parceiros</p>
                          <p style={{ fontWeight: 800, color: NAVY, fontSize: 22, margin: 0, lineHeight: 1 }}>{p.parceiros.length}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <motion.button
                            onClick={(e) => handleDelete(p.id, p.nome, e)}
                            whileHover={{ scale: 1.12, backgroundColor: '#fff0f3' }}
                            whileTap={{ scale: 0.9 }}
                            disabled={deletingId === p.id}
                            style={{ background: 'none', border: `1px solid ${PINK}30`, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: PINK, opacity: deletingId === p.id ? 0.5 : 1 }}
                          >
                            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 13 }} />
                          </motion.button>
                          <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 16, color: '#9ca3af' }} />
                        </div>
                      </div>
                    </div>

                    {p.parceiros.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${Math.min(totalPerc, 100)}%` }}
                            transition={{ delay: i * 0.08 + 0.3, duration: 0.6, ease: 'easeOut' }}
                            style={{ height: '100%', backgroundColor: totalPerc > 100 ? PINK : GREEN, borderRadius: 3 }}
                          />
                        </div>
                        <p style={{ fontSize: 11, color: totalPerc > 100 ? PINK : '#6b7280', marginTop: 5, fontWeight: 500 }}>
                          {totalPerc.toFixed(0)}% distribuído entre parceiros
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {p.parceiros.map((pa) => (
                            <span key={pa.id} style={{ backgroundColor: '#f0faf0', color: GREEN, border: `1px solid ${GREEN}30`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                              {pa.nome} · {pa.percentual}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
