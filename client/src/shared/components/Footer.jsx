import { Link } from 'react-router-dom'
import { FiWind, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'
import { useColors } from '../hooks/useColors'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const c = useColors()
  const { t } = useTranslation()

  return (
    <footer style={{ background: c.bgCard2, borderTop: `1px solid ${c.border}`, marginTop: 0, transition: 'background 0.3s' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40 }}>
        <div style={{ maxWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <FiWind size={24} color={c.primary} />
            <span style={{ fontSize: 20, fontWeight: 800, color: c.text }}>PureAir<span style={{ color: c.primary }}>IQ</span></span>
          </div>
          <p style={{ color: c.textMuted, fontSize: 14, lineHeight: 1.7 }}>{t('footer.description')}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ color: c.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t('footer.quickLinks')}</h4>
          {[
            { label: t('footer.home'), href: '/' },
            { label: t('footer.features'), href: '#features' },
            { label: t('footer.about'), href: '#about' },
            { label: t('footer.contactUs'), href: '#contact' }
          ].map(l => (
            <Link key={l.label} to={l.href} style={{ color: c.textMuted, fontSize: 14, textDecoration: 'none' }}>{l.label}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ color: c.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t('footer.dashboards')}</h4>
          {[
            { label: t('footer.adminDashboard'),   to: '/dashboard/admin' },
            { label: t('footer.technician'),       to: '/dashboard/technician' },
            { label: t('footer.staff'),            to: '/dashboard/staff' },
          ].map(l => (
            <Link key={l.label} to={l.to} style={{ color: c.textMuted, fontSize: 14, textDecoration: 'none' }}>{l.label}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ color: c.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t('footer.contact')}</h4>
          {[
            { icon: FiMapPin, text: t('footer.location') },
            { icon: FiMail,   text: t('footer.email') },
            { icon: FiPhone,  text: t('footer.phone') },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.textMuted, fontSize: 14 }}>
                <Icon size={14} color={c.primary} /> {item.text}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: c.textFaint, fontSize: 13 }}>{t('footer.copyright')}</span>
        <span style={{ color: c.textFaint, fontSize: 13 }}>{t('footer.builtWith')}</span>
      </div>
    </footer>
  )
}
