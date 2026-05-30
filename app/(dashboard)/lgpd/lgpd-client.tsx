'use client'
import { useState } from 'react'
import { motion } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faDownload, faShield, faFileLines, faArrowUpRightFromSquare, faSpinner, faCircleCheck, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useToast } from '@/components/toast'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

const atividades = [
  { atividade: 'Cadastro de produtores', dados: 'Nome, CPF, telefone', base: 'Execução de contrato', retencao: 'Enquanto ativo + 5 anos' },
  { atividade: 'Cadastro de parceiros', dados: 'Nome, CPF, percentual', base: 'Execução de contrato', retencao: 'Enquanto ativo + 5 anos' },
  { atividade: 'Cadastro de clientes', dados: 'Nome, CNPJ/CPF, telefone, e-mail', base: 'Execução de contrato', retencao: 'Enquanto ativo + 5 anos' },
  { atividade: 'Cadastro de fornecedores', dados: 'Nome, CNPJ/CPF, telefone, e-mail', base: 'Execução de contrato', retencao: 'Enquanto ativo + 5 anos' },
  { atividade: 'Emissão de NF-e', dados: 'Dados do cliente + fiscal', base: 'Obrigação legal', retencao: '5 anos (fiscal)' },
  { atividade: 'Controle de colheitas', dados: 'Produtor, produto, quantidade, preço', base: 'Execução de contrato', retencao: '5 anos' },
  { atividade: 'Pagamentos a produtores', dados: 'Valores, datas, produtor', base: 'Execução de contrato', retencao: '5 anos' },
  { atividade: 'Envio de mensagens (WhatsApp)', dados: 'Número de telefone', base: 'Legítimo interesse', retencao: 'Não armazenado' },
  { atividade: 'Acesso ao sistema (usuários)', dados: 'Nome, e-mail, senha (hash)', base: 'Execução de contrato', retencao: '6 meses após desativação' },
]

