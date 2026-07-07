'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell, faChevronRight, faTableColumns, faSeedling,
  faBoxes, faCartShopping, faArrowTrendUp, faFileLines, faLandmark,
  faAddressCard, faUsers, faSliders,
  faTruck, faReceipt, faLeaf, faDollarSign, faBuilding, faCreditCard, faArrowsUpDown, faBox,
  faTriangleExclamation, faCamera,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

type Alerta = { id: string; nome: string; unidade: string; saldo: number }

function useIsMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const check = () => setM(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return m
}

const NAVY = '#2d3561'
const GREEN = '#5ab952'

/* Route → breadcrumb config */
type RouteInfo = { label: string; parent?: string; parentHref?: string; icon?: IconDefinition }

const ROUTE_MAP: Record<string, RouteInfo> = {
  '/':                  { label: 'Dashboard',          icon: faTableColumns },
  '/leitor':            { label: 'Leitor de Documentos', icon: faCamera,         parent: 'Dashboard', parentHref: '/' },
  '/caixa':             { label: 'Financeiro',          icon: faDollarSign,       parent: 'Dashboard', parentHref: '/' },
  '/compras':           { label: 'Centro de Despesa',   icon: faBuilding,         parent: 'Dashboard', parentHref: '/' },
  '/contas-pagar':      { label: 'Contas a Pagar',      icon: faCreditCard,       parent: 'Dashboard', parentHref: '/' },
  '/contas-receber':    { label: 'Contas a Receber',    icon: faLandmark,         parent: 'Dashboard', parentHref: '/' },
  '/pedidos':           { label: 'Pedidos',             icon: faReceipt,          parent: 'Dashboard', parentHref: '/' },
  '/fornecedores':      { label: 'Fornecedores',        icon: faTruck,            parent: 'Dashboard', parentHref: '/' },
  '/clientes':          { label: 'Clientes',            icon: faAddressCard,      parent: 'Dashboard', parentHref: '/' },
  '/produtos':          { label: 'Produtos',            icon: faBox,              parent: 'Dashboard', parentHref: '/' },
  '/estoque':           { label: 'Movimentações',       icon: faArrowsUpDown,     parent: 'Dashboard', parentHref: '/' },
  '/produtores':        { label: 'Produtores',          icon: faUsers,            parent: 'Dashboard', parentHref: '/' },
  '/rocas':             { label: 'Controle de Roça',    icon: faLeaf,             parent: 'Dashboard', parentHref: '/' },
  '/nfe':               { label: 'NF-e',                icon: faFileLines,        parent: 'Dashboard', parentHref: '/' },
  '/producao':          { label: 'Produção',            icon: faSeedling,         parent: 'Dashboard', parentHref: '/' },
  '/transportadoras':   { label: 'Transportadoras',     icon: faTruck,            parent: 'Dashboard', parentHref: '/' },
  '/devolucoes':        { label: 'Devoluções',          icon: faBoxes,            parent: 'Dashboard', parentHref: '/' },
  '/vendas':            { label: 'Vendas',              icon: faArrowTrendUp,     parent: 'Dashboard', parentHref: '/' },
  '/configuracoes':     { label: 'Configurações',       icon: faSliders,          parent: 'Dashboard', parentHref: '/' },
  '/lavoura':           { label: 'Lavoura',             icon: faSeedling,         parent: 'Produção',  parentHref: '/producao' },
}

function getRouteInfo(pathname: string): RouteInfo {
  /* Exact match first */
  if (ROUTE_MAP[pathname]) return ROUTE_MAP[pathname]
  /* Prefix match */
  const sorted = Object.keys(ROUTE_MAP).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (pathname.startsWith(key + '/') || pathname.startsWith(key)) {
      return ROUTE_MAP[key]
    }
  }
  return { label: 'Página', icon: faTableColumns }
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function TopBar() {
  const pathname = usePathname()
  const routeInfo = getRouteInfo(pathname)
  const pageIcon = routeInfo.icon
  const now = useClock()
  const isMobile = useIsMobile()

  const [notifOpen, setNotifOpen] = useState(false)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notificacoes').then(r => r.ok ? r.json() : []).then(setAlertas).catch(() => {})
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  const dateStr = now
    ? now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <header
      style={{
        height: 52,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: `0 20px 0 ${isMobile ? 62 : 24}px`,
        gap: 12,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        {routeInfo.parent && routeInfo.parentHref ? (
          <>
            <Link
              href={routeInfo.parentHref}
              style={{
                fontSize: 13, color: '#6b7280', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {routeInfo.parent}
            </Link>
            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 13, color: '#d1d5db' }} />
          </>
        ) : null}

        <span style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 600, color: NAVY,
        }}>
          {pageIcon && <FontAwesomeIcon icon={pageIcon} style={{ fontSize: 14, color: GREEN }} />}
          {routeInfo.label}
        </span>
      </nav>

      {/* Date — oculto no mobile */}
      {dateStr && !isMobile && (
        <span style={{
          fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
        </span>
      )}

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            style={{
              background: notifOpen ? '#f3f4f6' : 'none',
              border: 'none', cursor: 'pointer',
              color: notifOpen ? NAVY : '#6b7280', borderRadius: 6, padding: 6,
              display: 'flex', alignItems: 'center', position: 'relative',
              transition: 'background 0.1s, color 0.1s',
            }}
            title="Notificações"
          >
            <FontAwesomeIcon icon={faBell} style={{ fontSize: 16 }} />
            {alertas.length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: '#ef4444', color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, fontWeight: 700, lineHeight: '16px',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                {alertas.length > 9 ? '9+' : alertas.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 400,
              width: 300, maxHeight: 380, overflowY: 'auto',
            }}>
              <div style={{
                padding: '12px 16px 8px', borderBottom: '1px solid #f3f4f6',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#f59e0b', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>Alertas de Estoque</span>
              </div>

              {alertas.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Nenhum produto abaixo de 10 caixas
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {alertas.map(a => (
                    <li key={a.id} style={{
                      padding: '10px 16px', borderBottom: '1px solid #f9fafb',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{a.nome}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                        background: a.saldo === 0 ? '#fee2e2' : '#fef3c7',
                        color: a.saldo === 0 ? '#dc2626' : '#d97706',
                      }}>
                        {a.saldo.toFixed(0)} {a.unidade.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ padding: '8px 16px', borderTop: '1px solid #f3f4f6', textAlign: 'right' }}>
                <Link href="/estoque" onClick={() => setNotifOpen(false)} style={{ fontSize: 12, color: NAVY, textDecoration: 'none', fontWeight: 600 }}>
                  Ver estoque →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
