'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faPrint, faCircleCheck, faTrash, faComment } from '@fortawesome/free-solid-svg-icons'
import PageSkeleton from '@/components/page-skeleton'
import { useToast } from '@/components/toast'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'
const WA = '#25D366'

type Produto = { id: string; nome: string; unidade: string }
type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; telefone: string | null; parceiros: Parceiro[] }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null
}
type Fechamento = {
  id: string
  produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  valesEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string; createdAt: string
  colheitas: Colheita[]
}

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function PagamentoDetalheClient() {
  const toast = useToast()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/fechamento/${id}`).then(r => r.json()).then(setFechamento).finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageSkeleton cards={0} rows={8} />
  if (!fechamento) return <div style={{ padding: 40, color: PINK }}>Fechamento não encontrado.</div>

  const { produtor, colheitas, dataInicio, dataFim, dataPagamento, valesEmbalagem, valesDinheiro, creditos, debitosAnteriores, status } = fechamento

  const totalFaturas = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalDeducoes = valesEmbalagem + valesDinheiro + creditos + debitosAnteriores
  const aReceber = totalFaturas - totalDeducoes

  async function marcarPago() {
    setMarking(true)
    await fetch(`/api/fechamento/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAGO' }),
    })
    setFechamento(f => f ? { ...f, status: 'PAGO' } : f)
    setMarking(false)
  }

  async function excluir() {
    if (!confirm('Excluir este fechamento?')) return
    setDeleting(true)
    await fetch(`/api/fechamento/${id}`, { method: 'DELETE' })
    router.push('/lavoura/pagamento')
  }

  async function compartilharWhatsApp() {
    if (!docRef.current) return
    setSharing(true)

    // Verificar Web Share API antes de qualquer await (contexto de gesto do usuário)
    const testFile = new File(['t'], 't.png', { type: 'image/png' })
    const useShareAPI = typeof navigator.canShare === 'function' && navigator.canShare({ files: [testFile] })

    // Abrir WhatsApp aqui (antes do await) para não ser bloqueado pelo popup blocker
    let waWindow: Window | null = null
    if (!useShareAPI) {
      const digits = produtor.telefone?.replace(/\D/g, '') ?? ''
      const waPhone = digits ? (digits.startsWith('55') ? digits : '55' + digits) : ''
      const waUrl = waPhone
        ? `https://wa.me/${waPhone}?text=${encodeURIComponent('Segue o comprovante de pagamento')}`
        : 'https://web.whatsapp.com'
      waWindow = window.open(waUrl, '_blank')
    }

    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob falhou')), 'image/png')
      })
      const file = new File([blob], `pagamento-${produtor.nome.replace(/\s+/g, '-')}.png`, { type: 'image/png' })

      if (useShareAPI) {
        await navigator.share({ files: [file], title: `Pagamento — ${produtor.nome}` })
        return
      }

      // Baixar o PNG
      const objUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        waWindow?.close()
        return
      }
      toast.error('Erro ao gerar imagem', e instanceof Error ? e.message : String(e))
    } finally {
      setSharing(false)
    }
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <Link href="/lavoura/pagamento" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 14 }} /> Pagamentos
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Fechamento — {produtor.nome}</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{fmtDate(dataInicio)} a {fmtDate(dataFim)}</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            backgroundColor: status === 'PAGO' ? '#f0faf0' : '#fff7ed',
            color: status === 'PAGO' ? GREEN : ORANGE,
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>{status === 'PAGO' ? 'Pago' : 'Pendente'}</span>

          <motion.button
            onClick={() => window.open(`/imprimir/pagamento/${id}`, '_blank')}
            whileHover={{ scale: 1.04, backgroundColor: '#1e2550', boxShadow: '0 6px 20px rgba(45,53,97,0.4)' }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faPrint} style={{ fontSize: 14 }} /> Imprimir / PDF
          </motion.button>

          <motion.button
            onClick={compartilharWhatsApp} disabled={sharing}
            whileHover={!sharing ? { scale: 1.04, backgroundColor: '#1aa34a', boxShadow: '0 6px 20px rgba(37,211,102,0.4)' } : {}}
            whileTap={!sharing ? { scale: 0.95 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', backgroundColor: WA, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: sharing ? 'not-allowed' : 'pointer', opacity: sharing ? 0.7 : 1 }}
          >
            <FontAwesomeIcon icon={faComment} style={{ fontSize: 14 }} /> {sharing ? 'Gerando...' : 'WhatsApp'}
          </motion.button>

          {status !== 'PAGO' && (
            <motion.button
              onClick={marcarPago} disabled={marking}
              whileHover={!marking ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : undefined}
              whileTap={!marking ? { scale: 0.95 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: marking ? 0.7 : 1 }}
            >
              <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 14 }} /> {marking ? 'Salvando...' : 'Marcar como Pago'}
            </motion.button>
          )}

          <motion.button
            onClick={excluir} disabled={deleting}
            whileHover={!deleting ? { scale: 1.1, backgroundColor: '#ffe0e8', boxShadow: `0 6px 18px ${PINK}30` } : undefined}
            whileTap={!deleting ? { scale: 0.88, rotate: -5 } : undefined}
            transition={{ type: 'spring', stiffness: 450, damping: 15 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', backgroundColor: '#fef2f2', color: PINK, border: `1px solid ${PINK}30`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
          </motion.button>
        </div>
      </motion.div>

      {/* Documento */}
      <motion.div
        ref={docRef}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}
      >
        {/* Cabeçalho do documento */}
        <div style={{ padding: '24px 28px', borderBottom: '2px solid #f3f4f6', background: `linear-gradient(135deg, ${NAVY}08, ${GREEN}06)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                Pagamento de Produtores
              </h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Período: {fmtDate(dataInicio)} a {fmtDate(dataFim)} · Pagamento: {fmtDate(dataPagamento)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Produtor</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '2px 0 0' }}>{produtor.nome}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>CPF: {produtor.cpf}</p>
            </div>
          </div>
        </div>

        {/* Tabela de colheitas */}
        {colheitas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <p>Nenhuma colheita registrada neste período para este produtor.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Data', 'Nº Doc', 'Produto / Qualidade', 'Qtd.', 'Descarte', 'Líquido', 'Preço/cx', 'Sub-total'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Sub-total' ? 'right' : 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colheitas.map((c, i) => {
                  const liquido = c.quantidadeTotal - c.descarte
                  const sub = liquido * c.preco
                  return (
                    <motion.tr key={c.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, color: NAVY }}>{fmtDate(c.data)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{c.nrDoc ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>
                        {c.produto.nome}
                        {c.qualidade && <span style={{ fontSize: 11, color: ORANGE, marginLeft: 6, fontWeight: 700 }}>{c.qualidade}</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{c.quantidadeTotal.toFixed(1)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: PINK }}>{c.descarte > 0 ? c.descarte.toFixed(1) : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>{liquido.toFixed(1)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{fmtBRL(c.preco)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: GREEN, textAlign: 'right' }}>{fmtBRL(sub)}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Resumo financeiro */}
        <div style={{ padding: '20px 28px', borderTop: '2px solid #f3f4f6' }}>
          <div style={{ maxWidth: 360, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>Total Faturas</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{fmtBRL(totalFaturas)}</span>
            </div>
            {valesEmbalagem > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Caixas e Bandeja</span>
                <span style={{ fontSize: 13, color: PINK }}>- {fmtBRL(valesEmbalagem)}</span>
              </div>
            )}
            {valesDinheiro > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Vales Dinheiro</span>
                <span style={{ fontSize: 13, color: PINK }}>- {fmtBRL(valesDinheiro)}</span>
              </div>
            )}
            {creditos > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Créditos (Coleta e Filmagem)</span>
                <span style={{ fontSize: 13, color: PINK }}>- {fmtBRL(creditos)}</span>
              </div>
            )}
            {debitosAnteriores > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Débitos Anteriores</span>
                <span style={{ fontSize: 13, color: PINK }}>- {fmtBRL(debitosAnteriores)}</span>
              </div>
            )}
            {totalDeducoes > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f3f4f6', marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Total Deduções</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: PINK }}>- {fmtBRL(totalDeducoes)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: aReceber >= 0 ? '#f0faf0' : '#fff0f3', borderRadius: 10, marginTop: 10, border: `2px solid ${aReceber >= 0 ? GREEN : PINK}30` }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>A Receber</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: aReceber >= 0 ? GREEN : PINK }}>{fmtBRL(aReceber)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
