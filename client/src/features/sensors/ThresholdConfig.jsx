                                                                                                                                         import { useEffect, useState } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiMapPin, FiPlus, FiRefreshCw, FiSave, FiSettings } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

const createBlankThresholds = () => ({
  pm10: { warning: '', critical: '' },
  pm25: { warning: '', critical: '' },
  tvoc: { warning: '', critical: '' },
  temperature: { warningLow: '', warningHigh: '', criticalHigh: '' },
  humidity: { warningLow: '', warningHigh: '' }
})

const normalizeThresholds = (profile) => ({
  pm10: {
    warning: profile?.pm10?.warning ?? '',
    critical: profile?.pm10?.critical ?? ''
  },
  pm25: {
    warning: profile?.pm25?.warning ?? '',
    critical: profile?.pm25?.critical ?? ''
  },
  tvoc: {
    warning: profile?.tvoc?.warning ?? '',
    critical: profile?.tvoc?.critical ?? ''
  },
  temperature: {
    warningLow: profile?.temperature?.warningLow ?? '',
    warningHigh: profile?.temperature?.warningHigh ?? '',
    criticalHigh: profile?.temperature?.criticalHigh ?? ''
  },
  humidity: {
    warningLow: profile?.humidity?.warningLow ?? '',
    warningHigh: profile?.humidity?.warningHigh ?? ''
  }
})

