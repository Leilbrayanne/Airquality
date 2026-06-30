import { useEffect, useState } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import NotificationPanel from '../../shared/components/NotificationPanel'
import { FiUsers, FiCpu, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useColors } from '../../shared/hooks/useColors'
import { useTranslation } from 'react-i18next'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

const BUCKETS = [
  { label: '00:00', start: 0, end: 4 },
  { label: '04:00', start: 4, end: 8 },
  { label: '08:00', start: 8, end: 12 },
  { label: '12:00', start: 12, end: 16 },
  { label: '16:00', start: 16, end: 20 },
  { label: '20:00', start: 20, end: 24 },
  { label: '23:59', start: 23, end: 24 },
]

const formatNumber = (value, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A'
  }
  return Number(value).toFixed(digits)
}

const mapSeverity = (severity) => {
  const normalized = String(severity || '').toUpperCase()
  if (normalized === 'CRITICAL') return 'critical'
  if (normalized === 'HIGH' || normalized === 'MEDIUM') return 'warning'
  return 'normal'
}

const mapAqiStatus = (status) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'GOOD') return 'normal'
  if (normalized === 'MODERATE' || normalized === 'UNHEALTHY_FOR_SENSITIVE') return 'warning'
  if (normalized === 'UNHEALTHY' || normalized === 'VERY_UNHEALTHY' || normalized === 'HAZARDOUS') return 'critical'
  return 'normal'
}

const getStatus = (room, latest, profile) => {
  if (!latest) return 'normal'

  const pm10 = Number(latest.pm10)
  const tvoc = Number(latest.tvoc)
  const temp = Number(latest.temperature)
  const humidity = Number(latest.humidity)

  if (profile?.pm10?.critical !== undefined && pm10 >= Number(profile.pm10.critical)) return 'critical'
  if (profile?.pm10?.warning !== undefined && pm10 >= Number(profile.pm10.warning)) return 'warning'
  if (profile?.tvoc?.critical !== undefined && tvoc >= Number(profile.tvoc.critical)) return 'critical'
  if (profile?.tvoc?.warning !== undefined && tvoc >= Number(profile.tvoc.warning)) return 'warning'
  if (profile?.temperature?.criticalHigh !== undefined && temp >= Number(profile.temperature.criticalHigh)) return 'critical'
  if (profile?.temperature?.warningHigh !== undefined && temp >= Number(profile.temperature.warningHigh)) return 'warning'
  if (profile?.temperature?.warningLow !== undefined && temp <= Number(profile.temperature.warningLow)) return 'warning'
  if (profile?.humidity?.warningHigh !== undefined && humidity >= Number(profile.humidity.warningHigh)) return 'warning'
  if (profile?.humidity?.warningLow !== undefined && humidity <= Number(profile.humidity.warningLow)) return 'warning'

  return mapAqiStatus(latest.aqi_status)
}

const formatAlertValue = (alert) => {
  const parameter = String(alert.parameter || '').toLowerCase()
  const value = Number(alert.value)

  if (parameter === 'pm10' || parameter === 'pm25') {
    return `${formatNumber(value, 1)} µg/m³`
  }
  if (parameter === 'tvoc') {
    return `${formatNumber(value, 1)} ppb`
  }
  if (parameter === 'humidity') {
    return `${formatNumber(value, 1)}%`
  }
  if (parameter === 'temperature') {
    return `${formatNumber(value, 1)}°C`
  }

  return formatNumber(value, 1)
}

const formatAlertLabel = (parameter) => {
  const normalized = String(parameter || '').toLowerCase()
  if (normalized === 'pm10') return 'PM10'
  if (normalized === 'pm25') return 'PM2.5'
  if (normalized === 'tvoc') return 'TVOC'
  if (normalized === 'humidity') return 'Humidity'
  if (normalized === 'temperature') return 'Temperature'
  return normalized.toUpperCase()
}

