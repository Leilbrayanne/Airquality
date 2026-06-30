import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../shared/components/Navbar'
import Footer from '../../shared/components/Footer'
import { useColors } from '../../shared/hooks/useColors'
import { useTranslation } from 'react-i18next'
import {
  FiWind, FiAlertTriangle, FiBarChart2, FiShield,
  FiCpu, FiWifi, FiBell, FiUsers, FiArrowRight, FiCheckCircle,
} from 'react-icons/fi'

export default function LandingPage() {
  const c = useColors()
  const { t } = useTranslation()
  
  // Static demo data - no authenticated API calls
  const [demoData] = useState({
    pm10: 18.3, 
    tvoc: 210, 
    temperature: 23.4, 
    humidity: 58, 
    aqi_status: 'GOOD',
    roomId: 'DEMO-001'
  })

  // Remove WebSocket connection for public landing page
  // Only authenticated users should see live data

  const features = [
    { icon: FiCpu,       title: t('landing.feature1Title'), desc: t('landing.feature1Description') },
    { icon: FiWifi,      title: t('landing.feature2Title'), desc: t('landing.feature2Description') },
    { icon: FiBarChart2, title: t('landing.feature3Title'), desc: t('landing.feature3Description') },
    { icon: FiBell,      title: t('landing.feature4Title'), desc: t('landing.feature4Description') },
    { icon: FiShield,    title: t('landing.feature5Title'), desc: t('landing.feature5Description') },
    { icon: FiUsers,     title: t('landing.feature6Title'), desc: t('landing.feature6Description') },
  ]

  const stats = [
    { value: '< 4s',  label: t('landing.dataLatency') },
    { value: '24/7',  label: t('landing.monitoring') },
    { value: '3+',    label: t('landing.sensorTypes') },
    { value: '100%',  label: t('landing.webBased') },
  ]

  const roles = [
    { title: t('landing.adminTitle'),      color: '#0ea5e9', perks: [t('landing.adminPerk1'), t('landing.adminPerk2'), t('landing.adminPerk3'), t('landing.adminPerk4')],           path: '/dashboard/admin' },
    { title: t('landing.technicianTitle'), color: '#00d4aa', perks: [t('landing.technicianPerk1'), t('landing.technicianPerk2'), t('landing.technicianPerk3'), t('landing.technicianPerk4')], path: '/dashboard/technician' },
    { title: t('landing.staffTitle'),      color: '#ffa502', perks: [t('landing.staffPerk1'), t('landing.staffPerk2'), t('landing.staffPerk3'), t('landing.staffPerk4')],              path: '/dashboard/staff' },
  ]

  const getStatusColor = (status) => {
    if (!status) return c.success
    const s = String(status).toUpperCase()
    return c.aqi[s] || c.success
  }

  return (
    <div style={{ background: c.bg, minHeight: '100vh', transition: 'background 0.3s' }}>
      <Navbar />

        {/* Hero */}
        <section style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '120px 24px 80px', 
          position: 'relative', 
          gap: 60, 
          flexWrap: 'wrap',
          backgroundImage: `url('/hospital-air-bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}>
          {/* Gradient overlays for readability and aesthetic */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: c.bg, opacity: 0.85 }} />
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,170,0.15) 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 560, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', color: c.primary, padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            <FiWind size={14} /> {t('app.heroTitle')}
          </div>
          <h1 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20, color: c.text }}>
            {t('app.heroLine1')}<br />
            <span className="gradient-text">
              {t('app.heroLine2')}
            </span>
          </h1>
          <p style={{ color: c.textSec, fontSize: 17, lineHeight: 1.7, marginBottom: 36 }}>
            {t('app.heroDescription')}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/login" className="btn-primary">{t('app.getStarted')} <FiArrowRight size={16} /></Link>
            <a href="#features" className="btn-outline">{t('app.learnMore')}</a>
          </div>
        </div>

        {/* Floating sensor card - DEMO DATA ONLY */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 24, padding: 28, width: 320, position: 'relative', zIndex: 1, boxShadow: '0 30px 60px rgba(0,0,0,0.25)', transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <span style={{ color: c.text, fontWeight: 800, fontSize: 15 }}>{t('landing.demoWard')}</span>
              <div style={{ color: c.textFaint, fontSize: 11, marginTop: 2 }}>{demoData.roomId || 'DEMO-001'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(100,100,100,0.1)', border: '1px solid rgba(100,100,100,0.2)', color: c.textMuted, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
               <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.textMuted, display: 'inline-block' }} /> {t('landing.demo')}
            </div>
          </div>
          {[
            { label: t('app.pm10'),     value: `${demoData.pm10} µg/m³`, status: demoData.aqi_status, color: getStatusColor(demoData.aqi_status) },
            { label: t('app.voc'),      value: `${demoData.tvoc} ppb`,   status: demoData.aqi_status, color: getStatusColor(demoData.aqi_status) },
            { label: t('app.temperature'), value: `${demoData.temperature} °C`, status: 'OK', color: c.success },
            { label: t('app.humidity'), value: `${demoData.humidity}%`,  status: 'OK', color: c.success },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${c.border}` }}>
              <div>
                <div style={{ color: c.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                <div style={{ color: c.text, fontWeight: 800, fontSize: 16 }}>{r.value}</div>
              </div>
              <span style={{ background: `${r.color}15`, color: r.color, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span>
            </div>
          ))}
          <div style={{ color: c.textFaint, fontSize: 11, marginTop: 16, textAlign: 'center', fontStyle: 'italic' }}>
            {t('landing.demoData')}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', background: c.bgCard, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, transition: 'background 0.3s' }}>
        {stats.map((st, i) => (
          <div key={st.label} style={{ flex: '1 1 150px', textAlign: 'center', padding: '32px 24px', borderRight: i < stats.length - 1 ? `1px solid ${c.border}` : 'none' }}>
            <div className="gradient-text" style={{ fontSize: 36, fontWeight: 800 }}>{st.value}</div>
            <div style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>{st.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '100px 24px', background: c.bg, transition: 'background 0.3s' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: c.primary, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{t('landing.featuresSectionTitle')}</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, marginBottom: 16, color: c.text }}>{t('landing.featuresMainTitle')}</h2>
          <p style={{ color: c.textSec, fontSize: 16, maxWidth: 560, marginBottom: 60 }}>{t('landing.featuresDescription')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
            {features.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, transition: 'background 0.3s' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,212,170,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={22} color={c.primary} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: c.text }}>{f.title}</h3>
                  <p style={{ color: c.textMuted, fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="about" style={{ padding: '100px 24px', background: c.bgCard2, transition: 'background 0.3s' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: c.primary, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{t('landing.accessLevelsTitle')}</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, marginBottom: 48, color: c.text }}>{t('landing.rolesTitle')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
            {roles.map(r => (
              <div key={r.title} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderTop: `3px solid ${r.color}`, borderRadius: 16, padding: 28, transition: 'background 0.3s' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: r.color }}>{r.title}</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {r.perks.map(p => (
                    <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, color: c.textSec, fontSize: 14 }}>
                      <FiCheckCircle size={14} color={r.color} /> {p}
                    </li>
                  ))}
                </ul>
                <Link to={r.path} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: r.color, color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
                  {t('landing.viewDashboard')} <FiArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" style={{ padding: '100px 24px', background: c.bg, transition: 'background 0.3s' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <FiAlertTriangle size={40} color={c.primary} />
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, color: c.text }}>{t('landing.ctaTitle')}</h2>
          <p style={{ color: c.textSec, fontSize: 16, lineHeight: 1.7 }}>{t('landing.ctaDescription')}</p>
          <Link to="/login" className="btn-primary" style={{ fontSize: 16, padding: '14px 36px' }}>
            {t('app.getStarted')} <FiArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
