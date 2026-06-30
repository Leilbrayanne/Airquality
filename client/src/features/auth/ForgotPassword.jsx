import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useColors } from '../../shared/hooks/useColors'
import { FiMail } from 'react-icons/fi'
import { fetchApi } from '../../shared/utils/api'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  const c = useColors()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!email) {
      setError(t('forgotPassword.requiredEmail'))
      return
    }
    setLoading(true)
    try {
      await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      setMessage(t('forgotPassword.emailSent'))
    } catch (err) {
      setError(err.message || t('forgotPassword.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, padding: 30, boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: c.text, marginBottom: 12 }}>{t('forgotPassword.title')}</h2>
        <p style={{ color: c.textSec, marginBottom: 20 }}>{t('forgotPassword.description')}</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <FiMail size={18} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('forgotPassword.emailPlaceholder')}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 12, border: `1px solid ${c.border}`, background: c.bgCard, color: c.text }}
            />
          </div>
          {error && (
            <div style={{ color: '#ff4757', fontSize: 14 }}>{error}</div>
          )}
          {message && (
            <div style={{ color: '#2ed573', fontSize: 14 }}>{message}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ background: c.gradient, color: '#fff', border: 'none', padding: '12px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? t('forgotPassword.sending') : t('forgotPassword.sendButton')}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ color: c.primary }}>{t('forgotPassword.backToLogin')}</Link>
        </div>
      </div>
    </div>
  )
}
