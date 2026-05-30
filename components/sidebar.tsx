'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTableColumns, faCartShopping, faArrowTrendUp, faFileLines, faRotateLeft,
  faLandmark, faUsers, faRightFromBracket, faSeedling, faBox, faUserGear,
  faBars, faXmark, faAddressCard, faDollarSign, faBoxes,
  faWifi, faShield, faSliders, faChartBar, faChevronDown,
  faChevronLeft, faChevronRight, faTruck, faEllipsisH, faLeaf, faReceipt,
  faBuilding, faCreditCard, faArrowsUpDown, faBell,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

/* ─────────────────────────────────────────────
   11 Itens principais (estilo TopERP)
───────────────────────────────────────────── */
type NavItem = {
  href: string
  label: string
  icon: IconDefinition
  color: string
  badge?: string
}

/* ─── Menu principal — igual ao TopERP ─── */
const MAIN_ITEMS: NavItem[] = [
  { href: '/',               label: 'Dashboard',        icon: faTableColumns,  color: '#6c7fc4' },
  { href: '/rocas',          label: 'Controle de Roça', icon: faLeaf,          color: '#16a34a' },
  { href: '/lavoura',        label: 'Registros de Campo', icon: faSeedling,    color: '#84cc16' },
  { href: '/caixa',          label: 'Financeiro',       icon: faDollarSign,    color: '#10b981' },
  { href: '/compras',        label: 'Centro de Despesa',icon: faBuilding,      color: '#f59e0b' },
  { href: '/contas-pagar',   label: 'Contas a Pagar',   icon: faCreditCard,    color: '#e87320' },
  { href: '/contas-receber', label: 'Contas a Receber', icon: faLandmark,      color: '#3b82f6' },
  { href: '/pedidos',        label: 'Pedidos',          icon: faReceipt,       color: '#8b5cf6' },
  { href: '/fornecedores',   label: 'Fornecedores',     icon: faTruck,         color: '#06b6d4' },
  { href: '/transportadoras',label: 'Transportadoras',  icon: faTruck,         color: '#6366f1' },
  { href: '/clientes',       label: 'Clientes',         icon: faAddressCard,   color: '#ec4899' },
  { href: '/produtos',       label: 'Produtos',         icon: faBox,           color: '#fbbf24' },
  { href: '/estoque',        label: 'Movimentações',    icon: faArrowsUpDown,  color: '#22c55e' },
  { href: '/avisos',         label: 'Avisos',           icon: faBell,          color: '#f59e0b' },
]

/* ─── Itens específicos do negócio (Mais) ─── */
const SECONDARY_ITEMS: NavItem[] = [
  { href: '/produtores',      label: 'Produtores',        icon: faUsers,           color: '#10b981' },
  { href: '/nfe',             label: 'NF-e',              icon: faFileLines,       color: '#06b6d4' },
  { href: '/producao',        label: 'Produção',          icon: faSeedling,        color: '#5ab952' },
  { href: '/devolucoes',      label: 'Devoluções',        icon: faRotateLeft,      color: '#f87171' },
  { href: '/vendas',          label: 'Vendas',            icon: faArrowTrendUp,    color: '#3b82f6' },
  { href: '/relatorios',      label: 'Relatórios',        icon: faChartBar,        color: '#a78bfa' },
  { href: '/configuracoes',   label: 'Configurações',     icon: faSliders,         color: '#6b7280' },
  { href: '/usuarios',        label: 'Usuários',          icon: faUserGear,        color: '#60a5fa' },
  { href: '/conexoes',        label: 'Conexões',          icon: faWifi,            color: '#25D366' },
  { href: '/lgpd',            label: 'LGPD',              icon: faShield,          color: '#6c7fc4' },
]

