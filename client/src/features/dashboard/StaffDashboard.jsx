import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import NotificationPanel from '../../shared/components/NotificationPanel'
import { FiCheckCircle, FiAlertTriangle, FiAlertOctagon, FiWind, FiThermometer, FiDroplet, FiBell } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useTranslation } from 'react-i18next'
import { useApi } from '../../shared/utils/api'
import { useSocket } from '../../shared/utils/socket'
import { useAuth } from '../../shared/contexts/AuthContext'

const StatusIcon = {
  GOOD: FiCheckCircle,
  MODERATE: FiAlertTriangle,
  UNHEALTHY_FOR_SENSITIVE: FiAlertTriangle,
  UNHEALTHY: FiAlertOctagon,
  VERY_UNHEALTHY: FiAlertOctagon,
  HAZARDOUS: FiAlertOctagon
}

export default function StaffDashboard() {
  const [sensorData, setSensorData] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({ maintenanceMode: false })
  const [error, setError] = useState(null)
  const [roomTrends, setRoomTrends] = useState({}) // roomId -> { trend, status }
  const c = useColors()
  const { t } = useTranslation()
  const { get, patch } = useApi()
  const { user } = useAuth()

  // Real-time updates
  useSocket('airquality/live', (data) => {
    setSensorData(prev => prev.map(d => 
      d.room.roomId === data.roomId ? { ...d, latest: data } : d
    ))
  })

  useSocket('alerts/live', (data) => {
    if (data.parameter) {
      setAlerts(prev => [data, ...prev].slice(0, 50))
    }
  })

  useSocket('system/config', (newConfig) => {
    setConfig(newConfig)
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const sysConfig = await get('/notifications/config')
        setConfig(sysConfig)

        const currentData = await get('/sensors/current')
        setSensorData(currentData)

        // Fetch trends for all rooms
        if (currentData.length > 0) {
          const trendPromises = currentData.map(d => get(`/sensors/trends/${d.room.roomId}`).catch(() => null))
          const trends = await Promise.all(trendPromises)
          const trendMap = {}
          trends.forEach((t, i) => {
            if (t) trendMap[currentData[i].room.roomId] = { trend: t.trend, status: t.predictedStatus }
          })
          setRoomTrends(trendMap)
        }
        
        try {
          const alertsData = await get('/alerts')
          setAlerts(alertsData.data || [])
        } catch (alertErr) {
          console.warn('Failed to fetch alerts:', alertErr.message)
        }
      } catch (err) {
        setError(err.message || 'Failed to connect to backend')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    const interval = setInterval(fetchData, 20000)
    return () => clearInterval(interval)
  }, [get])

  const acknowledge = async (alertId) => {
    try {
      await patch(`/alerts/${alertId}/acknowledge`, {})
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    }
  }

  if (loading && sensorData.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
        <Sidebar role="staff" userName="Staff" />
        <main style={{ marginLeft: 240, flex: 1, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: c.text }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', border: `3px solid ${c.primary}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <h2>{t('staff.loading')}</h2>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>
    )
  }

  const getStatusColor = (status) => {
    if (!status) return c.textFaint
    const s = String(status).toUpperCase()
    return c.aqi[s] || c.textFaint
  }

  const getStatusBg = (status) => {
    if (!status) return `${c.textFaint}20`
    const s = String(status).toUpperCase()
    const color = c.aqi[s]
    return color ? `${color}18` : `${c.textFaint}20`
  }

  const counts = sensorData.reduce((acc, d) => {
    const s = String(d.latest?.aqi_status || 'Offline').toUpperCase()
    if (s === 'GOOD') acc.safe++
    else if (s === 'MODERATE' || s === 'UNHEALTHY_FOR_SENSITIVE') acc.elevated++
    else if (s === 'UNHEALTHY' || s === 'VERY_UNHEALTHY' || s === 'HAZARDOUS') acc.critical++
    else acc.offline++
    return acc
  }, { safe: 0, elevated: 0, critical: 0, offline: 0 })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        {config.maintenanceMode && (
          <div style={{ background: c.warning, color: '#000', padding: '10px 24px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#000', animation: 'pulse 1s infinite' }} />
            SYSTEM CALIBRATION IN PROGRESS — Standard alerts are temporarily paused.
          </div>
        )}

        {error && (
          <div style={{ background: c.dangerBg, color: c.danger, padding: '12px 20px', borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>Connection Error:</strong> {error}</span>
            <button onClick={() => window.location.reload()} style={{ background: c.danger, color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>{t('staff.dashboardTitle')}</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Clinical-grade air quality surveillance</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: c.successBg, border: '1px solid rgba(46,213,115,0.3)', color: c.success, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.success, display: 'inline-block' }} /> {t('staff.live')}
            </div>
            <NotificationPanel />
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 20, marginBottom: 36 }}>
          {[
            { label: 'Safe Conditions',   count: counts.safe,     color: c.aqi.GOOD,      icon: FiCheckCircle, key: 'safe' },
            { label: 'Elevated Risk',    count: counts.elevated, color: c.aqi.MODERATE,  icon: FiAlertTriangle, key: 'elevated' },
            { label: 'High Priority',   count: counts.critical, color: c.aqi.UNHEALTHY, icon: FiAlertOctagon, key: 'critical' },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.key} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `3px solid ${item.color}`, borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                <Icon size={28} color={item.color} />
                <div style={{ fontSize: 36, fontWeight: 800, color: item.color }}>{item.count}</div>
                <div style={{ color: c.textSec, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
              </div>
            )
          })}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: c.text }}>Clinical Room Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
          {sensorData.map(d => {
            const status = String(d.latest?.aqi_status || 'Offline').toUpperCase()
            const Icon = StatusIcon[status] || FiWind
            const color = getStatusColor(status)
            return (
              <div key={d.room.roomId} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderLeft: `4px solid ${color}`, borderRadius: 16, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>{d.room.name}</div>
                    <div style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>{d.room.roomId}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Icon size={22} color={color} />
                    {roomTrends[d.room.roomId] && (
                      <span style={{ fontSize: 10, color: roomTrends[d.room.roomId].status === 'GOOD' ? c.success : c.warning, background: c.bgCard2, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        {roomTrends[d.room.roomId].trend}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { icon: FiWind,        color: c.primary, label: 'PM2.5', val: `${d.latest?.pm25 || 0} µg/m³`, vc: color },
                    { icon: FiWind,        color: c.primary, label: 'PM10', val: `${d.latest?.pm10 || 0} µg/m³`, vc: color },
                    { icon: FiThermometer, color: c.warning, label: 'Temp', val: `${d.latest?.temperature || 0}°C`,     vc: c.textSec },
                    { icon: FiDroplet,     color: '#38bdf8', label: 'Hum',  val: `${d.latest?.humidity || 0}%`,       vc: c.textSec },
                    { icon: FiAlertOctagon, color: c.danger, label: 'CH4',  val: `${d.latest?.methane || 0} ppm`, vc: c.textSec },
                    { icon: FiAlertOctagon, color: c.warning, label: 'CO',  val: `${d.latest?.co || 0} ppm`, vc: c.textSec },
                    { icon: FiAlertOctagon, color: c.info, label: 'H2',  val: `${d.latest?.hydrogen || 0} ppm`, vc: c.textSec },
                  ].map(m => {
                    const MIcon = m.icon
                    return (
                      <div key={m.label} style={{ background: c.bgCard2, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MIcon size={13} color={m.color} />
                        <span style={{ color: c.textFaint, fontSize: 12, flex: 1 }}>{m.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: m.vc }}>{m.val}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ background: getStatusBg(status), color: color, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                  {status === 'GOOD' ? 'Air Quality Safe' : ['MODERATE', 'UNHEALTHY_FOR_SENSITIVE', 'UNHEALTHY'].includes(status) ? 'Elevated Levels Detected' : 'Immediate Clinical Action Required'}
                </div>
              </div>
            )
          })}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, marginTop: 36, display: 'flex', alignItems: 'center', gap: 8, color: c.text }}>
          <FiBell size={18} color={c.warning} /> Clinical Alerts
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: c.bgCard, borderRadius: 16, color: c.textFaint }}>No active clinical alerts</div>
          ) : alerts.map((a, i) => (
            <div key={a._id || i} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderLeft: `4px solid ${getStatusColor(a.status)}`, borderRadius: 14, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, opacity: a.status === 'ACKNOWLEDGED' ? 0.6 : 1 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: c.text }}>{a.room?.name || 'Unknown Room'}</div>
                <div style={{ color: c.textSec, fontSize: 13 }}>{a.parameter}: <strong style={{ color: getStatusColor(a.status) }}>{a.value} {a.parameter.toLowerCase().includes('pm') ? 'µg/m³' : a.parameter.toLowerCase().includes('tvoc') ? 'ppb' : a.parameter.toLowerCase().includes('temp') ? '°C' : '%'}</strong></div>
                <div style={{ color: c.textFaint, fontSize: 12, marginTop: 4 }}>{new Date(a.triggeredAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <span style={{ background: getStatusBg(a.status), color: getStatusColor(a.status), padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{a.status}</span>
                {a.status !== 'ACKNOWLEDGED'
                  ? <button onClick={() => acknowledge(a._id)} style={{ background: c.successBg, border: `1px solid rgba(46,213,115,0.3)`, color: c.success, padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Acknowledge</button>
                  : <span style={{ color: c.success, fontSize: 12, fontWeight: 600 }}>Acknowledged</span>
                }
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