const buildTrendSeries = (historyByRoom) => {
  if (!historyByRoom?.length) {
    return []
  }

  const series = BUCKETS.map(bucket => ({ time: bucket.label, pm10: null, gas: null }))

  historyByRoom.forEach((history) => {
    if (!Array.isArray(history)) return

    history.forEach((reading) => {
      const timestamp = new Date(reading.timestamp)
      if (Number.isNaN(timestamp.getTime())) return

      const hour = timestamp.getHours()
      const bucketIndex = BUCKETS.findIndex(bucket => {
        if (bucket.label === '23:59') {
          return hour >= 20
        }
        return hour >= bucket.start && hour < bucket.end
      })

      if (bucketIndex === -1) return

      const item = series[bucketIndex]
      if (reading.pm10 !== undefined && reading.pm10 !== null) {
        const current = Number(item.pm10) || 0
        const count = (item._pm10Count || 0) + 1
        item.pm10 = current + Number(reading.pm10)
        item._pm10Count = count
      }
        if (reading.gas !== undefined && reading.gas !== null) {
          const current = Number(item.gas) || 0
          const count = (item._gasCount || 0) + 1
          item.gas = current + Number(reading.gas)
          item._gasCount = count
        }
    })
  })

  series.forEach((item) => {
    if (item._pm10Count) {
      item.pm10 = item.pm10 / item._pm10Count
    }
      if (item._gasCount) {
        item.gas = item.gas / item._gasCount
      }
    delete item._pm10Count
    delete item._tvocCount
  })

  return series
}

