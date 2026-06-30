import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMenu, FiX, FiWind, FiSun, FiMoon } from 'react-icons/fi'
import { useTheme } from '../../shared/contexts/ThemeContext'
import { useColors } from '../../shared/hooks/useColors'
import LanguageSwitcher from '../../features/auth/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const c = useColors()
  const { t } = useTranslation()

  const links = [
    { to: '/',          label: t('app.home') },
    { to: '#features',  label: t('app.features') },
    { to: '#about',     label: t('app.about') },
    { to: '#contact',   label: t('app.contact') },
  ]

  const s = {
    nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: theme === 'dark' ? 'rgba(10,14,26,0.9)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${c.border}`, transition: 'background 0.3s' },
    inner: { maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800, color: c.text },
    links: { display: 'flex', alignItems: 'center', gap: 28, listStyle: 'none' },
    linksOpen: { position: 'fixed', top: 70, left: 0, right: 0, flexDirection: 'column', background: c.bgCard, padding: '24px', gap: 20, borderBottom: `1px solid ${c.border}` },
    link: { color: c.textSec, fontSize: 15, fontWeight: 500, cursor: 'pointer' },
    loginBtn: { background: c.gradient, color: '#fff', padding: '9px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14 },
    themeBtn: { background: theme === 'dark' ? 'rgba(255,165,2,0.1)' : 'rgba(2,132,199,0.1)', border: `1px solid ${theme === 'dark' ? 'rgba(255,165,2,0.3)' : 'rgba(2,132,199,0.3)'}`, borderRadius: 8, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    burger: { background: 'none', border: 'none', color: c.text, cursor: 'pointer' },
  }

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <Link to="/" style={s.logo}>
          <FiWind size={26} color={c.primary} />
          <span>{t('app.title')}</span>
        </Link>

        <ul style={{ ...s.links, ...(open ? s.linksOpen : {}) }}>
          {links.map(l => (
            <li key={l.label}>
              <a href={l.to} style={s.link} onClick={() => setOpen(false)}>{l.label}</a>
            </li>
          ))}
          <li>
            <LanguageSwitcher />
          </li>
          <li>
            <button onClick={toggle} style={s.themeBtn}>
              {theme === 'dark'
                ? <FiSun size={16} color="#ffa502" />
                : <FiMoon size={16} color="#0284c7" />
              }
            </button>
          </li>
          <li>
            <Link to="/login" style={s.loginBtn} onClick={() => setOpen(false)}>{t('app.login')}</Link>
          </li>
        </ul>

        <button style={s.burger} onClick={() => setOpen(!open)}>
          {open ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>
    </nav>
  )
}
