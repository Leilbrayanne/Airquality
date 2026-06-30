import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiDownload, FiCheckSquare, FiSquare, FiAlertCircle } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

const params = [
  { key: 'pm10', label: 'PM10 (µg/m³)' },
  { key: 'pm25', label: 'PM2.5 (µg/m³)' },
  { key: 'tvoc', label: 'TVOC (ppb)' },
  { key: 'temperature', label: 'Temperature (°C)' },
  { key: 'humidity',  label: 'Humidity (%)' },
]

export default function BulkExport() {
  const [rooms, setRooms] = useState([])
  const [selRooms,  setSelRooms]  = useState([])
  const [selParams, setSelParams] = useState(params.map(p => p.key))
  const [dateFrom,  setDateFrom]  = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [dateTo,    setDateTo]    = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const c = useColors()
  const { get } = useApi()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await get('/rooms')
        setRooms(data)
        setSelRooms(data.map(r => r.roomId))
      } catch (err) {
        console.error('Failed to fetch rooms:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [get])

  const toggleRoom  = id => setSelRooms(p  => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleParam = k  => setSelParams(p => p.includes(k)  ? p.filter(x => x !== k)  : [...p, k])
  const allRooms    = selRooms.length === rooms.length
  const allParams   = selParams.length === params.length

  const dayCount = Math.max(1, Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1)

  const doExport = async () => {
    try {
      setExporting(true)
      const cell = v => `"${String(v).replace(/"/g, '""')}"`
      const lines = []
      lines.push(cell('PureAir Monitoring - Bulk Export'))
      lines.push(cell(`Generated: ${new Date().toLocaleString()}`))
      lines.push(cell(`Date Range: ${dateFrom} to ${dateTo}`))
      lines.push('')

      const selectedParams = params.filter(p => selParams.includes(p.key))
      const headers = ['Date', 'Time', 'Room', 'Room ID', ...selectedParams.map(p => p.label)]
      lines.push(headers.map(cell).join(','))

      for (const roomId of selRooms) {
        const roomObj = rooms.find(r => r.roomId === roomId)
        const data = await get(`/sensors/history/${roomId}`)
        const filtered = data.filter(d => {
          const dDate = d.timestamp.split('T')[0]
          return dDate >= dateFrom && dDate <= dateTo
        })

        filtered.forEach(row => {
          const timestamp = new Date(row.timestamp)
          const dateStr = timestamp.toLocaleDateString()
          const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const vals = selectedParams.map(p => row[p.key] !== undefined ? row[p.key] : 'N/A')
          lines.push([dateStr, timeStr, roomObj?.name || roomId, roomId, ...vals].map(cell).join(','))
        })
      }

      const csv = '\uFEFF' + lines.join('\r\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      a.download = `bulk_export_${dateFrom}_to_${dateTo}.csv`
      a.click()
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const inputStyle = { background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 14px', color: c.text, fontSize: 14, outline: 'none', transition: 'background 0.3s', width: '100%' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role={currentUser?.role} userName={currentUser?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Bulk Export</h1>
          <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Download all rooms at once in a single CSV file</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24 }}>

          {/* Date range */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, transition: 'background 0.3s' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 18 }}>Date Range</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', color: c.textSec, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', color: c.textSec, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ background: c.bgCard2, borderRadius: 10, padding: '12px 16px', color: c.textSec, fontSize: 13 }}>
                {dayCount} day{dayCount !== 1 ? 's' : ''} selected
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, transition: 'background 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Rooms</h3>
              <button onClick={() => setSelRooms(allRooms ? [] : rooms.map(r => r.roomId))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: c.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {allRooms ? <FiCheckSquare size={14} /> : <FiSquare size={14} />} {allRooms ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? <div style={{ color: c.textFaint, fontSize: 14 }}>Loading rooms...</div> : rooms.map(r => {
                const sel = selRooms.includes(r.roomId)
                return (
                  <button key={r.roomId} onClick={() => toggleRoom(r.roomId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${sel ? c.primary : c.border}`, background: sel ? `${c.primary}10` : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    {sel ? <FiCheckSquare size={15} color={c.primary} /> : <FiSquare size={15} color={c.textFaint} />}
                    <span style={{ flex: 1, color: sel ? c.text : c.textSec, fontSize: 14, fontWeight: sel ? 600 : 400 }}>{r.name || r.roomId}</span>
                    <span style={{ background: c.bgCard2, color: c.textFaint, padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>{r.type || 'Standard'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Parameters */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, transition: 'background 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Parameters</h3>
              <button onClick={() => setSelParams(allParams ? [] : params.map(p => p.key))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: c.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {allParams ? <FiCheckSquare size={14} /> : <FiSquare size={14} />} {allParams ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {params.map(p => {
                const sel = selParams.includes(p.key)
                return (
                  <button key={p.key} onClick={() => toggleParam(p.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${sel ? c.accent : c.border}`, background: sel ? `${c.accent}10` : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    {sel ? <FiCheckSquare size={15} color={c.accent} /> : <FiSquare size={15} color={c.textFaint} />}
                    <span style={{ color: sel ? c.text : c.textSec, fontSize: 14, fontWeight: sel ? 600 : 400 }}>{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Summary + Export */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, transition: 'background 0.3s' }}>
          <div>
            <div style={{ color: c.text, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Export Summary</div>
            <div style={{ color: c.textSec, fontSize: 14 }}>
              {selRooms.length} rooms · {selParams.length} parameters · {dayCount} days
            </div>
          </div>
          <button onClick={doExport} disabled={!selRooms.length || !selParams.length || exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: selRooms.length && selParams.length ? c.gradient : c.border, color: '#fff', border: 'none', padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: (selRooms.length && selParams.length && !exporting) ? 'pointer' : 'not-allowed' }}>
            {exporting ? 'Exporting...' : <><FiDownload size={16} /> Download CSV</>}
          </button>
        </div>
      </main>
    </div>
  )
}
