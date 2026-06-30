import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import NotificationPanel from '../../shared/components/NotificationPanel'
import { FiWind, FiThermometer, FiDroplet, FiActivity, FiAlertOctagon, FiTrash2 } from 'react-icons/fi'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useColors } from '../../shared/hooks/useColors'
import { useTranslation } from 'react-i18next'
import { useApi } from '../../shared/utils/api'
import { useSocket } from '../../shared/utils/socket'
import { useAuth } from '../../shared/contexts/AuthContext'

export default function TechnicianDashboard() {
  const [sensorData, setSensorData] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({ maintenanceMode: false, predictiveEnabled: true })
  const [error, setError] = useState(null)
  const c = useColors()
  const { t } = useTranslation()
  const { get, del } = useApi()
  const { user } = useAuth()

  // Trend logic
  const [prediction, setPrediction] = useState({ trend: 'STABLE', status: 'GOOD', rate: 0 })

  const handleDeleteRoom = async (roomId, _id) => {
    if (window.confirm(`Are you sure you want to completely delete room ${roomId}? This cannot be undone.`)) {
      try {
        await del(`/rooms/${_id}`)
        setSensorData(prev => prev.filter(d => d.room._id !== _id))
        if (selectedRoomId === roomId) {
          const remaining = sensorData.filter(d => d.room._id !== _id)
          setSelectedRoomId(remaining.length > 0 ? remaining[0].room.roomId : null)
          setHistoryData([])
        }
      } catch (err) {
        alert(`Failed to delete room: ${err.message}`)
      }
    }
  }

  // WebSocket for real-time updates
  useSocket('airquality/live', (data) => {
    setSensorData(prev => prev.map(d => 
      d.room.roomId === data.roomId ? { ...d, latest: data } : d
    ))
    
    if (selectedRoomId === data.roomId) {
      setHistoryData(prev => {
        const newPoint = {
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pm10: data.pm10 || 0,
          gas: data.gas || 0
        }
        return [...prev.slice(-19), newPoint]
      })
    }
  })

  useSocket('system/config', (newConfig) => {
    setConfig(newConfig)
  })

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const sysConfig = await get('/notifications/config')
        setConfig(sysConfig)

        const currentData = await get('/sensors/current')
        setSensorData(currentData)
        
        if (currentData.length > 0 && !selectedRoomId) {
          setSelectedRoomId(currentData[0].room.roomId)
        }
      } catch (err) {
        setError(err.message || 'Failed to connect to backend')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [get])

  // Fetch history when selected room changes
  useEffect(() => {
    if (selectedRoomId) {
      const fetchHistory = async () => {
        try {
          const [history, trendData] = await Promise.all([
            get(`/sensors/history/${selectedRoomId}`),
            get(`/sensors/trends/${selectedRoomId}`)
          ])
          
          const transformed = history.map(entry => ({
            time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pm10: entry.pm10 || 0,
            tvoc: entry.tvoc || 0
          }))
          setHistoryData(transformed)
          setPrediction({
            trend: trendData.trend,
            status: trendData.predictedStatus,
            rate: trendData.rate,
            predictedAqi: trendData.predictedAqi
          })
        } catch (err) {
          console.warn('Failed to fetch analytics for room:', err.message)
        }
      }
      fetchHistory()
    }
  }, [selectedRoomId, get])

  if (loading && sensorData.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
        <Sidebar role="technician" userName="Technician" />
        <main style={{ marginLeft: 240, flex: 1, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: c.text }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', border: `3px solid ${c.primary}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <h2>{t('facility.loading')}</h2>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>
    )
  }

  const selectedData = sensorData.find(d => d.room.roomId === selectedRoomId) || sensorData[0]

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        {config.maintenanceMode && (
          <div style={{ background: c.warning, color: '#000', padding: '10px 24px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#000', animation: 'pulse 1s infinite' }} />
            SYSTEM CALIBRATION ACTIVE — Sensor alerts are suppressed during maintenance.
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
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>{t('technician.liveMonitor')}</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Real-time facility-wide air quality surveillance</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {config.predictiveEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.bgCard, border: `1px solid ${c.border}`, padding: '8px 16px', borderRadius: 20, fontSize: 13, color: c.textSec }}>
                 Forecast: <strong style={{ color: prediction.status === 'GOOD' ? c.success : c.warning }}>{prediction.status}</strong> 
                 <span style={{ fontSize: 11, color: c.textFaint }}>({prediction.trend})</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: c.successBg, border: '1px solid rgba(46,213,115,0.3)', color: c.success, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.success, display: 'inline-block' }} /> {t('technician.liveMonitoring')}
            </div>
            <NotificationPanel />
          </div>
        </div>

        {/* Room Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20, marginBottom: 28 }}>
          {sensorData.map(d => (
            <div key={d.room.roomId} onClick={() => setSelectedRoomId(d.room.roomId)}
               style={{ background: c.bgCard, border: `2px solid ${selectedRoomId === d.room.roomId ? getStatusColor(d.latest?.aqi_status) : c.border}`, borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                 <div>
                   <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>{d.room.name}</div>
                   <div style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>{d.room.roomId}</div>
                 </div>
                 <span style={{ background: getStatusBg(d.latest?.aqi_status), color: getStatusColor(d.latest?.aqi_status), padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                   {d.latest?.aqi_status || 'Offline'}
                 </span>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 {[
                   { label: 'PM10', val: d.latest?.pm10 || 0, unit: 'µg/m³', color: getStatusColor(d.latest?.aqi_status) },
                   { label: 'GAS', val: d.latest?.gas || 0, unit: 'ppm', color: c.textSec },
                   { label: 'TEMP', val: d.latest?.temperature || 0, unit: '°C', color: c.textSec },
                   { label: 'H2', val: d.latest?.hydrogen || 0, unit: 'ppm', color: c.textSec },
                   { label: 'HUM',  val: d.latest?.humidity || 0, unit: '%', color: c.textSec },
                 ].map(m => (
                   <div key={m.label} style={{ background: c.bgCard2, borderRadius: 10, padding: '10px 12px' }}>
                     <span style={{ display: 'block', color: c.textFaint, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</span>
                     <span style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.val}</span>
                     <span style={{ color: c.textFaint, fontSize: 11, marginLeft: 4 }}>{m.unit}</span>
                   </div>
                 ))}
               </div>
             </div>
          ))}
        </div>

        {/* Detail */}
        {selectedData && (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{selectedData.room.name} — Detailed Monitor</h3>
                <p style={{ color: c.textFaint, fontSize: 13, marginTop: 4 }}>Building: {selectedData.room.building || 'Main'} · Floor: {selectedData.room.floor || '1'} · Last reading: {selectedData.latest ? new Date(selectedData.latest.timestamp).toLocaleTimeString() : 'N/A'}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => handleDeleteRoom(selectedData.room.roomId, selectedData.room._id)} style={{ background: c.dangerBg, border: `1px solid rgba(255,107,107,0.3)`, color: c.danger, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiTrash2 size={14} /> Delete Room
                </button>
                <span style={{ background: getStatusBg(selectedData.latest?.aqi_status), color: getStatusColor(selectedData.latest?.aqi_status), padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{selectedData.latest?.aqi_status || 'Unknown'}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 20 }}>
              {[
                { label: 'PM10', value: selectedData.latest?.pm10 || 0, unit: 'µg/m³', icon: FiWind, safe: 20, warn: 50 },
                { label: 'GAS', value: selectedData.latest?.gas || 0, unit: 'ppm', icon: FiActivity, safe: 300, warn: 600 },
                { label: 'Temperature', value: selectedData.latest?.temperature || 0, unit: '°C', icon: FiThermometer, safe: 26, warn: 30 },
                { label: 'Humidity', value: selectedData.latest?.humidity || 0, unit: '%', icon: FiDroplet, safe: 60, warn: 70 },
              ].map(m => {
                const Icon = m.icon
                const color = m.value > m.warn ? c.danger : m.value > m.safe ? c.warning : c.success
                const pct = Math.min((m.value / (m.warn * 1.5)) * 100, 100)
                return (
                  <div key={m.label} style={{ background: c.bgCard2, borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Icon size={16} color={color} />
                      <span style={{ color: c.textSec, fontSize: 13 }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color }}>{m.value}</div>
                    <div style={{ color: c.textFaint, fontSize: 12 }}>{m.unit}</div>
                    <div style={{ height: 4, background: c.border, borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Chart */}
        {selectedData && (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: c.text }}>Recent Trend — {selectedData.room.name}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="fg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                <XAxis dataKey="time" stroke={c.textFaint} tick={{ fontSize: 12, fill: c.textFaint }} />
                <YAxis stroke={c.textFaint} tick={{ fontSize: 12, fill: c.textFaint }} />
                <Tooltip contentStyle={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text }} />
                <Area type="monotone" dataKey="pm10" stroke={c.primary} fill="url(#fg1)" strokeWidth={2} name="PM10" />
                <Area type="monotone" dataKey="gas" stroke={c.accent} fill="none" strokeWidth={2} dot={false} name="GAS" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  )
}
