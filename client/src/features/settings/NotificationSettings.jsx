import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiMail, FiClock, FiSave, FiAlertCircle, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

export default function NotificationSettings() {
  const [config, setConfig] = useState({ emailRecipients: [], alertCooldown: 300000 })
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const c = useColors()
  const { get, put } = useApi()
  const { user } = useAuth()

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await get('/notifications/config')
        setConfig(data || { emailRecipients: [], alertCooldown: 300000 })
      } catch (err) {
        console.error('Failed to fetch notification config:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [get])

  const handleSave = async () => {
    try {
      setSaving(true)
      // Send the data exactly as the backend expects (Joi schema)
      await put('/notifications/config', {
        emailRecipients: config.emailRecipients.map(r => ({ email: r.email, isActive: r.isActive })),
        alertCooldown: config.alertCooldown
      })
      setMessage({ type: 'success', text: 'Settings saved successfully' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const addEmail = () => {
    if (newEmail && !config.emailRecipients.find(r => r.email === newEmail)) {
      setConfig({ ...config, emailRecipients: [...config.emailRecipients, { email: newEmail, isActive: true }] })
      setNewEmail('')
    }
  }

  const removeEmail = (email) => {
    setConfig({ ...config, emailRecipients: config.emailRecipients.filter(r => r.email !== email) })
  }

  const toggleRecipient = (email) => {
    setConfig({
      ...config,
      emailRecipients: config.emailRecipients.map(r => r.email === email ? { ...r, isActive: !r.isActive } : r)
    })
  }

  const inputStyle = { background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 14px', color: c.text, fontSize: 14, outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
      <Sidebar role="admin" userName={user?.username || 'Administrator'} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Notification Settings</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Configure alert recipients and notification frequency</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Saving...' : <><FiSave /> Save Changes</>}
          </button>
        </div>

        {message && (
          <div style={{ background: message.type === 'success' ? `${c.success}18` : `${c.danger}18`, color: message.type === 'success' ? c.success : c.danger, padding: '12px 16px', borderRadius: 10, marginBottom: 24, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiAlertCircle /> {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Recipients */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <FiMail size={20} color={c.primary} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Email Recipients</h3>
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Add email address..." style={inputStyle} onKeyPress={e => e.key === 'Enter' && addEmail()} />
              <button onClick={addEmail} style={{ background: c.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', cursor: 'pointer' }}><FiPlus /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {config.emailRecipients.map(recipient => (
                <div key={recipient.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: c.bgCard2, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" checked={recipient.isActive} onChange={() => toggleRecipient(recipient.email)} />
                    <span style={{ color: recipient.isActive ? c.text : c.textFaint, fontSize: 14 }}>{recipient.email}</span>
                  </div>
                  <button onClick={() => removeEmail(recipient.email)} style={{ color: c.danger, background: 'none', border: 'none', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                </div>
              ))}
              {config.emailRecipients.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: c.textFaint, fontSize: 14 }}>No recipients added</div>}
            </div>
          </div>

          {/* Cooldown */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <FiClock size={20} color={c.accent} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Alert Cooldown</h3>
            </div>
            <p style={{ color: c.textSec, fontSize: 13, marginBottom: 20 }}>Minimum time between two alerts for the same room (in ms)</p>
            
            <input type="number" value={config.alertCooldown} onChange={e => setConfig({ ...config, alertCooldown: parseInt(e.target.value) })} style={inputStyle} />
            <div style={{ marginTop: 12, color: c.textFaint, fontSize: 12 }}>
              Current setting: {(config.alertCooldown / 60000).toFixed(1)} minutes
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
