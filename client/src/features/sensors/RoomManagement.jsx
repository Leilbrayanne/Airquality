import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../shared/components/Sidebar'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiLayers, FiInfo, FiTag } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

const emptyForm = {
  roomId: '',
  name: '',
  type: 'Standard',
  thresholdProfile: '',
  useCustomThresholds: false,
  customThresholds: {
    pm10Warning: 20,
    pm10Critical: 50,
    pm25Warning: 12,
    pm25Critical: 35,
    tvocWarning: 220,
    tvocCritical: 660,
    tempWarningLow: 20,
    tempWarningHigh: 30,
    tempCriticalHigh: 50,
    humidityWarningLow: 30,
    humidityWarningHigh: 60
  }
}

export default function RoomManagement({ sidebarRole = 'admin' }) {
  const [rooms, setRooms] = useState([])
  const [profiles, setProfiles] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const c = useColors()
  const { get, post, put, del } = useApi()
  const { user } = useAuth()
  const location = useLocation()

  const fetchData = async () => {
    try {
      setLoading(true)
      const [roomsData, profilesData] = await Promise.all([
        get('/rooms'),
        get('/thresholds')
      ])
      setRooms(roomsData)
      setProfiles(profilesData)
      if (profilesData.length > 0 && !form.thresholdProfile) {
        setForm(prev => ({ ...prev, thresholdProfile: profilesData[0]._id }))
      }
    } catch (err) {
      setError('Facility Data Sync Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (r) => {
    const isCustom = r.thresholdProfile?.name?.startsWith('Custom Room')
    setForm({
      roomId: r.roomId,
      name: r.name,
      type: r.type,
      thresholdProfile: isCustom ? '' : (r.thresholdProfile?._id || ''),
      useCustomThresholds: isCustom,
      customThresholds: {
        pm10Warning: r.thresholdProfile?.pm10?.warning ?? 20,
        pm10Critical: r.thresholdProfile?.pm10?.critical ?? 50,
        pm25Warning: r.thresholdProfile?.pm25?.warning ?? 12,
        pm25Critical: r.thresholdProfile?.pm25?.critical ?? 35,
        tvocWarning: r.thresholdProfile?.tvoc?.warning ?? 220,
        tvocCritical: r.thresholdProfile?.tvoc?.critical ?? 660,
        tempWarningLow: r.thresholdProfile?.temperature?.warningLow ?? 20,
        tempWarningHigh: r.thresholdProfile?.temperature?.warningHigh ?? 30,
        tempCriticalHigh: r.thresholdProfile?.temperature?.criticalHigh ?? 50,
        humidityWarningLow: r.thresholdProfile?.humidity?.warningLow ?? 30,
        humidityWarningHigh: r.thresholdProfile?.humidity?.warningHigh ?? 60
      }
    })
    setModal('edit')
  }

  useEffect(() => {
    fetchData()
  }, [get])

  useEffect(() => {
    if (location.state?.editRoomId && rooms.length > 0) {
      const roomToEdit = rooms.find(r => r.roomId === location.state.editRoomId)
      if (roomToEdit) {
        handleEditClick(roomToEdit)
      }
    }
  }, [location.state, rooms])

  const handleSave = async () => {
    try {
      const payload = {
        roomId: form.roomId,
        name: form.name,
        type: form.type,
        thresholdProfile: form.useCustomThresholds ? undefined : form.thresholdProfile,
        customThresholds: form.useCustomThresholds ? form.customThresholds : undefined
      }

      if (modal === 'add') {
        await post('/rooms', payload)
      } else {
        const room = rooms.find(r => r.roomId === form.roomId);
        await put(`/rooms/${room._id}`, payload)
      }
      setModal(null)
      fetchData()
    } catch (err) {
      alert('Failed to save room: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room? This may affect sensor assignments.')) return
    try {
      // Backend needs DELETE /api/rooms/:id
      // I'll check if I implemented it. If not, I'll add it.
      await del(`/rooms/${id}`)
      fetchData()
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  const inputStyle = { width: '100%', background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '11px 14px', color: c.text, fontSize: 14, outline: 'none' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Facility Infrastructure</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Manage rooms and clinical wards</p>
          </div>
          <button onClick={() => { setForm(emptyForm); setModal('add') }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
            <FiPlus /> Add Room
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: c.text }}>Loading facility data...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 20 }}>
            {rooms.map(r => (
              <div key={r._id} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: c.bgCard2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiLayers size={20} color={c.primary} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: c.text }}>{r.name}</div>
                    <div style={{ color: c.textMuted, fontSize: 12, marginTop: 3 }}>{r.roomId} · {r.type}</div>
                  </div>
                </div>

                <div style={{ background: c.bgCard2, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ color: c.textFaint, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Threshold Profile</div>
                  <div style={{ color: c.textSec, fontSize: 14, fontWeight: 600 }}>{r.thresholdProfile?.name || 'Default'}</div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleEditClick(r)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'none', color: c.textSec, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><FiEdit2 size={14} /> Edit</button>
                  <button onClick={() => handleDelete(r._id)} style={{ padding: '8px', borderRadius: 8, border: `1px solid ${c.danger}40`, background: c.dangerBg, color: c.danger, cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: c.bgCard, padding: '32px', borderRadius: 24, width: form.useCustomThresholds ? '820px' : '440px', border: `1px solid ${c.border}`, transition: 'width 0.3s ease', boxSizing: 'border-box' }}>
              <h2 style={{ marginBottom: 24, color: c.text }}>{modal === 'add' ? 'Add Room' : 'Edit Room'}</h2>
              
              <div style={{ display: 'flex', gap: '32px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: c.textSec, fontSize: 13, fontWeight: 600 }}>Room ID</label>
                    <input value={form.roomId} onChange={e => setForm({...form, roomId: e.target.value})} style={inputStyle} placeholder="e.g. ICU-A" disabled={modal === 'edit'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: c.textSec, fontSize: 13, fontWeight: 600 }}>Display Name</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} placeholder="e.g. ICU Ward A" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: c.textSec, fontSize: 13, fontWeight: 600 }}>Room Type</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inputStyle}>
                      <option value="Standard">Standard Patient Room</option>
                      <option value="Critical">Critical Care / ICU</option>
                      <option value="Surgery">Operating Theater</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Pharmacy">Pharmacy Storage</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.textSec, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                      <input 
                        type="checkbox" 
                        checked={form.useCustomThresholds} 
                        onChange={e => setForm({...form, useCustomThresholds: e.target.checked})} 
                        style={{ width: 18, height: 18, accentColor: c.primary }}
                      />
                      Custom Threshold Limits
                    </label>
                  </div>
                  {!form.useCustomThresholds && (
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, color: c.textSec, fontSize: 13, fontWeight: 600 }}>Threshold Profile</label>
                      <select value={form.thresholdProfile} onChange={e => setForm({...form, thresholdProfile: e.target.value})} style={inputStyle}>
                        {profiles.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {form.useCustomThresholds && (
                  <div style={{ flex: 1.2, borderLeft: `1px solid ${c.border}`, paddingLeft: '32px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 16 }}>Custom Threshold Values</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: '320px', overflowY: 'auto', paddingRight: '8px' }}>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>PM10 Warning</label>
                        <input type="number" value={form.customThresholds.pm10Warning} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, pm10Warning: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>PM10 Critical</label>
                        <input type="number" value={form.customThresholds.pm10Critical} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, pm10Critical: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>PM2.5 Warning</label>
                        <input type="number" value={form.customThresholds.pm25Warning} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, pm25Warning: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>PM2.5 Critical</label>
                        <input type="number" value={form.customThresholds.pm25Critical} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, pm25Critical: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>TVOC Warning (ppb)</label>
                        <input type="number" value={form.customThresholds.tvocWarning} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, tvocWarning: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>TVOC Critical (ppb)</label>
                        <input type="number" value={form.customThresholds.tvocCritical} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, tvocCritical: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Temp Warning Low (°C)</label>
                        <input type="number" value={form.customThresholds.tempWarningLow} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, tempWarningLow: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Temp Warning High (°C)</label>
                        <input type="number" value={form.customThresholds.tempWarningHigh} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, tempWarningHigh: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Temp Critical High (°C)</label>
                        <input type="number" value={form.customThresholds.tempCriticalHigh} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, tempCriticalHigh: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Hum Warning Low (%)</label>
                        <input type="number" value={form.customThresholds.humidityWarningLow} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, humidityWarningLow: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', color: c.textSec, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Hum Warning High (%)</label>
                        <input type="number" value={form.customThresholds.humidityWarningHigh} onChange={e => setForm({...form, customThresholds: {...form.customThresholds, humidityWarningHigh: Number(e.target.value)}})} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(null)} style={{ padding: '12px 24px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'none', color: c.textSec, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button onClick={handleSave} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: c.gradient, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
