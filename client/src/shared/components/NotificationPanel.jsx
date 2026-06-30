import { useState, useEffect } from 'react'
import { FiBell, FiX, FiCheckCircle, FiAlertTriangle, FiAlertOctagon, FiMail } from 'react-icons/fi'
import { useColors } from '../hooks/useColors'
import { useApi } from '../utils/api'

const SIcon = { normal: FiCheckCircle, warning: FiAlertTriangle, critical: FiAlertOctagon }

const severityMap = { LOW: 'normal', MEDIUM: 'warning', HIGH: 'warning', CRITICAL: 'critical' };

const getUnit = (param) => {
  const p = param.toLowerCase();
  if (p.includes('pm')) return 'µg/m³';
  if (p.includes('tvoc')) return 'ppb';
  if (p.includes('temp')) return '°C';
  if (p.includes('humid')) return '%';
  if (p.includes('eco2')) return 'ppm';
  return '';
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const c = useColors()
  const { get, patch, del } = useApi()

  const fetchAlerts = async () => {
    try {
      const data = await get('/alerts')
      const mapped = data.map(a => ({
        id: a._id,
        room: a.room?.name || 'Unknown Room',
        param: a.parameter.toUpperCase(),
        value: `${a.value} ${getUnit(a.parameter)}`,
        severity: severityMap[a.severity] || 'normal',
        time: new Date(a.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: a.status !== 'ACTIVE',
        sent: a.emailSent || false
      }))
      setNotifs(mapped)
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000) // Poll every 30s
    return () => clearInterval(interval)
   
  }, [get])

  const statusColor = { normal: c.success, warning: c.warning, critical: c.danger }
  const statusBg    = { normal: c.successBg, warning: c.warningBg, critical: c.dangerBg }

  const unread   = notifs.filter(n => !n.read).length
  
  const markRead = async (id) => {
    try {
      await patch(`/alerts/${id}/acknowledge`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    }
  }

  const markAll  = async () => {
    const unreadAlerts = notifs.filter(n => !n.read);
    for (const alert of unreadAlerts) {
      await markRead(alert.id);
    }
  }

  const dismiss  = async (id) => {
    try {
      await del(`/alerts/${id}`)
      setNotifs(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button onClick={() => setOpen(!open)}
        style={{ position: 'relative', background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 10, padding: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
        <FiBell size={20} color={c.textSec} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: c.danger, color: '#fff', fontSize: 10, fontWeight: 800, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${c.bg}` }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 48, right: 0, width: 360, background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', zIndex: 999, overflow: 'hidden', transition: 'background 0.3s' }}>

            {/* Panel header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Notifications</h3>
                <p style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{unread} unread</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {unread > 0 && (
                  <button onClick={markAll}
                    style={{ background: 'none', border: 'none', color: c.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer' }}>
                  <FiX size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {notifs.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: c.textFaint, fontSize: 14 }}>No notifications</div>
              )}
              {notifs.map(n => {
                const Icon = SIcon[n.severity]
                return (
                  <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                    style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${c.bgCard2}`, cursor: 'pointer', background: n.read ? 'transparent' : `${c.primary}06`, borderLeft: `3px solid ${statusColor[n.severity]}`, transition: 'background 0.15s' }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      <Icon size={16} color={statusColor[n.severity]} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{n.room}</span>
                        <span style={{ color: c.textFaint, fontSize: 11 }}>{n.time}</span>
                      </div>
                      <div style={{ color: c.textSec, fontSize: 13, marginBottom: 6 }}>
                        {n.param}: <strong style={{ color: statusColor[n.severity] }}>{n.value}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: statusBg[n.severity], color: statusColor[n.severity], padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                          {n.severity}
                        </span>
                        {n.sent && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: c.textFaint, fontSize: 11 }}>
                            <FiMail size={10} /> Email sent
                          </span>
                        )}
                        {!n.read && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.primary, marginLeft: 'auto', display: 'inline-block' }} />
                        )}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                      style={{ background: 'none', border: 'none', color: c.textFaint, cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                      <FiX size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

