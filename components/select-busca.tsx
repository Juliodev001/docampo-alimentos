'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Lista de seleção com busca. Substitui o <select> quando a lista é longa
 * (ex.: produtores): clica, digita parte do nome ou do código e escolhe.
 * A busca ignora maiúsculas e acentos ("joao" acha "JOÃO").
 * Teclado: ↑ ↓ para andar, Enter para escolher, Esc para fechar.
 */

export type OpcaoBusca = { value: string; label: string }

const semAcento = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function SelectBusca({
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  disabled = false,
  style,
}: {
  value: string
  onChange: (value: string) => void
  options: OpcaoBusca[]
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [ativo, setAtivo] = useState(0)
  const caixaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  const selecionada = options.find((o) => o.value === value)

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim())
    if (!termo) return options
    const partes = termo.split(/\s+/)
    return options.filter((o) => {
      const alvo = semAcento(o.label)
      return partes.every((p) => alvo.includes(p))
    })
  }, [busca, options])

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) {
        setAberto(false)
        setBusca('')
      }
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  // Mantém o item destacado visível ao navegar pelo teclado.
  useEffect(() => {
    const el = listaRef.current?.children[ativo] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  function abrir() {
    if (disabled) return
    setAberto(true)
    setBusca('')
    const idx = options.findIndex((o) => o.value === value)
    setAtivo(idx >= 0 ? idx : 0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function escolher(o: OpcaoBusca) {
    onChange(o.value)
    setAberto(false)
    setBusca('')
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = filtradas[ativo]
      if (o) escolher(o)
    } else if (e.key === 'Escape') {
      setAberto(false)
      setBusca('')
    }
  }

  return (
    <div ref={caixaRef} style={{ position: 'relative' }}>
      {aberto ? (
        <input
          ref={inputRef}
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setAtivo(0)
          }}
          onKeyDown={teclado}
          placeholder={selecionada ? `Buscar… (atual: ${selecionada.label})` : 'Digite para buscar…'}
          style={style}
        />
      ) : (
        <button
          type="button"
          onClick={abrir}
          disabled={disabled}
          style={{
            ...style,
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: selecionada ? (style?.color ?? '#111827') : '#9ca3af',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            opacity: disabled ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selecionada ? selecionada.label : placeholder}
          </span>
          <span aria-hidden style={{ fontSize: 10, color: '#6b7280' }}>▼</span>
        </button>
      )}

      {aberto && (
        <div
          ref={listaRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 280,
            overflowY: 'auto',
            background: '#fff',
            border: '1.5px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 50,
          }}
        >
          {filtradas.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 13, color: '#9ca3af' }}>
              Nenhum resultado para &ldquo;{busca}&rdquo;
            </div>
          ) : (
            filtradas.map((o, i) => (
              <div
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  escolher(o)
                }}
                onMouseEnter={() => setAtivo(i)}
                style={{
                  padding: '8px 12px',
                  fontSize: 14,
                  cursor: 'pointer',
                  background: i === ativo ? '#eef2ff' : o.value === value ? '#f8fafc' : '#fff',
                  fontWeight: o.value === value ? 700 : 400,
                  color: '#111827',
                }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
