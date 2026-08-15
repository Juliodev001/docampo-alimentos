'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faFileLines, faCheckSquare, faSquare } from '@fortawesome/free-solid-svg-icons'

const NAVY = '#2d3561'
const GREEN = '#5ab952'

/**
 * Tela de seleção dos fechamentos que entram no PDF.
 *
 * É a mesma tela para meeiro e produtor — muda só de onde vêm os dados e para
 * onde vai o PDF. As duas rotas em app/(dashboard)/relatorios/ montam este
 * componente; a lista de fechamentos de cada um tem campos diferentes, então
 * cada fonte é normalizada para { bruto, liquido } antes de renderizar.
 */

type FechamentoMeeiroApi = {
  id: string
  dataInicio: string; dataFim: string; dataPagamento: string
  valorBruto: number; valorPago: number; status: string
}
type FechamentoProdutorApi = {
  id: string
  dataInicio: string; dataFim: string; dataPagamento: string
  bruto: number; liquido: number; status: string
}
type ApiMeeiro = {
  parceiro: { id: string; nome: string; produtor: { nome: string } }
  fechamentos: FechamentoMeeiroApi[]
}
type ApiProdutor = {
  produtor: { id: string; nome: string }
  fechamentos: FechamentoProdutorApi[]
}

type Linha = {
  id: string
  dataInicio: string; dataFim: string; dataPagamento: string
  bruto: number; liquido: number; status: string
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
function fmtN(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function SelecaoFechamentos({
  tipo, id,
}: { tipo: 'meeiro' | 'produtor'; id: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const dataInicio = searchParams.get('dataInicio') ?? ''
  const dataFim    = searchParams.get('dataFim') ?? ''

  const [nome, setNome]     = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const p = new URLSearchParams()
    if (dataInicio && dataFim) { p.set('dataInicio', dataInicio); p.set('dataFim', dataFim) }
    const qs = p.toString()
    fetch(`/api/relatorio-${tipo}/${id}${qs ? `?${qs}` : ''}`)
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d: ApiMeeiro | ApiProdutor) => {
        if (tipo === 'meeiro') {
          const dm = d as ApiMeeiro
          setNome(dm.parceiro.nome)
          setSubtitulo(`Meeiro de ${dm.parceiro.produtor.nome}`)
          setLinhas(dm.fechamentos.map(f => ({
            id: f.id,
            dataInicio: f.dataInicio, dataFim: f.dataFim, dataPagamento: f.dataPagamento,
            bruto: Number(f.valorBruto), liquido: Number(f.valorPago), status: f.status,
          })))
        } else {
          const dp = d as ApiProdutor
          setNome(dp.produtor.nome)
          setSubtitulo('Produtor')
          setLinhas(dp.fechamentos.map(f => ({
            id: f.id,
            dataInicio: f.dataInicio, dataFim: f.dataFim, dataPagamento: f.dataPagamento,
            bruto: Number(f.bruto), liquido: Number(f.liquido), status: f.status,
          })))
        }
        setCarregando(false)
      })
      .catch(() => { setErro('Erro ao carregar os fechamentos.'); setCarregando(false) })
  }, [tipo, id, dataInicio, dataFim])

  /* Começa com tudo marcado, como na tela de pedidos do cliente */
  useEffect(() => { setSelecionados(new Set(linhas.map(l => l.id))) }, [linhas])

  function toggleTodos() {
    setSelecionados(prev =>
      prev.size === linhas.length ? new Set() : new Set(linhas.map(l => l.id)),
    )
  }

  function toggleUm(fechId: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(fechId)) next.delete(fechId); else next.add(fechId)
      return next
    })
  }

  function gerarPDF() {
    if (selecionados.size === 0) return
    const ids = Array.from(selecionados).join(',')
    window.open(`/imprimir/relatorio-${tipo}/${id}?fechamentoIds=${ids}`, '_blank')
  }

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#6b7280', fontSize: 15 }}>
      Carregando fechamentos...
    </div>
  )

  if (erro) return <div style={{ color: '#e8255a', padding: 24 }}>{erro}</div>

  const todosSelected = selecionados.size === linhas.length && linhas.length > 0
  const periodo = dataInicio && dataFim
    ? `${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`
    : 'todos os fechamentos'
  const totalSelecionado = linhas
    .filter(l => selecionados.has(l.id))
    .reduce((soma, l) => soma + l.liquido, 0)

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '4px 0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 12 }} />
          Voltar
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>{nome}</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
          {subtitulo} · Selecione os fechamentos para incluir no relatório ·{' '}
          <span style={{ fontWeight: 500 }}>{periodo}</span>
        </p>
      </div>

      {/* Barra de controles */}
      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: '14px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleTodos}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: NAVY, fontSize: 14, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
          >
            <FontAwesomeIcon
              icon={todosSelected ? faCheckSquare : faSquare}
              style={{ fontSize: 20, color: todosSelected ? GREEN : '#d1d5db' }}
            />
            {todosSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>
            {selecionados.size} de {linhas.length} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={gerarPDF}
          disabled={selecionados.size === 0}
          style={{
            padding: '10px 22px',
            backgroundColor: selecionados.size === 0 ? '#e5e7eb' : NAVY,
            color: selecionados.size === 0 ? '#9ca3af' : 'white',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: selecionados.size === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13 }} />
          Gerar PDF
        </button>
      </div>

      {/* Lista de fechamentos */}
      {linhas.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          Nenhum fechamento encontrado para o período selecionado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {linhas.map(l => {
            const sel = selecionados.has(l.id)
            return (
              <div
                key={l.id}
                onClick={() => toggleUm(l.id)}
                style={{
                  backgroundColor: 'white', borderRadius: 12, padding: '14px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: `2px solid ${sel ? NAVY + '40' : 'transparent'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'border-color 0.15s',
                }}
              >
                <FontAwesomeIcon
                  icon={sel ? faCheckSquare : faSquare}
                  style={{ fontSize: 22, color: sel ? GREEN : '#d1d5db', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                      {fmtDate(l.dataInicio)} a {fmtDate(l.dataFim)}
                    </span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      Pago em {fmtDate(l.dataPagamento)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    Bruto R$ {fmtN(l.bruto)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>R$ {fmtN(l.liquido)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: l.status === 'PAGO' ? '#16a34a' : '#b45309' }}>
                    {l.status === 'PAGO' ? 'Pago' : 'Pendente'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total dos selecionados */}
      {selecionados.size > 0 && (
        <div style={{ marginTop: 16, backgroundColor: `${NAVY}08`, border: `1.5px solid ${NAVY}20`, borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>
            Total dos {selecionados.size} fechamento{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>
            R$ {fmtN(totalSelecionado)}
          </span>
        </div>
      )}
    </div>
  )
}
