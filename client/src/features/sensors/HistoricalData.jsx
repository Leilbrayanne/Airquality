import { useState, useMemo, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiDownload, FiFilter, FiCalendar, FiFileText, FiX } from 'react-icons/fi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

const paramLabels = { 
  pm10: 'PM10 (µg/m³)', 
  pm25: 'PM2.5 (µg/m³)',
  tvoc: 'TVOC (ppb)', 
  temperature: 'Temp (°C)', 
  humidity: 'Humidity (%)',
  eco2: 'eCO2 (ppm)'
}

const params = Object.keys(paramLabels)

export default function HistoricalData({ sidebarRole = 'technician' }) {
  const [rooms, setRooms] = useState([])
  const [room, setRoom] = useState('')
  const [param, setParam] = useState('pm10')
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [exportModal, setExportModal] = useState(false)
  const [exportRooms, setExportRooms] = useState([])
  const [exportParams, setExportParams] = useState(['pm10', 'tvoc', 'temperature', 'humidity'])
  const { get } = useApi()
  const { user } = useAuth()
  const c = useColors()

  const paramColors = { 
    pm10: c.primary, 
    pm25: c.accent,
    tvoc: c.accent, 
    temperature: c.warning, 
    humidity: '#38bdf8',
    eco2: c.danger
  }

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomsData = await get('/rooms')
        setRooms(roomsData)
        if (roomsData.length > 0) {
          setRoom(roomsData[0].roomId)
          setExportRooms([roomsData[0].roomId])
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err)
      }
    }
    fetchRooms()
  }, [get])

  // Fetch historical data when room or dates change
  useEffect(() => {
    if (!room) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // The backend endpoint is /api/sensors/history/:roomIdStr
        const historyData = await get(`/sensors/history/${room}`)
        
        // Filter by date range on client side if backend doesn't support it yet
        // or just show what the backend returns (last 50 readings)
        const filteredData = historyData.filter(d => {
          const dDate = d.timestamp.split('T')[0]
          return dDate >= dateFrom && dDate <= dateTo
        })
        
        setData(filteredData)
      } catch (err) {
        console.error('Failed to fetch historical data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [room, dateFrom, dateTo, get])

  const chartData = useMemo(() => {
    return data.map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      [param]: d[param] || 0,
      fullTime: new Date(d.timestamp).toLocaleString()
    }))
  }, [data, param])

  const stats = useMemo(() => {
    if (!data.length) return { avg: 0, max: 0, min: 0, count: 0 }
    const vals = data.map(d => d[param]).filter(v => v !== undefined)
    if (!vals.length) return { avg: 0, max: 0, min: 0, count: 0 }
    
    return {
      avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
      max: Math.max(...vals).toFixed(1),
      min: Math.min(...vals).toFixed(1),
      count: data.length,
    }
  }, [data, param])

  const dayCount = useMemo(() => {
    const diff = new Date(dateTo) - new Date(dateFrom)
    return Math.max(1, Math.round(diff / 86400000) + 1)
  }, [dateFrom, dateTo])

  const toggleExportRoom = (id) => setExportRooms(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  const toggleExportParam = (p) => setExportParams(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const doExport = async () => {
    const lines = []
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`

    lines.push(cell('PureAir Monitoring - Historical Report'))
    lines.push(cell(`Generated: ${new Date().toLocaleString()}`))
    lines.push(cell(`Date Range: ${dateFrom} to ${dateTo}`))
    lines.push('')

    // Summary Header
    lines.push(['Room', 'Parameter', 'Average', 'Maximum', 'Minimum', 'Readings'].map(cell).join(','))

    for (const roomId of exportRooms) {
      const roomObj = rooms.find(r => r.roomId === roomId)
      const rName = roomObj ? roomObj.name : roomId
      
      try {
        const rData = await get(`/sensors/history/${roomId}`)
        const filteredRData = rData.filter(d => {
          const dDate = d.timestamp.split('T')[0]
          return dDate >= dateFrom && dDate <= dateTo
        })

        exportParams.forEach(p => {
          const vals = filteredRData.map(d => d[p]).filter(v => v !== undefined)
          if (vals.length > 0) {
            const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
            const max = Math.max(...vals).toFixed(1)
            const min = Math.min(...vals).toFixed(1)
            lines.push([rName, paramLabels[p], avg, max, min, vals.length].map(cell).join(','))
          }
        })
      } catch (err) {
        console.error(`Export failed for room ${roomId}:`, err)
      }
    }

    lines.push('')
    lines.push(cell('=== RAW DATA ==='))
    const headers = ['Timestamp', 'Room', ...exportParams.map(p => paramLabels[p])]
    lines.push(headers.map(cell).join(','))

    for (const roomId of exportRooms) {
      const roomObj = rooms.find(r => r.roomId === roomId)
      const rName = roomObj ? roomObj.name : roomId
      
      try {
        const rData = await get(`/sensors/history/${roomId}`)
        const filteredRData = rData.filter(d => {
          const dDate = d.timestamp.split('T')[0]
          return dDate >= dateFrom && dDate <= dateTo
        })

        filteredRData.forEach(row => {
          const vals = exportParams.map(p => row[p] !== undefined ? row[p] : 'N/A')
          lines.push([new Date(row.timestamp).toLocaleString(), rName, ...vals].map(cell).join(','))
        })
      } catch (err) {
        console.error(`Export raw data failed for room ${roomId}:`, err)
      }
    }

    const csv = '\uFEFF' + lines.join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `pureair_report_${dateFrom}_to_${dateTo}.csv`
    a.click()
    setExportModal(false)
  }

  const selectStyle = { background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 14px', color: c.text, fontSize: 14, outline: 'none', transition: 'background 0.3s', width: '100%' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Historical Data</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>View and export air quality trends from real-time sensors</p>
          </div>
          <button onClick={() => setExportModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <FiFileText size={15} /> Export Report
          </button>
        </div>

        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 24, transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 160px' }}>
              <label style={{ color: c.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}><FiFilter size={12} /> Room</label>
              <select value={room} onChange={e => setRoom(e.target.value)} style={selectStyle}>
                <option value="" disabled>Select a room</option>
                {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.name || r.roomId}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 160px' }}>
              <label style={{ color: c.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Parameter</label>
              <select value={param} onChange={e => setParam(e.target.value)} style={selectStyle}>
                {params.map(p => <option key={p} value={p}>{paramLabels[p]}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 140px' }}>
              <label style={{ color: c.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}><FiCalendar size={12} /> From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={selectStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 140px' }}>
              <label style={{ color: c.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}><FiCalendar size={12} /> To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={selectStyle} />
            </div>
          </div>
          <div style={{ marginTop: 12, color: c.textFaint, fontSize: 12 }}>
            {loading ? 'Loading data from backend...' : (
              <>Showing <strong style={{ color: c.primary }}>{data.length}</strong> readings across <strong style={{ color: c.primary }}>{dayCount}</strong> days for {rooms.find(r => r.roomId === room)?.name || room}</>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Average', val: stats.avg, color: c.primary },
            { label: 'Maximum', val: stats.max, color: c.danger },
            { label: 'Minimum', val: stats.min, color: c.success },
            { label: 'Readings', val: stats.count, color: c.accent },
            { label: 'Days', val: dayCount, color: c.warning },
          ].map(st => (
            <div key={st.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 24px', transition: 'background 0.3s' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: st.color }}>{st.val}</div>
              <div style={{ color: c.textMuted, fontSize: 13 }}>{st.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 24, transition: 'background 0.3s' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: c.text }}>{paramLabels[param]} — {rooms.find(r => r.roomId === room)?.name || room}</h3>
          <p style={{ color: c.textFaint, fontSize: 12, marginBottom: 16 }}>Historical sensor data trends</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
              <XAxis dataKey="time" stroke={c.textFaint} tick={{ fontSize: 12, fill: c.textFaint }} />
              <YAxis stroke={c.textFaint} tick={{ fontSize: 12, fill: c.textFaint }} />
              <Tooltip 
                contentStyle={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text }}
                labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
                formatter={(value) => [value, paramLabels[param]]}
              />
              <Legend />
              <Line type="monotone" dataKey={param} stroke={paramColors[param]} strokeWidth={2} dot={{ r: 3 }} name={paramLabels[param]} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden', transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${c.border}` }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Recent Raw Data</h3>
              <p style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>{data.length} records retrieved</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ color: c.textFaint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${c.border}`, background: c.bgCard2 }}>Timestamp</th>
                  {params.filter(p => exportParams.includes(p)).map(p => (
                    <th key={p} style={{ color: c.textFaint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${c.border}`, background: c.bgCard2 }}>{paramLabels[p]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${c.bgCard2}` }}>
                    <td style={{ padding: '10px 16px', color: c.text, fontSize: 13 }}>{new Date(d.timestamp).toLocaleString()}</td>
                    {params.filter(p => exportParams.includes(p)).map(p => (
                      <td key={p} style={{ padding: '10px 16px', color: c.textSec, fontSize: 13 }}>{d[p] !== undefined ? d[p] : '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {exportModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 30px 70px rgba(0,0,0,0.4)', transition: 'background 0.3s' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 28px', borderBottom: `1px solid ${c.border}` }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>Export Report</h3>
                  <p style={{ color: c.textMuted, fontSize: 13, marginTop: 3 }}>Fetch real data for export</p>
                </div>
                <button onClick={() => setExportModal(false)} style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer' }}><FiX size={20} /></button>
              </div>

              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Date Range</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: c.textFaint, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>From</div>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...selectStyle, width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: c.textFaint, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>To</div>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...selectStyle, width: '100%' }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Rooms to Include</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {rooms.map(r => {
                      const active = exportRooms.includes(r.roomId)
                      return (
                        <button key={r.roomId} onClick={() => toggleExportRoom(r.roomId)}
                          style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${active ? c.primary : c.border}`, background: active ? `${c.primary}18` : 'transparent', color: active ? c.primary : c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                          {r.name || r.roomId}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Parameters to Export</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {params.map(p => {
                      const active = exportParams.includes(p)
                      return (
                        <button key={p} onClick={() => toggleExportParam(p)}
                          style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${active ? c.accent : c.border}`, background: active ? `${c.accent}18` : 'transparent', color: active ? c.accent : c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                          {paramLabels[p]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 28px', borderTop: `1px solid ${c.border}` }}>
                <button onClick={() => setExportModal(false)}
                  style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textSec, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={doExport} disabled={!exportRooms.length || !exportParams.length}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: exportRooms.length && exportParams.length ? c.gradient : c.border, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: exportRooms.length && exportParams.length ? 'pointer' : 'not-allowed' }}>
                  <FiDownload size={15} /> Download CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
