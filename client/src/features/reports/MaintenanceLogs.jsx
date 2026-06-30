import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiTool, FiPlus, FiCalendar, FiFileText, FiX, FiCheckCircle, FiTrash2 } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

export default function MaintenanceLogs() {
  const [logs, setLogs] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ roomId: '', actionType: 'SENSOR_CHECK', details: '' })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const c = useColors()
  const { get, post, put, del: apiDel } = useApi()
  const { user } = useAuth()

  const fetchData = async () => {
    try {
      setLoading(true)
      const [logsData, roomsData] = await Promise.all([
        get('/maintenance'),
        get('/rooms')
      ])
      setLogs(logsData.logs || logsData || [])
      setRooms(roomsData)
      if (roomsData.length > 0 && !form.roomId) {
        setForm(f => ({ ...f, roomId: roomsData[0].roomId }))
      }
    } catch (err) {
      console.error('Failed to fetch maintenance data:', err)
      alert('Failed to load logs: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [get])

  const openModal = () => {
    setForm({ roomId: rooms[0]?.roomId || '', actionType: 'SENSOR_CHECK', details: '' })
    setEditId(null)
    setModal(true)
  }

  const openEdit = (log) => {
    setForm({ 
      roomId: log.room?.roomId || '', 
      actionType: log.actionType, 
      details: log.details 
    })
    setEditId(log._id)
    setModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance record?')) return
    try {
      await apiDel(`/maintenance/${id}`)
      fetchData()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editId) {
        await put(`/maintenance/${editId}`, form)
      } else {
        await post('/maintenance', form)
      }
      setModal(false)
      fetchData()
    } catch (err) {
      alert('Failed to save log: ' + (err.message || 'Server error'))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 14px', color: c.text, fontSize: 14, outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Maintenance Logs</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>History of hardware checks and sensor calibrations</p>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') && (
            <button onClick={openModal}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
              <FiPlus /> Log New Action
            </button>
          )}
        </div>

        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: c.bgCard2 }}>
                {['Date', 'Technician', 'Room', 'Action', 'Details'].map(h => (
                  <th key={h} style={{ color: c.textFaint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', borderBottom: `1px solid ${c.border}` }}>{h}</th>
                ))}
                {(user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') && (
                  <th style={{ color: c.textFaint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', borderBottom: `1px solid ${c.border}` }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: c.textFaint }}>Loading logs...</td></tr>
              ) : logs.map((log, i) => (
                <tr key={log._id || i} style={{ borderBottom: i < logs.length - 1 ? `1px solid ${c.bgCard2}` : 'none' }}>
                  <td style={{ padding: '16px 24px', color: c.text, fontSize: 14 }}>{new Date(log.performedAt).toLocaleString()}</td>
                  <td style={{ padding: '16px 24px', color: c.textSec, fontSize: 14 }}>{log.technician?.username || 'System Admin'}</td>
                  <td style={{ padding: '16px 24px', color: c.textSec, fontSize: 14 }}>{log.room?.name || log.room?.roomId || 'Unassigned'}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ background: `${c.primary}18`, color: c.primary, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{log.actionType}</span>
                  </td>
                  <td style={{ padding: '16px 24px', color: c.textMuted, fontSize: 13 }}>{log.details}</td>
                  {(user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') && (
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(log)} style={{ background: 'none', border: 'none', color: c.primary, cursor: 'pointer' }} title="Edit"><FiTool size={14} /></button>
                        <button onClick={() => handleDelete(log._id)} style={{ background: 'none', border: 'none', color: c.danger, cursor: 'pointer' }} title="Delete"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: c.textFaint }}>No maintenance records found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <form onSubmit={handleSubmit} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, width: '100%', maxWidth: 480, padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{editId ? 'Edit Maintenance Log' : 'Log New Action'}</h3>
                <button type="button" onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer' }}><FiX size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Technician</label>
                  <input type="text" value={user?.username || ''} disabled style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Room</label>
                  <select value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })} style={inputStyle} required>
                    {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.name || r.roomId}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Action Type</label>
                  <select value={form.actionType} onChange={e => setForm({ ...form, actionType: e.target.value })} style={inputStyle}>
                    <option value="SENSOR_CHECK">Sensor Check</option>
                    <option value="CALIBRATION">Calibration</option>
                    <option value="FILTER_REPLACEMENT">Filter Replacement</option>
                    <option value="REPAIR">Hardware Repair</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Details</label>
                  <textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} 
                    placeholder="Describe the action performed..." rows={4} style={{ ...inputStyle, resize: 'none' }} required />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button type="button" onClick={() => setModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: c.gradient, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Log Entry'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
