'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWifi, faWifiSlash, faArrowsRotate, faPowerOff, faMobileScreenButton, faCircleCheck } from '@fortawesome/free-solid-svg-icons'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'
const WA = '#25D366'

type Session = {
  status: string
  connected: boolean
  me?: { id: string; pushName: string } | null
}

export default function ConexoesClient() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [qrKey, setQrKey] = useState(Date.now())

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/session')
      setSession(await res.json())
    } catch {
      setSession({ status: 'OFFLINE', connected: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    if (!session || session.connected) return
    const t = setInterval(() => { fetchStatus(); setQrKey(Date.now()) }, 5000)
    return () => clearInterval(t)
  }, [session, fetchStatus])

  const connect = async () => {
    setActing(true)
    await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    })
    await fetchStatus()
    setQrKey(Date.now())
    setActing(false)
  }

  const disconnect = async () => {
    setActing(true)
    await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    })
    await fetchStatus()
    setActing(false)
  }

  const isConnected = session?.connected
  const isWaitingQR = session?.status === 'SCAN_QR_CODE'
  const isStopped = !session || ['STOPPED', 'OFFLINE', 'FAILED'].includes(session.status)

  const statusColor = isConnected ? WA : isWaitingQR ? ORANGE : '#9ca3af'
  const statusLabel = loading ? 'Verificando...'
    : isConnected ? 'Conectado'
    : isWaitingQR ? 'Aguardando leitura do QR'
    : isStopped ? 'Desconectado'
    : session?.status ?? 'Desconhecido'

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Conexões</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie as conexões com serviços externos</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 500, borderLeft: `4px solid ${isConnected ? WA : '#e5e7eb'}` }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: isConnected ? `${WA}15` : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesomeIcon icon={faMobileScreenButton} style={{ fontSize: 22, color: isConnected ? WA : '#9ca3af' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: NAVY, fontSize: 16, margin: 0 }}>WhatsApp</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <motion.div
                  animate={{ backgroundColor: statusColor, scale: isWaitingQR ? [1, 1.3, 1] : 1 }}
                  transition={{ repeat: isWaitingQR ? Infinity : 0, duration: 1.2 }}
                  style={{ width: 7, height: 7, borderRadius: '50%' }}
                />
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{statusLabel}</p>
              </div>
            </div>
          </div>
          <motion.button onClick={fetchStatus} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#6b7280' }}>
            <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 14 }} />
          </motion.button>
        </div>

        {/* Connected info */}
        {isConnected && session?.me && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ backgroundColor: '#f0fff4', borderRadius: 12, padding: '14px 16px', marginBottom: 18, border: `1px solid ${WA}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 18, color: WA }} />
              <div>
                <p style={{ fontWeight: 600, color: NAVY, fontSize: 14, margin: 0 }}>{session.me.pushName}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                  {session.me.id.replace(/@.*/, '')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* QR Code */}
        {isWaitingQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', marginBottom: 18 }}>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>
              Abra o WhatsApp no celular →{' '}
              <strong>Configurações → Aparelhos conectados → Conectar aparelho</strong>
            </p>
            <div style={{ display: 'inline-block', padding: 14, backgroundColor: 'white', borderRadius: 14, border: '2px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <img
                key={qrKey}
                src={`/api/whatsapp/qr?t=${qrKey}`}
                alt="QR Code WhatsApp"
                style={{ width: 220, height: 220, display: 'block' }}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
              />
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>Atualiza automaticamente a cada 5s</p>
          </motion.div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isConnected && !isWaitingQR && (
            <motion.button onClick={connect} disabled={acting}
              whileHover={!acting ? { scale: 1.03, backgroundColor: '#1ea952' } : {}}
              whileTap={!acting ? { scale: 0.97 } : {}}
              style={{ flex: 1, padding: '11px 16px', backgroundColor: WA, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <FontAwesomeIcon icon={faWifi} style={{ fontSize: 14 }} />
              {acting ? 'Conectando...' : 'Conectar WhatsApp'}
            </motion.button>
          )}
          {isWaitingQR && (
            <motion.button onClick={connect} disabled={acting}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ padding: '10px 16px', border: '1.5px solid #e5e7eb', backgroundColor: 'white', color: NAVY, borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 13 }} /> Novo QR Code
            </motion.button>
          )}
          {isConnected && (
            <motion.button onClick={disconnect} disabled={acting}
              whileHover={{ scale: 1.03, backgroundColor: '#c91845' }} whileTap={{ scale: 0.97 }}
              style={{ padding: '11px 16px', backgroundColor: PINK, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
              <FontAwesomeIcon icon={faPowerOff} style={{ fontSize: 14 }} /> Desconectar
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