export default function AdminDashboard() {
  const c = useColors()
  const { t } = useTranslation()
  const { get } = useApi()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)
  const [users, setUsers] = useState([])
  const [alerts, setAlerts] = useState([])
  const [currentRooms, setCurrentRooms] = useState([])
  const [rooms, setRooms] = useState([])
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        const [healthData, usersData, alertsData, currentData, roomsData] = await Promise.all([
          get('/health'),
          get('/users'),
          get('/alerts'),
          get('/sensors/current'),
          get('/rooms')
        ])

        if (!active) return

        const normalisedRooms = currentData.map((entry) => {
          const room = entry.room || {}
          const latest = entry.latest || null
          const profile = roomsData.find((candidate) => candidate._id === room._id)?.thresholdProfile || null
          return {
            id: room.roomId || room._id,
            _id: room._id,
            roomId: room.roomId || room._id,
            name: room.name || room.roomId || 'Unknown room',
            latest,
            status: getStatus(room, latest, profile),
            pm10: latest?.pm10 ?? null,
            tvoc: latest?.tvoc ?? null,
            methane: latest?.methane ?? null,
            gas: latest?.gas ?? null,
            hydrogen: latest?.hydrogen ?? null,
            temp: latest?.temperature ?? null,
            hum: latest?.humidity ?? null,
          }
        })

        const histories = await Promise.all(
          normalisedRooms.map((room) =>
            get(`/sensors/history/${room.roomId}`).catch(() => [])
          )
        )

        setHealth(healthData)
        setUsers(usersData)
        setAlerts(alertsData.data || [])
        setCurrentRooms(normalisedRooms)
        setRooms(roomsData)
        setChartData(buildTrendSeries(histories))
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [get])

  const statusColor = { normal: c.success, warning: c.warning, critical: c.danger }
  const statusBg = { normal: c.successBg, warning: c.warningBg, critical: c.dangerBg }

  const activeAlerts = Array.isArray(alerts) ? alerts.filter((alert) => String(alert.status || '').toUpperCase() === 'ACTIVE') : []
  const criticalAlerts = activeAlerts.filter((alert) => mapSeverity(alert.severity) === 'critical')
  const activeSensors = health?.nodes?.filter((node) => ['ONLINE', 'DEGRADED'].includes(String(node.status || '').toUpperCase())).length ?? currentRooms.length
  const userCount = Array.isArray(users) ? users.length : 0
  const roles = Array.from(new Set((users || []).map((entry) => entry.role).filter(Boolean)))
  const pm10Values = currentRooms
    .map((room) => Number(room.pm10))
    .filter((value) => Number.isFinite(value))
  const avgPm10 = pm10Values.length ? pm10Values.reduce((sum, value) => sum + value, 0) / pm10Values.length : 0

  const todaysDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  const s = {
    layout: { display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' },
    main: { marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
    pageTitle: { fontSize: 28, fontWeight: 800, color: c.text },
    pageSub: { color: c.textMuted, fontSize: 14, marginTop: 4 },
    headerRight: { display: 'flex', gap: 12, alignItems: 'center' },
    liveChip: { display: 'flex', alignItems: 'center', gap: 6, background: c.successBg, border: `1px solid rgba(46,213,115,0.3)`, color: c.success, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 },
    liveDot: { width: 8, height: 8, borderRadius: '50%', background: c.success, display: 'inline-block' },
    dateChip: { background: c.bgCard, border: `1px solid ${c.border}`, color: c.textSec, padding: '6px 14px', borderRadius: 20, fontSize: 13 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginBottom: 28 },
    kpiCard: { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 16, transition: 'background 0.3s' },
    kpiValue: { fontSize: 28, fontWeight: 800, color: c.text },
    kpiLabel: { color: c.textSec, fontSize: 13, fontWeight: 600 },
    kpiSub: { color: c.textFaint, fontSize: 12, marginTop: 2 },
    chartCard: { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 28 },
    chartTitle: { fontSize: 16, fontWeight: 700, color: c.text },
    twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 24 },
    tableCard: { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 },
    alertCard: { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 },
    cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 20, color: c.text },
    th: { color: c.textFaint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${c.border}` },
    tr: { borderBottom: `1px solid ${c.bgCard2}` },
    td: { padding: '12px', color: c.textSec, fontSize: 13 },
    alertItem: { background: c.bgCard2, borderRadius: 10, padding: '14px 16px' },
  }

  const kpis = [
    { icon: FiCpu, label: t('dashboard.activeSensors'), value: activeSensors.toString(), sub: t('dashboard.allOnline'), color: c.primary },
    { icon: FiAlertTriangle, label: t('dashboard.activeAlerts'), value: activeAlerts.length.toString(), sub: `${criticalAlerts.length} ${t('dashboard.critical').toLowerCase()}`, color: c.danger },
    { icon: FiUsers, label: t('dashboard.systemUsers'), value: userCount.toString(), sub: `${roles.length} ${roles.length === 1 ? 'role' : 'roles'}`, color: c.accent },
    { icon: FiTrendingUp, label: t('dashboard.avgPM10Today'), value: formatNumber(avgPm10, 1), sub: t('dashboard.acrossRooms'), color: c.warning },
  ]

  return (
    <div style={s.layout}>
      <Sidebar role={user?.role || 'admin'} userName={user?.username || 'Admin'} />
      <main style={s.main}>
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{t('dashboard.adminDashboard')}</h1>
            <p style={s.pageSub}>{t('dashboard.fullSystemOverview')}</p>
          </div>
          <div style={s.headerRight}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.successBg, border: `1px solid rgba(46,213,115,0.3)`, color: c.success, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('Network reconnection initiated')}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.success, display: 'inline-block' }} /> {t('dashboard.network')}
            </div>
            <div style={s.liveChip}><span style={s.liveDot} /> {t('dashboard.live')}</div>
            <div style={s.dateChip}>{todaysDate}</div>
            <NotificationPanel />
          </div>
        </div>

        <div style={s.kpiGrid}>
          {kpis.map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} style={s.kpiCard}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: k.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={k.color} />
                </div>
                <div>
                  <div style={s.kpiValue}>{k.value}</div>
                  <div style={s.kpiLabel}>{k.label}</div>
                  <div style={s.kpiSub}>{k.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={s.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={s.chartTitle}>{t('dashboard.airQualityTrend')}</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ color: c.primary, fontSize: 13 }}>● {t('dashboard.pm10')}</span>
               <span style={{ color: c.accent, fontSize: 13 }}>● {t('dashboard.gas')}</span>
            </div>
          </div>

          {loading ? (
            <div style={{ color: c.textFaint, fontSize: 13 }}>Loading trend data...</div>
          ) : chartData.length === 0 ? (
            <div style={{ color: c.textFaint, fontSize: 13 }}>No trend data available for the last 24 hours.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pm10g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                  </linearGradient>
                   <linearGradient id="gasg" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor={c.accent} stopOpacity={0.3} />
                     <stop offset="95%" stopColor={c.accent} stopOpacity={0} />
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                <XAxis dataKey="time" stroke={c.textFaint} tick={{ fontSize: 12, fill: c.textFaint }} />
                <YAxis stroke={c.textFaint} tick={{ fontSize: 12, fill: c.textFaint }} />
                <Tooltip contentStyle={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text }} />
                <Area type="monotone" dataKey="pm10" stroke={c.primary} fill="url(#pm10g)" strokeWidth={2} />
                 <Area type="monotone" dataKey="gas" stroke={c.accent} fill="url(#gasg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={s.twoCol}>
          <div style={s.tableCard}>
            <h3 style={s.cardTitle}>{t('dashboard.roomStatus')}</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{[t('dashboard.room'), 'Timestamp', 'PM10 (µg/m³)', 'GAS (ppm)', 'Temperature (°C)', 'Humidity (%)', t('dashboard.status')].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {currentRooms.map(room => (
                    <tr key={room._id || room.roomId} style={s.tr}>
                      <td style={s.td}><div style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{room.name}</div><div style={{ color: c.textFaint, fontSize: 11 }}>{room.roomId}</div></td>
                      <td style={s.td}>{room.latest ? new Date(room.latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td style={s.td}>{formatNumber(room.pm10, 1)}{room.pm10 !== null && room.pm10 !== undefined ? ' µg/m³' : ''}</td>
                      <td style={s.td}>{formatNumber(room.gas, 1)}{room.gas !== null && room.gas !== undefined ? ' ppm' : ''}</td>
                      <td style={s.td}>{formatNumber(room.temp, 1)}{room.temp !== null && room.temp !== undefined ? '°C' : ''}</td>
                      <td style={s.td}>{formatNumber(room.hum, 1)}{room.hum !== null && room.hum !== undefined ? '%' : ''}</td>
                      <td style={s.td}>
                        <span style={{ background: statusBg[room.status], color: statusColor[room.status], padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                          {t(`dashboard.${room.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={s.alertCard}>
            <h3 style={s.cardTitle}>{t('dashboard.recentAlerts')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeAlerts.length === 0 ? (
                <div style={{ color: c.textFaint, fontSize: 13 }}>No active alerts at the moment.</div>
              ) : activeAlerts.slice(0, 5).map((alert, index) => (
                <div key={alert._id || index} style={{ ...s.alertItem, borderLeft: `3px solid ${statusColor[mapSeverity(alert.severity)]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>{alert.room?.name || alert.roomId || 'Unknown room'}</span>
                    <span style={{ color: c.textFaint, fontSize: 12 }}>{new Date(alert.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ color: c.textSec, fontSize: 13 }}>
                    {formatAlertLabel(alert.parameter)}: <strong style={{ color: statusColor[mapSeverity(alert.severity)] }}>{formatAlertValue(alert)}</strong>
                  </div>
                  <span style={{ background: statusBg[mapSeverity(alert.severity)], color: statusColor[mapSeverity(alert.severity)], padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', display: 'inline-block', marginTop: 6 }}>
                    {t(`dashboard.${mapSeverity(alert.severity)}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}