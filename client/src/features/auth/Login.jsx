import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiWind, FiSun, FiMoon } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useTheme } from '../../shared/contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/contexts/AuthContext'
import { fetchApi } from '../../shared/utils/api'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [focused, setFocused]   = useState(null)
  const [isWide, setIsWide]     = useState(window.innerWidth > 968)
  const navigate  = useNavigate()

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth > 968)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const { login } = useAuth()
  const c         = useColors()
  const { theme, toggle } = useTheme()
  const { t } = useTranslation()

  const handleLogin = async (e, demoEmail, demoPw) => {
    if (e) e.preventDefault()
    setError('')
    
    const loginEmail = demoEmail || email
    const loginPw = demoPw || password

    if (!loginEmail || !loginPw) { 
      setError(t('login.requiredFields')); 
      return 
    }
    setLoading(true)
    try {
      // Call backend login API
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPw })
      })
      // data should contain { token, user: { id, username, role } }
      const { token, user } = data
      // Set the token and user in the auth context
      login(token, user) // This is from useAuth
      // Navigate based on role (convert to lowercase for route)
      navigate(`/dashboard/${user.role.toLowerCase()}`)
    } catch (err) {
      // If backend returns HTML (e.g., proxy 502 page), surface a useful prefix.
      setError(err.message || t('login.invalidCredentials'))
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: c.bg, transition: 'background 0.3s', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Theme toggle */}
      <button onClick={toggle} style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 10, padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: c.textSec, fontSize: 13, fontWeight: 600 }}>
        {theme === 'dark' ? <FiSun size={15} color="#ffa502" /> : <FiMoon size={15} color="#0ea5e9" />}
        {theme === 'dark' ? t('login.light') : t('login.dark')}
      </button>

      {/* ── LEFT PANEL (Branding & Image) ── */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        display: isWide ? 'flex' : 'none', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '60px',
        overflow: 'hidden'
      }}>
        {/* Background Image with Overlay */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: 'url("/login-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }} />
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 100%)',
          zIndex: 1 
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 500 }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 40, textDecoration: 'none' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,212,170,0.3)' }}>
              <FiWind size={24} color="#fff" />
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: c.text, letterSpacing: -0.5 }}>PureAir<span style={{ color: c.primary }}>IQ</span></span>
          </Link>

          <div style={{ marginBottom: 20 }}>
            <span style={{ background: 'rgba(0,212,170,0.15)', border: `1px solid ${c.primary}30`, color: c.primary, padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              {t('login.hospitalPlatform')}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, lineHeight: 1.1, color: c.text, marginBottom: 24 }}>
            {t('login.monitorAirQuality')}<br />
            <span style={{ color: c.primary }}>{t('login.inRealTime')}</span>
          </h1>

          <p style={{ color: c.textSec, fontSize: 18, lineHeight: 1.6, marginBottom: 40 }}>
            {t('login.continuousSurveillance')}
          </p>

          {/* Live sensor preview card (Glassmorphic) */}
          <div style={{ 
            background: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(12px)',
            border: `1px solid ${c.border}`, 
            borderRadius: 24, 
            padding: 28, 
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            transition: 'background 0.3s' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: c.text }}>ICU Ward A — Room 101</div>
                <div style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>NODE-A-101 · ESP32 Sensor</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(46,213,115,0.15)', border: '1px solid rgba(46,213,115,0.3)', color: '#2ed573', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ed573', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                {t('login.live')}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'PM10',     value: '18.3', unit: 'µg/m³' },
                { label: 'TVOC',     value: '210',  unit: 'ppb' },
                { label: 'Temp',     value: '23.4', unit: '°C' },
                { label: 'Humidity', value: '58',   unit: '%' },
              ].map(m => (
                <div key={m.label} style={{ background: theme === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.5)', borderRadius: 16, padding: '16px' }}>
                  <div style={{ color: c.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{m.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: c.text }}>{m.value}</span>
                    <span style={{ fontSize: 12, color: c.textMuted }}>{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div style={{ 
        width: isWide ? '45%' : '100%', 
        maxWidth: isWide ? 'none' : 550,
        margin: isWide ? 0 : '0 auto',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px', 
        position: 'relative', 
        zIndex: 1,
        background: c.bg
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Form Header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: c.text, marginBottom: 8 }}>{t('login.signIn')}</h2>
            <p style={{ color: c.textMuted, fontSize: 16 }}>{t('login.accessDashboard')}</p>
          </div>



          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', color: c.textSec, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('login.emailAddress')}</label>
              <div style={{ position: 'relative' }}>
                <FiMail size={18} color={focused === 'email' ? c.primary : c.textMuted}
                  style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder={t('login.emailPlaceholder')}
                  style={{ width: '100%', background: c.bgCard, border: `2px solid ${focused === 'email' ? c.primary : c.border}`, borderRadius: 14, padding: '14px 16px 14px 48px', color: c.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ color: c.textSec, fontSize: 14, fontWeight: 600 }}>{t('login.passwordLabel')}</label>
                <Link to="/forgot-password" style={{ color: c.primary, fontSize: 13, fontWeight: 600 }}>{t('login.forgotPassword')}</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <FiLock size={18} color={focused === 'password' ? c.primary : c.textMuted}
                  style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  style={{ width: '100%', background: c.bgCard, border: `2px solid ${focused === 'password' ? c.primary : c.border}`, borderRadius: 14, padding: '14px 48px', color: c.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw ? <FiEyeOff size={18} color={c.textMuted} /> : <FiEye size={18} color={c.textMuted} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)', color: '#ff4757', padding: '14px', borderRadius: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: c.gradient, color: '#fff', border: 'none', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 10px 25px rgba(0,212,170,0.25)', transition: 'all 0.2s', marginTop: 10 }}>
              {loading
                ? <><span style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> {t('login.signingIn')}</>
                : <>{t('login.signIn')} <FiArrowRight size={18} /></>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: c.textFaint }}>
            <Link to="/" style={{ color: c.primary, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ← {t('login.backToHome')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