/* ─────────────────────────────────────────────
   NavLink: item individual
───────────────────────────────────────────── */
function NavLink({
  item, collapsed, onClose,
}: { item: NavItem; collapsed?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  const { href, label, icon, color } = item

  return (
    <Link href={href} onClick={onClose} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div
        whileHover={{ x: collapsed ? 0 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        title={collapsed ? label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '9px 0' : '8px 10px',
          borderRadius: 8,
          borderLeft: !collapsed && active ? `3px solid ${color}` : '3px solid transparent',
          backgroundColor: active
            ? `${color}18`
            : 'transparent',
          transition: 'background-color 0.12s',
          marginBottom: 2,
          cursor: 'pointer',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.06)'
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
        }}
      >
        {/* Icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: active ? `${color}25` : 'transparent',
          color: active ? color : 'rgba(255,255,255,0.45)',
          transition: 'color 0.15s, background-color 0.15s',
        }}>
          <FontAwesomeIcon icon={icon} style={{ fontSize: 15 }} />
        </div>

        {/* Label */}
        {!collapsed && (
          <span style={{
            fontSize: 13,
            fontWeight: active ? 600 : 400,
            color: active ? '#ffffff' : 'rgba(255,255,255,0.58)',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {label}
          </span>
        )}

        {/* Active dot */}
        {!collapsed && active && (
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            backgroundColor: color, flexShrink: 0,
          }} />
        )}

        {/* Collapsed active indicator */}
        {collapsed && active && (
          <div style={{
            position: 'absolute', right: 0, top: '50%',
            transform: 'translateY(-50%)',
            width: 3, height: 20, borderRadius: 2,
            backgroundColor: color,
          }} />
        )}
      </motion.div>
    </Link>
  )
}

/* ─────────────────────────────────────────────
   "Mais" accordion section
───────────────────────────────────────────── */
function MaisSection({ collapsed, onClose }: { collapsed?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const hasActive = SECONDARY_ITEMS.some(item =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  )

  if (collapsed) {
    /* No modo collapsed, mostra os ícones diretamente */
    return (
      <div style={{ marginTop: 4 }}>
        {SECONDARY_ITEMS.map(item => (
          <NavLink key={item.href} item={item} collapsed onClose={onClose} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 4 }}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ backgroundColor: open ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.07)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '7px 10px',
          background: open ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(139,92,246,0.28)' : 'rgba(255,255,255,0.06)'}`,
          cursor: 'pointer', borderRadius: 8,
          marginBottom: open ? 6 : 0,
        }}
      >
        <FontAwesomeIcon icon={faEllipsisH} style={{ fontSize: 13, color: open || hasActive ? '#8b5cf6' : 'rgba(255,255,255,0.4)' }} />
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.6px',
          color: open || hasActive ? '#8b5cf6' : 'rgba(255,255,255,0.4)',
          flex: 1, textAlign: 'left',
        }}>
          Mais
        </span>
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          style={{ display: 'flex' }}
        >
          <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 11, color: open || hasActive ? '#8b5cf6' : 'rgba(255,255,255,0.25)' }} />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="mais"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden', paddingLeft: 4 }}
          >
            {SECONDARY_ITEMS.map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                <NavLink item={item} onClose={onClose} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sidebar principal
───────────────────────────────────────────── */
export default function Sidebar({
  userEmail, userName, userRole,
}: { userEmail?: string; userName?: string; userRole?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* Mantém o CSS custom property --sidebar-w sincronizado */
  useEffect(() => {
    const w = isMobile ? 0 : collapsed ? 64 : 248
    document.documentElement.style.setProperty('--sidebar-w', `${w}px`)
  }, [collapsed, isMobile])

  const close = useCallback(() => setMobileOpen(false), [])

  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  const roleLabel: Record<string, string> = { DONO: 'Dono', PARCEIRO: 'Parceiro', GERENTE: 'Gerente' }

  const W = collapsed ? 64 : 248

  const sidebarContent = (
    <>
      {/* Logo / Header */}
      <div style={{
        padding: collapsed ? '18px 0 12px' : '18px 14px 12px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10,
        position: 'relative',
      }}>
        {isMobile && (
          <button
            onClick={close}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
            }}
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
          </button>
        )}

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            style={{ flexShrink: 0 }}
          >
            <Image
              src="/logo01.png"
              alt="Do Campo"
              width={collapsed ? 36 : 48}
              height={collapsed ? 22 : 29}
              style={{ objectFit: 'contain', borderRadius: 6, display: 'block' }}
              priority
            />
          </motion.div>

          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '2.5px',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)',
              }}>
                Sistema de
              </span>
              <span style={{
                fontSize: 13, fontWeight: 800, letterSpacing: '0.4px',
                background: 'linear-gradient(90deg, #5ab952, #a8e063)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>
                Gestão
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Divisor */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, rgba(90,185,82,0.2), rgba(255,255,255,0.04), transparent)',
        margin: `0 ${collapsed ? '8px' : '14px'} 8px`,
        flexShrink: 0,
      }} />

      {/* Navegação principal — 11 itens */}
      <nav
        className="sidebar-nav-scroll"
        style={{ flex: 1, padding: collapsed ? '2px 8px' : '2px 8px', overflowY: 'auto' }}
      >
        {!collapsed && (
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
            margin: '0 4px 6px',
          }}>
            Menu Principal
          </p>
        )}

        {MAIN_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            onClose={isMobile ? close : undefined}
          />
        ))}

        {/* Divisor antes do "Mais" */}
        <div style={{
          height: 1,
          background: 'rgba(255,255,255,0.05)',
          margin: '8px 4px',
        }} />

        <MaisSection collapsed={collapsed} onClose={isMobile ? close : undefined} />
      </nav>

      {/* Footer — usuário + sair */}
      <div style={{
        padding: collapsed ? '8px' : '8px 10px 14px',
        flexShrink: 0,
      }}>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />

        {!collapsed && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8, padding: '9px 10px',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 6,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7, flexShrink: 0,
              background: 'linear-gradient(135deg, #5ab952, #3a8435)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white',
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || 'Usuário'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userRole ? (roleLabel[userRole] ?? userRole) : ''}
                {userEmail ? ` · ${userEmail}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Collapsed: avatar circle */}
        {collapsed && (
          <div style={{
            width: 36, height: 36, borderRadius: 9, margin: '0 auto 6px',
            background: 'linear-gradient(135deg, #5ab952, #3a8435)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white',
          }}>
            {initials}
          </div>
        )}

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            title={collapsed ? 'Sair' : undefined}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13, cursor: 'pointer',
              transition: 'background-color 0.1s, color 0.1s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(232,37,90,0.1)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#e8255a'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'
            }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 14 }} />
            {!collapsed && 'Sair da conta'}
          </button>
        </form>
      </div>
    </>
  )

  const asideBase: React.CSSProperties = {
    width: W,
    height: '100vh',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(175deg, #1a1f3c 0%, #1e2447 55%, #192039 100%)',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    overflow: 'hidden',
    transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
  }

  return (
    <>
      {/* Botão hamburger mobile */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 1100,
            width: 38, height: 38, borderRadius: 8,
            background: 'linear-gradient(135deg, #1a1f3c, #1e2447)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
          aria-label="Abrir menu"
        >
          <FontAwesomeIcon icon={faBars} style={{ fontSize: 17 }} />
        </button>
      )}

      {/* Botão de collapse — desktop */}
      {!isMobile && (
        <AnimatePresence>
          <motion.button
            key="collapse-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.15, borderColor: 'rgba(90,185,82,0.5)', color: '#5ab952' }}
            whileTap={{ scale: 0.88 }}
            onClick={() => setCollapsed(c => !c)}
            style={{
              position: 'fixed',
              left: collapsed ? 50 : 235,
              top: 'calc(50vh - 13px)',
              zIndex: 1100,
              width: 26, height: 26, borderRadius: '50%',
              background: '#1a2040',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
              transition: 'left 0.28s cubic-bezier(0.4,0,0.2,1)',
            }}
            aria-label={collapsed ? 'Expandir' : 'Recolher'}
          >
            {collapsed ? <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 13 }} /> : <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 13 }} />}
          </motion.button>
        </AnimatePresence>
      )}

      {/* Backdrop mobile */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)' }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar desktop (position: fixed, nunca sai do lugar) */}
      {!isMobile && (
        <motion.aside
          className="sidebar-scroll"
          animate={{ width: collapsed ? 64 : 248 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          style={{
            ...asideBase,
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 200,
            width: collapsed ? 64 : 248,
          }}
        >
          {sidebarContent}
        </motion.aside>
      )}

      {/* Sidebar mobile (slide) */}
      {isMobile && (
        <aside
          className="sidebar-scroll"
          style={{
            ...asideBase,
            width: 248,
            position: 'fixed',
            top: 0, left: 0,
            zIndex: 1050,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.22s ease',
          }}
        >
          {sidebarContent}
        </aside>
      )}
    </>
  )
}