export default function ThresholdConfig() {
  const [rooms, setRooms] = useState([])
  const [profiles, setProfiles] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [draftThresholds, setDraftThresholds] = useState(createBlankThresholds())
  const [useCustomThresholds, setUseCustomThresholds] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newProfileModal, setNewProfileModal] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [creating, setCreating] = useState(false)
  const c = useColors()
  const { get, post, put } = useApi()
  const { user } = useAuth()

  const fetchData = async () => {
    try {
      setLoading(true)
      const [roomsData, profilesData] = await Promise.all([
        get('/rooms'),
        get('/thresholds')
      ])
      setRooms(roomsData)
      setProfiles(profilesData)

      if (roomsData.length === 0) {
        setSelectedRoom(null)
        setSelectedRoomId('')
        return
      }

      const nextRoom = roomsData.find(r => r._id === selectedRoomId) || roomsData[0]
      setSelectedRoom(nextRoom)
      setSelectedRoomId(nextRoom._id)
    } catch (err) {
      console.error('Failed to fetch room and threshold data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [get])

  useEffect(() => {
    if (!selectedRoom) return

    const profile = typeof selectedRoom.thresholdProfile === 'string' ? null : selectedRoom.thresholdProfile
    const isCustom = profile?.name?.startsWith('Custom Room')

    if (isCustom) {
      setUseCustomThresholds(true)
      setDraftThresholds(normalizeThresholds(profile))
      setSelectedProfileId('')
      return
    }

    setUseCustomThresholds(false)

    if (profile?._id) {
      setSelectedProfileId(profile._id)
      setDraftThresholds(normalizeThresholds(profile))
      return
    }

    if (profiles.length > 0) {
      const nextProfile = profiles[0]
      setSelectedProfileId(nextProfile._id)
      setDraftThresholds(normalizeThresholds(nextProfile))
      return
    }

    setSelectedProfileId('')
    setDraftThresholds(createBlankThresholds())
  }, [selectedRoom, profiles])

  const handleRoomChange = (roomId) => {
    const nextRoom = rooms.find(r => r._id === roomId)
    if (nextRoom) {
      setSelectedRoom(nextRoom)
      setSelectedRoomId(roomId)
      setSaved(false)
    }
  }

  const handleProfileChange = (profileId) => {
    const profile = profiles.find(p => p._id === profileId)
    setSelectedProfileId(profileId)
    setUseCustomThresholds(false)
    setDraftThresholds(normalizeThresholds(profile || {}))
    setSaved(false)
  }

  const handleToggleCustom = (enabled) => {
    setUseCustomThresholds(enabled)
    if (enabled) {
      setSelectedProfileId('')
    } else if (selectedRoom?.thresholdProfile?._id) {
      setSelectedProfileId(selectedRoom.thresholdProfile._id)
      setDraftThresholds(normalizeThresholds(selectedRoom.thresholdProfile))
    }
    setSaved(false)
  }

  const handleChange = (category, field, value) => {
    setDraftThresholds(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
    setSaved(false)
  }

  const hasMissingCustomValues = () =>
    Object.values(draftThresholds).some(group =>
      Object.values(group).some(value => value === '' || value === null || value === undefined)
    )

  const handleReset = () => {
    const roomProfile = typeof selectedRoom?.thresholdProfile === 'string' ? null : selectedRoom?.thresholdProfile
    const fallbackProfile = roomProfile || profiles.find(profile => profile._id === selectedProfileId)

    setDraftThresholds(normalizeThresholds(fallbackProfile))
    setUseCustomThresholds(roomProfile?.name?.startsWith('Custom Room') || false)
    if (fallbackProfile?._id && !roomProfile?.name?.startsWith('Custom Room')) {
      setSelectedProfileId(fallbackProfile._id)
    }
    setSaved(false)
  }

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return

    if (hasMissingCustomValues()) {
      alert('Choose a real profile or enter custom values before creating a new profile.')
      return
    }

    setCreating(true)
    try {
      const newProfile = {
        name: newProfileName.trim(),
        pm10: {
          warning: Number(draftThresholds.pm10.warning),
          critical: Number(draftThresholds.pm10.critical)
        },
        pm25: {
          warning: Number(draftThresholds.pm25.warning),
          critical: Number(draftThresholds.pm25.critical)
        },
        tvoc: {
          warning: Number(draftThresholds.tvoc.warning),
          critical: Number(draftThresholds.tvoc.critical)
        },
        temperature: {
          warningLow: Number(draftThresholds.temperature.warningLow),
          warningHigh: Number(draftThresholds.temperature.warningHigh),
          criticalHigh: Number(draftThresholds.temperature.criticalHigh)
        },
        humidity: {
          warningLow: Number(draftThresholds.humidity.warningLow),
          warningHigh: Number(draftThresholds.humidity.warningHigh)
        }
      }

      const created = await post('/thresholds', newProfile)
      await fetchData()
      setSelectedProfileId(created._id)
      setUseCustomThresholds(false)
      setDraftThresholds(normalizeThresholds(created))
      setNewProfileName('')
      setNewProfileModal(false)
    } catch (err) {
      alert('Failed to create profile: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleSave = async () => {
    if (!selectedRoom) return

    if (!useCustomThresholds && !selectedProfileId) {
      alert('Choose a threshold profile before saving.')
      return
    }

    if (useCustomThresholds && hasMissingCustomValues()) {
      alert('Enter all custom threshold values before saving.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        roomId: selectedRoom.roomId,
        name: selectedRoom.name,
        type: selectedRoom.type,
        thresholdProfile: useCustomThresholds ? undefined : selectedProfileId,
        customThresholds: useCustomThresholds ? {
          pm10Warning: Number(draftThresholds.pm10.warning),
          pm10Critical: Number(draftThresholds.pm10.critical),
          pm25Warning: Number(draftThresholds.pm25.warning),
          pm25Critical: Number(draftThresholds.pm25.critical),
          tvocWarning: Number(draftThresholds.tvoc.warning),
          tvocCritical: Number(draftThresholds.tvoc.critical),
          tempWarningLow: Number(draftThresholds.temperature.warningLow),
          tempWarningHigh: Number(draftThresholds.temperature.warningHigh),
          tempCriticalHigh: Number(draftThresholds.temperature.criticalHigh),
          humidityWarningLow: Number(draftThresholds.humidity.warningLow),
          humidityWarningHigh: Number(draftThresholds.humidity.warningHigh)
        } : undefined
      }

      await put(`/rooms/${selectedRoom._id}`, payload)
      setSaved(true)
      await fetchData()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Failed to save room thresholds: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && rooms.length === 0) {
    return (
      <div style={{ background: c.bg, color: c.text, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading room threshold configuration...
      </div>
    )
  }

  const groups = [
    {
      label: 'Particulate Matter (PM10)',
      color: c.primary,
      key: 'pm10',
      items: [
        { label: 'Warning Threshold', sub: 'Yellow alert', key: 'warning', icon: FiAlertTriangle },
        { label: 'Critical Threshold', sub: 'Red alert', key: 'critical', icon: FiAlertOctagon }
      ]
    },
    {
      label: 'Particulate Matter (PM2.5)',
      color: c.secondary || '#9333ea',
      key: 'pm25',
      items: [
        { label: 'Warning Threshold', sub: 'Yellow alert', key: 'warning', icon: FiAlertTriangle },
        { label: 'Critical Threshold', sub: 'Red alert', key: 'critical', icon: FiAlertOctagon }
      ]
    },
    {
      label: 'Volatile Organic Compounds (TVOC)',
      color: c.accent,
      key: 'tvoc',
      items: [
        { label: 'Warning Threshold', sub: 'Yellow alert', key: 'warning', icon: FiAlertTriangle },
        { label: 'Critical Threshold', sub: 'Red alert', key: 'critical', icon: FiAlertOctagon }
      ]
    },
    {
      label: 'Temperature Control',
      color: c.warning,
      key: 'temperature',
      items: [
        { label: 'Warning Low', sub: 'Cold stress', key: 'warningLow', icon: FiAlertTriangle },
        { label: 'Warning High', sub: 'Heat stress', key: 'warningHigh', icon: FiAlertTriangle },
        { label: 'Critical High', sub: 'Extreme heat', key: 'criticalHigh', icon: FiAlertOctagon }
      ]
    },
    {
      label: 'Relative Humidity',
      color: '#38bdf8',
      key: 'humidity',
      items: [
        { label: 'Warning Low', sub: 'Dry air', key: 'warningLow', icon: FiAlertTriangle },
        { label: 'Warning High', sub: 'Dampness', key: 'warningHigh', icon: FiAlertTriangle }
      ]
    }
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Configure Room Thresholds</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>
              Select a room, choose a threshold profile or custom limits, and apply them to that room.
            </p>
          </div>
          {saved && (
            <div style={{ background: c.successBg, color: c.success, padding: '10px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <FiCheckCircle /> Room thresholds saved successfully
            </div>
          )}
        </div>

        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 18, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Select Room</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '11px 14px' }}>
                <FiMapPin color={c.primary} />
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  style={{ backgroundColor: c.bgCard, border: 'none', color: c.text, fontSize: 14, width: '100%', outline: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', colorScheme: 'dark' }}
                >
                  {rooms.map(room => (
                    <option key={room._id} value={room._id}>{room.name} ({room.roomId})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Room Profile</label>
              <select
                value={useCustomThresholds ? '__custom__' : selectedProfileId}
                onChange={(e) => e.target.value === '__custom__' ? handleToggleCustom(true) : handleProfileChange(e.target.value)}
                style={{ width: '100%', backgroundColor: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '11px 14px', color: c.text, fontSize: 14, outline: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', colorScheme: 'dark' }}
              >
                {profiles.map(profile => (
                  <option key={profile._id} value={profile._id}>{profile.name}</option>
                ))}
                <option value="__custom__">Custom limits for this room</option>
              </select>
            </div>

            <div>
              <button
                onClick={() => setNewProfileModal(true)}
                style={{ width: '100%', background: 'transparent', border: `1px dashed ${c.border}`, color: c.textFaint, padding: '11px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700 }}
              >
                <FiPlus /> New Profile
              </button>
            </div>
          </div>

          {selectedRoom && (
            <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: c.bgCard2, borderRadius: 12, padding: '10px 14px', color: c.textSec, fontSize: 13 }}>
                <strong style={{ color: c.text }}>Room type:</strong> {selectedRoom.type}
              </div>
              <div style={{ background: c.bgCard2, borderRadius: 12, padding: '10px 14px', color: c.textSec, fontSize: 13 }}>
                <strong style={{ color: c.text }}>Current profile:</strong> {typeof selectedRoom.thresholdProfile === 'string' ? selectedRoom.thresholdProfile : selectedRoom.thresholdProfile?.name || 'Custom room values'}
              </div>
              {useCustomThresholds && (
                <div style={{ background: `${c.primary}15`, color: c.primary, borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiSettings size={14} /> Custom limits active for this room
                </div>
              )}
            </div>
          )}
        </div>

        {selectedRoom && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20, marginBottom: 24 }}>
            {groups.map(group => (
              <div key={group.key} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `4px solid ${group.color}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: group.color, marginBottom: 20 }}>{group.label}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {group.items.map(item => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ color: c.text, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                        <div style={{ color: c.textFaint, fontSize: 11 }}>{item.sub}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="number"
                          value={draftThresholds[group.key]?.[item.key] ?? ''}
                          onChange={(e) => handleChange(group.key, item.key, e.target.value)}
                          style={{ width: 90, padding: '8px 12px', background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, textAlign: 'right', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={handleReset}
            style={{ padding: '12px 24px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'none', color: c.textSec, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FiRefreshCw /> Reset to Room Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: saving ? c.border : c.gradient, color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FiSave /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </main>

      {newProfileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, padding: '36px 40px', width: 420, boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: c.text, marginBottom: 8 }}>New Threshold Profile</h2>
            <p style={{ color: c.textMuted, fontSize: 14, marginBottom: 28 }}>
              Create a reusable profile with World Health Organization defaults that you can assign to any room.
            </p>
            <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Profile Name</label>
            <input
              autoFocus
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
              placeholder="e.g. ICU Ward, Operating Theatre..."
              style={{ width: '100%', background: c.bgInput, border: `1.5px solid ${c.primary}`, borderRadius: 10, padding: '12px 14px', color: c.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 28 }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setNewProfileModal(false); setNewProfileName('') }}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'none', color: c.textSec, cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim() || creating}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: newProfileName.trim() ? c.gradient : c.border, color: '#fff', cursor: newProfileName.trim() ? 'pointer' : 'not-allowed', fontWeight: 700 }}
              >
                {creating ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
