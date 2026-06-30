import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiServer, FiWifi, FiDatabase, FiCpu, FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiAlertOctagon } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

export default function SystemHealth({ sidebarRole = 'admin' }) {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const c = useColors()
  const { get } = useApi()
  const { user: currentUser } = useAuth()

  const fetchHealth = async () => {
    try {
      setRefreshing(true)
      setError(null)
      const data = await get('/health')
      setHealth(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message || 'Failed to fetch system metrics')
      console.error('Health check failed:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [get])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role={sidebarRole} userName={currentUser?.username || 'User'} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>System Health</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button onClick={fetchHealth} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.bgCard, border: `1px solid ${c.border}`, color: c.textSec, padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <FiRefreshCw size={15} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '100px', background: c.bgCard, borderRadius: 16, border: `1px solid ${c.border}` }}>
            <FiAlertOctagon size={48} color={c.danger} style={{ marginBottom: 20 }} />
            <h2 style={{ color: c.text, marginBottom: 12 }}>Metrics Unavailable</h2>
            <p style={{ color: c.textMuted, marginBottom: 24 }}>{error}</p>
            <button onClick={fetchHealth} style={{ background: c.primary, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
          </div>
        ) : !health ? (
          <div style={{ textAlign: 'center', padding: '100px', color: c.text }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${c.primary}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            Loading system metrics...
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 28 }}>
            {/* Backend */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `3px solid ${c.success}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiServer size={18} color={c.success} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>Backend API Server</div>
                </div>
              </div>
              <div style={{ background: c.bgCard2, borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
                <div style={{ color: c.textFaint, fontSize: 11, fontWeight: 600 }}>UPTIME</div>
                <div style={{ color: c.text, fontWeight: 700, fontSize: 16 }}>{Math.floor(health.server.uptime / 3600)}h {Math.floor((health.server.uptime % 3600) / 60)}m</div>
              </div>
              <div style={{ color: c.textSec, fontSize: 12 }}>Memory RSS: {Math.round(health.server.memory.rss / 1024 / 1024)} MB</div>
            </div>

          {/* MQTT */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `3px solid ${c.accent}`, borderRadius: 16, padding: 24, transition: 'background 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiWifi size={18} color={c.accent} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>{health.mqtt.label}</div>
                  <div style={{ color: c.textFaint, fontSize: 12 }}>{health.mqtt.detail}</div>
                </div>
              </div>
              <StatusBadge status={health.mqtt.status} c={c} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Uptime',      val: health.mqtt.uptime },
                { label: 'Connected',   val: `${health.mqtt.clients} nodes` },
                { label: 'Msgs Today',  val: health.mqtt.msgs.toLocaleString() },
                { label: 'Protocol',    val: 'MQTT 3.1.1' },
              ].map(d => (
                <div key={d.label} style={{ background: c.bgCard2, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ color: c.textFaint, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{d.label}</div>
                  <div style={{ color: c.text, fontWeight: 700, fontSize: 14 }}>{d.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* WebSocket */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `3px solid ${c.primary}`, borderRadius: 16, padding: 24, transition: 'background 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiWifi size={18} color={c.primary} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>{health.websocket.label}</div>
                  <div style={{ color: c.textFaint, fontSize: 12 }}>{health.websocket.detail}</div>
                </div>
              </div>
              <StatusBadge status={health.websocket.status} c={c} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Uptime',      val: health.websocket.uptime },
                { label: 'Connections', val: `${health.websocket.connections} clients` },
                { label: 'Msgs Today',  val: health.websocket.messages.toLocaleString() },
                { label: 'Protocol',    val: 'WebSocket' },
              ].map(d => (
                <div key={d.label} style={{ background: c.bgCard2, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ color: c.textFaint, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{d.label}</div>
                  <div style={{ color: c.text, fontWeight: 700, fontSize: 14 }}>{d.val}</div>
                </div>
              ))}
            </div>
          </div>

            {/* Database */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `3px solid ${c.warning}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiDatabase size={18} color={c.warning} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>MongoDB Database</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: c.bgCard2, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ color: c.textFaint, fontSize: 10, fontWeight: 600 }}>RECORDS</div>
                  <div style={{ color: c.text, fontWeight: 700 }}>{health.database.readingCount.toLocaleString()}</div>
                </div>
                <div style={{ background: c.bgCard2, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ color: c.textFaint, fontSize: 10, fontWeight: 600 }}>SENSORS</div>
                  <div style={{ color: c.text, fontWeight: 700 }}>{health.database.nodeCount}</div>
                </div>
              </div>
            </div>
          </div>

        {/* Sensor nodes */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden', transition: 'background 0.3s' }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Sensor Node Status</h3>
              <p style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>
                {health.nodes.filter(n => n.status === 'online').length} online · {health.nodes.filter(n => n.status === 'warning').length} warning · {health.nodes.filter(n => n.status === 'offline').length} offline
              </p>
            </div>
            <FiCpu size={20} color={c.textMuted} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Node ID', 'Room', 'Status', 'Signal', 'Firmware', 'Last Seen'].map(h => (
                  <th key={h} style={{ color: c.textFaint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${c.border}`, background: c.bgCard2 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {health.nodes.map(n => {
                  const rssiColor = n.rssi > -65 ? c.success : n.rssi > -80 ? c.warning : c.danger
                  const pct = Math.max(0, Math.min(100, ((n.rssi + 100) / 50) * 100))
                  return (
                    <tr key={n.id} style={{ borderBottom: `1px solid ${c.bgCard2}` }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: c.text }}>{n.id}</td>
                      <td style={{ padding: '12px 16px', color: c.textSec, fontSize: 13 }}>{n.room}</td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={n.status} c={c} /></td>
                      <td style={{ padding: '12px 16px', minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: c.border, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: rssiColor, borderRadius: 2 }} />
                          </div>
                          <span style={{ color: rssiColor, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{n.rssi} dBm</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: c.textSec, fontSize: 13 }}>v{n.fw}</td>
                      <td style={{ padding: '12px 16px', color: c.textFaint, fontSize: 12 }}>{n.lastSeen}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function StatusBadge({ status, c }) {
  const isOnline = status === 'online' || status === 'up'
  const isWarning = status === 'warning'
  const color = isOnline ? c.success : isWarning ? c.warning : c.danger
  const bg = isOnline ? c.successBg : isWarning ? c.warningBg : c.dangerBg
  const Icon = isOnline ? FiCheckCircle : isWarning ? FiAlertTriangle : FiAlertOctagon

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, color: color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, border: `1px solid ${color}30` }}>
      <Icon size={12} />
      {status}
    </div>
  )
}
