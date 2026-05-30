'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell, faChevronRight, faTableColumns, faSeedling,
  faBoxes, faCartShopping, faArrowTrendUp, faFileLines, faLandmark,
  faAddressCard, faUsers, faSliders,
  faTruck, faReceipt, faLeaf, faDollarSign, faBuilding, faCreditCard, faArrowsUpDown, faBox,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

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

      {/* Date */}
      {dateStr && (
        <span style={{
          fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
        </span>
      )}

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6b7280', borderRadius: 6, padding: 6,
            display: 'flex', alignItems: 'center',
            transition: 'background 0.1s, color 0.1s',
          }}
          title="Notificações"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; (e.currentTarget as HTMLButtonElement).style.color = NAVY }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280' }}
        >
          <FontAwesomeIcon icon={faBell} style={{ fontSize: 16 }} />
        </button>
      </div>
    </header>
  )
}
