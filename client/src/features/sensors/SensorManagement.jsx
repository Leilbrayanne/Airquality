import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiCpu, FiWifi, FiMapPin, FiRefreshCw } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'
import { useSocket } from '../../shared/utils/socket'

export default function SensorManagement({ sidebarRole = 'admin' }) {
  const [sensors, setSensors] = useState([])
  const [rooms, setRooms] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ node_id: '', room_id: '', firmware: '1.2.0' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [calibratingNodes, setCalibratingNodes] = useState({}) // node_id -> bool
  const c = useColors()
  const { get, post, put, del } = useApi()
  const { user } = useAuth()

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sensorsData, roomsData] = await Promise.all([
        get('/nodes'),
        get('/rooms')
      ])
      setSensors(sensorsData)
      setRooms(roomsData)
      if (roomsData.length > 0 && !form.room_id) {
        setForm(prev => ({ ...prev, room_id: roomsData[0].roomId }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [get])

  useSocket('system/node-command', (data) => {
    if (data.command === 'CALIBRATE') {
      setCalibratingNodes(prev => ({ ...prev, [data.nodeId]: true }))
      // Hide after 3 seconds (simulated hardware response time)
      setTimeout(() => {
        setCalibratingNodes(prev => ({ ...prev, [data.nodeId]: false }))
      }, 3000)
    }
  })

  const handleSave = async () => {
    try {
      if (modal === 'add') {
        await post('/nodes', form)
      } else {
        const node = sensors.find(s => s.node_id === form.node_id);
        await put(`/nodes/${node._id}`, form)
      }
      setModal(null)
      fetchData()
    } catch (err) {
      alert('Failed to save sensor: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this sensor?')) return
    try {
      await del(`/nodes/${id}`)
      fetchData()
    } catch (err) {
      alert('Failed to delete sensor: ' + err.message)
    }
  }

  const statusColor = { ONLINE: c.success, MAINTENANCE: c.warning, OFFLINE: c.danger }
  const statusBg    = { ONLINE: c.successBg, MAINTENANCE: c.warningBg, OFFLINE: c.dangerBg }

  const rssiBar = (rssi) => ({
    pct: Math.max(0, Math.min(100, ((rssi + 100) / 50) * 100)),
    color: rssi > -65 ? c.success : rssi > -80 ? c.warning : c.danger,
  })

  const inputStyle = { width: '100%', background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '11px 14px', color: c.text, fontSize: 14, outline: 'none' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Sensor Management</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Manage and monitor clinical sensor nodes</p>
          </div>
          <button onClick={() => { setForm({ node_id: '', room_id: '', firmware: '1.2.0' }); setModal('add') }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
            <FiPlus /> Register Node
          </button>
        </div>

        {loading && sensors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', color: c.text }}>Loading sensors...</div>
        ) : sensors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', background: c.bgCard, borderRadius: 20, border: `1px dashed ${c.border}` }}>
            <FiCpu size={48} color={c.textFaint} style={{ marginBottom: 16 }} />
            <h3 style={{ color: c.text, marginBottom: 8 }}>No sensors registered</h3>
            <p style={{ color: c.textMuted }}>Register your first clinical sensor node to begin monitoring.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
            {sensors.map(node => (
              <div key={node._id} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `3px solid ${statusColor[node.status] || c.textFaint}`, borderRadius: 16, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: c.bgCard2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiCpu size={20} color={statusColor[node.status]} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: c.text }}>{node.node_id}</div>
                    <div style={{ color: c.textMuted, fontSize: 12, marginTop: 3 }}><FiMapPin size={11} /> {node.room?.name || 'Unassigned'}</div>
                  </div>
                  <span style={{ background: statusBg[node.status] || c.border, color: statusColor[node.status] || c.textFaint, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{node.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ background: c.bgCard2, borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ color: c.textFaint, fontSize: 10, textTransform: 'uppercase' }}>Firmware</div>
                    <div style={{ color: c.textSec, fontSize: 13, fontWeight: 600 }}>v{node.firmware}</div>
                  </div>
                  <div style={{ background: c.bgCard2, borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ color: c.textFaint, fontSize: 10, textTransform: 'uppercase' }}>Last Active</div>
                    <div style={{ color: c.textSec, fontSize: 13, fontWeight: 600 }}>{node.last_heartbeat ? new Date(node.last_heartbeat).toLocaleTimeString() : 'Never'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={async () => {
                        if (!window.confirm(`Zero-calibrate node ${node.node_id}?`)) return;
                        try {
                          await post(`/nodes/${node.node_id}/calibrate`, {});
                        } catch (err) {
                          alert('Calibration failed: ' + err.message);
                        }
                      }} 
                      disabled={calibratingNodes[node.node_id]}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${c.primary}40`, background: calibratingNodes[node.node_id] ? c.bgCard2 : `${c.primary}10`, color: calibratingNodes[node.node_id] ? c.textFaint : c.primary, cursor: calibratingNodes[node.node_id] ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <FiRefreshCw size={14} className={calibratingNodes[node.node_id] ? 'spin' : ''} /> 
                      {calibratingNodes[node.node_id] ? 'Syncing...' : 'Zero Calibrate'}
                    </button>
                  <button onClick={() => { setForm({ node_id: node.node_id, room_id: node.room?.roomId || '', firmware: node.firmware }); setModal('edit') }} style={{ padding: '8px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'none', color: c.textSec, cursor: 'pointer' }}><FiEdit2 /></button>
                  <button onClick={() => handleDelete(node._id)} style={{ padding: '8px', borderRadius: 8, border: `1px solid ${c.danger}40`, background: c.dangerBg, color: c.danger, cursor: 'pointer' }}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: c.bgCard, padding: '32px', borderRadius: 20, width: '400px', border: `1px solid ${c.border}` }}>
              <h2 style={{ marginBottom: 24, color: c.text }}>{modal === 'add' ? 'Register Node' : 'Edit Node'}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, color: c.textSec, fontSize: 13 }}>Node ID</label>
                  <input value={form.node_id} onChange={e => setForm({...form, node_id: e.target.value})} style={inputStyle} disabled={modal === 'edit'} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, color: c.textSec, fontSize: 13 }}>Assigned Room</label>
                  <select value={form.room_id} onChange={e => setForm({...form, room_id: e.target.value})} style={inputStyle}>
                    {rooms.map(r => <option key={r._id} value={r.roomId}>{r.name} ({r.roomId})</option>)}
                    {rooms.length === 0 && <option value="">No rooms available</option>}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, color: c.textSec, fontSize: 13 }}>Firmware Version</label>
                  <input value={form.firmware} onChange={e => setForm({...form, firmware: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'none', color: c.textSec, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: c.gradient, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save Node</button>
              </div>
            </div>
          </div>
        )}
        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </div>
  )
}