export default function LgpdClient() {
  const toast = useToast()
  const [cpf, setCpf] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<'found' | 'notfound' | null>(null)
  const [erro, setErro] = useState('')

  function formatCpf(v: string) {
    return v.replace(/\D/g, '').slice(0, 18)
  }

  async function exportar() {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length < 11) return setErro('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.')
    setErro('')
    setBuscando(true)
    setResultado(null)
    try {
      const res = await fetch(`/api/lgpd/export?cpf=${digits}`)
      if (res.status === 404) {
        setResultado('notfound')
        return
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error || `Erro ${res.status}`)
        return
      }
      // trigger download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lgpd-export-${digits}.json`
      a.click()
      URL.revokeObjectURL(url)
      setResultado('found')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${NAVY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={faShield} style={{ fontSize: 22, color: NAVY }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>LGPD</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Conformidade com a Lei Geral de Proteção de Dados</p>
        </div>
        <Link href="/politica-de-privacidade" target="_blank"
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1.5px solid ${GREEN}40`, borderRadius: 8, color: GREEN, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 14 }} />
          Ver Política de Privacidade
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: 12 }} />
        </Link>
      </div>

      {/* Cards de status */}
      <div className="kpi-grid-3">
        {[
          { label: 'Política publicada', ok: true, desc: 'Página pública disponível' },
          { label: 'Canal de atendimento', ok: true, desc: 'Via WhatsApp / administrador' },
          { label: 'Exportação de dados', ok: true, desc: 'Titular pode solicitar cópia' },
        ].map((item) => (
          <div key={item.label} style={{ backgroundColor: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${GREEN}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 18, color: GREEN }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: NAVY, fontSize: 13 }}>{item.label}</p>
              <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 12 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Consulta de titular */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, margin: '0 0 6px' }}>Consulta e Exportação de Dados do Titular</h2>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20, marginTop: 0 }}>
          Informe o CPF ou CNPJ do titular para localizar todos os dados armazenados e gerar um arquivo de exportação (JSON).
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>CPF ou CNPJ do titular</label>
            <input
              value={cpf}
              onChange={(e) => { setCpf(formatCpf(e.target.value)); setResultado(null); setErro('') }}
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              onKeyDown={(e) => e.key === 'Enter' && exportar()}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', color: NAVY }}
            />
          </div>
          <motion.button
            onClick={exportar}
            disabled={buscando}
            whileHover={!buscando ? { scale: 1.04, backgroundColor: '#4aa344' } : {}}
            whileTap={!buscando ? { scale: 0.96 } : {}}
            style={{ padding: '10px 20px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: buscando ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: buscando ? 0.7 : 1, height: 42, flexShrink: 0 }}>
            {buscando ? <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 15 }} className="animate-spin" /> : <FontAwesomeIcon icon={faDownload} style={{ fontSize: 15 }} />}
            {buscando ? 'Buscando...' : 'Exportar dados'}
          </motion.button>
          <motion.button
            onClick={async () => {
              const digits = cpf.replace(/\D/g, '')
              if (digits.length < 11) return setErro('Informe um CPF ou CNPJ válido.')
              if (!confirm(`Deseja solicitar a EXCLUSÃO de todos os dados de CPF/CNPJ ${digits}?\n\nATENÇÃO: Esta ação remove o registro do sistema. Dados com obrigação legal (fiscal) não são apagados.`)) return
              setErro('')
              setBuscando(true)
              try {
                const [prod, cli] = await Promise.all([
                  fetch(`/api/lgpd/export?cpf=${digits}`).then(r => r.json()),
                  Promise.resolve(null),
                ])
                if (prod?.dados?.produtor?.id) {
                  await fetch(`/api/produtores/${prod.dados.produtor.id}`, { method: 'DELETE' })
                }
                if (prod?.dados?.cliente?.id) {
                  await fetch(`/api/clientes/${prod.dados.cliente.id}`, { method: 'DELETE' })
                }
                setResultado('found')
                setErro('')
                toast.success('Exclusão processada', 'Dados removidos do sistema conforme solicitação LGPD.')
              } catch {
                setErro('Erro ao processar exclusão.')
              } finally {
                setBuscando(false)
              }
            }}
            disabled={buscando}
            whileHover={!buscando ? { scale: 1.04, backgroundColor: '#fff0f3' } : {}}
            whileTap={!buscando ? { scale: 0.96 } : {}}
            style={{ padding: '10px 16px', backgroundColor: 'white', color: PINK, border: `1.5px solid ${PINK}40`, borderRadius: 8, cursor: buscando ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: buscando ? 0.7 : 1, height: 42, flexShrink: 0 }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14 }} />
            Excluir dados
          </motion.button>
        </div>

        {erro && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: PINK, fontSize: 13, padding: '10px 14px', backgroundColor: '#fff0f3', borderRadius: 8, border: `1px solid ${PINK}20` }}>
            <FontAwesomeIcon icon={faCircleExclamation} style={{ fontSize: 15 }} />
            {erro}
          </div>
        )}
        {resultado === 'found' && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: GREEN, fontSize: 13, padding: '10px 14px', backgroundColor: `${GREEN}10`, borderRadius: 8, border: `1px solid ${GREEN}30` }}>
            <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 15 }} />
            Dados encontrados e exportados com sucesso.
          </div>
        )}
        {resultado === 'notfound' && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: ORANGE, fontSize: 13, padding: '10px 14px', backgroundColor: `${ORANGE}10`, borderRadius: 8, border: `1px solid ${ORANGE}30` }}>
            <FontAwesomeIcon icon={faCircleExclamation} style={{ fontSize: 15 }} />
            Nenhum dado encontrado para este CPF/CNPJ no sistema.
          </div>
        )}
      </motion.section>

      {/* Registro de atividades de tratamento */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: NAVY }}>Registro de Atividades de Tratamento</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>Art. 37 da LGPD — inventário de dados tratados pelo sistema</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Atividade', 'Dados tratados', 'Base legal', 'Retenção'].map((h) => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atividades.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: NAVY }}>{a.atividade}</td>
                  <td style={{ padding: '11px 16px', color: '#374151' }}>{a.dados}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      backgroundColor: a.base === 'Obrigação legal' ? `${ORANGE}15` : a.base === 'Legítimo interesse' ? `${NAVY}12` : `${GREEN}15`,
                      color: a.base === 'Obrigação legal' ? ORANGE : a.base === 'Legítimo interesse' ? NAVY : GREEN,
                    }}>{a.base}</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#6b7280' }}>{a.retencao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  )
}
