import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FiWind, FiHome, FiSettings, FiUsers,
  FiBarChart2, FiLogOut, FiMenu, FiX, FiCpu, FiSun, FiMoon,
  FiDownload, FiPrinter, FiUser, FiServer, FiFileText, FiLayers, FiMap, FiTool, FiMail
} from 'react-icons/fi'
import { useTheme } from '../contexts/ThemeContext'
import { useColors } from '../hooks/useColors'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

const menus = {
  admin: [
    { icon: FiHome,      label: 'sidebar.overview',   path: '/dashboard/admin' },
    { icon: FiSettings,  label: 'sidebar.thresholds', path: '/dashboard/admin/thresholds' },
    { icon: FiUsers,     label: 'sidebar.users',       path: '/dashboard/admin/users' },
    { icon: FiCpu,       label: 'sidebar.sensors',     path: '/dashboard/admin/sensors' },
    { icon: FiBarChart2, label: 'sidebar.history',     path: '/dashboard/admin/history' },
    { icon: FiDownload,  label: 'sidebar.bulkExport', path: '/dashboard/admin/bulk-export' },
    { icon: FiPrinter,   label: 'sidebar.printReport', path: '/dashboard/admin/print-report' },
    { icon: FiUser,      label: 'sidebar.profile',     path: '/dashboard/admin/profile' },
    { icon: FiServer,    label: 'sidebar.systemHealth', path: '/dashboard/admin/system-health' },
    { icon: FiFileText,  label: 'sidebar.auditLog',   path: '/dashboard/admin/audit-log' },
    { icon: FiMail,      label: 'sidebar.notifications', path: '/dashboard/admin/notifications' },
  ],
  technician: [
    { icon: FiHome,      label: 'sidebar.overview',   path: '/dashboard/technician' },
    { icon: FiSettings,  label: 'sidebar.thresholds', path: '/dashboard/technician/thresholds' },
    { icon: FiLayers,    label: 'sidebar.rooms',          path: '/dashboard/technician/rooms' },
    { icon: FiCpu,       label: 'sidebar.sensors',        path: '/dashboard/technician/sensors' },
    { icon: FiTool,      label: 'sidebar.maintenance',   path: '/dashboard/technician/maintenance' },
    { icon: FiServer,    label: 'sidebar.systemHealth',   path: '/dashboard/technician/system-health' },
    { icon: FiBarChart2, label: 'sidebar.history',       path: '/dashboard/technician/history' },
    { icon: FiMap,       label: 'sidebar.heatmap',       path: '/dashboard/technician/heatmap' },
    { icon: FiDownload,  label: 'sidebar.bulkExport',    path: '/dashboard/technician/bulk-export' },
    { icon: FiPrinter,   label: 'sidebar.printReport',   path: '/dashboard/technician/print-report' },
    { icon: FiUser,      label: 'sidebar.profile',        path: '/dashboard/technician/profile' },
    { icon: FiMail,      label: 'sidebar.notifications', path: '/dashboard/technician/notifications' },
  ],
  staff: [
    { icon: FiHome,      label: 'sidebar.dashboard',     path: '/dashboard/staff' },
    { icon: FiMap,       label: 'sidebar.heatmap',       path: '/dashboard/staff/heatmap' },
    { icon: FiPrinter,   label: 'sidebar.printReport',   path: '/dashboard/staff/report' },
    { icon: FiUser,      label: 'sidebar.profile',        path: '/dashboard/staff/profile' },
  ],
}

export default function Sidebar({ role: propRole, userName: propUserName }) {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const c = useColors()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      // Call backend to revoke the JWT in Redis
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {}); // Silently fail if backend unreachable
      }
    } finally {
      logout();
      navigate('/login');
    }
  }

  // Prioritize AuthContext role, fallback to prop, then admin
  const userRole = (user?.role || propRole || 'admin').toLowerCase()
  const userName = user?.username || propUserName || 'User'
  
  const items = menus[userRole] || menus.admin

  const s = {
    sidebar: { height: '100vh', background: c.bgSidebar, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, transition: 'width 0.3s ease, background 0.3s ease', zIndex: 100, overflow: 'hidden', width: collapsed ? 72 : 240 },
    top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px', borderBottom: `1px solid ${c.border}` },
    logo: { display: 'flex', alignItems: 'center', gap: 8 },
    logoText: { fontSize: 18, fontWeight: 800, color: c.text, whiteSpace: 'nowrap' },
    toggle: { background: 'none', border: 'none', color: c.textSec, cursor: 'pointer' },
    profile: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderBottom: `1px solid ${c.border}` },
    avatar: { width: 38, height: 38, borderRadius: '50%', background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 },
    userName: { color: c.text, fontWeight: 600, fontSize: 14 },
    userRole: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
    navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap', textDecoration: 'none' },
    navActive: { background: `rgba(0,212,170,0.1)` },
    bottom: { borderTop: `1px solid ${c.border}` },
    themeBtn: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', whiteSpace: 'nowrap' },
    logout: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: `1px solid ${c.border}`, whiteSpace: 'nowrap', color: c.danger, cursor: 'pointer', background: 'none', width: '100%', textAlign: 'left' },
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.top}>
        {!collapsed && (
          <div style={s.logo}>
            <FiWind size={22} color={c.primary} />
            <span style={s.logoText}>PureAir</span>
          </div>
        )}
        <button style={s.toggle} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FiMenu size={20} /> : <FiX size={20} />}
        </button>
      </div>

      {!collapsed && (
        <div style={s.profile}>
          <div style={s.avatar}>{userName[0].toUpperCase()}</div>
          <div>
            <div style={s.userName}>{userName}</div>
            <div style={s.userRole}>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</div>
          </div>
        </div>
      )}

      <nav style={s.nav}>
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <Link key={item.label} to={item.path}
              style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
              <Icon size={18} color={active ? c.primary : c.textMuted} />
              {!collapsed && <span style={{ color: active ? c.primary : c.textSec, fontSize: 14 }}>{t(item.label)}</span>}
            </Link>
          )
        })}
      </nav>

      <div style={s.bottom}>
        {/* Theme Toggle */}
        <button onClick={toggle} style={s.themeBtn}>
          {theme === 'dark'
            ? <FiSun size={18} color={c.warning} />
            : <FiMoon size={18} color={c.accent} />
          }
          {!collapsed && (
            <span style={{ color: c.textSec, fontSize: 14 }}>
              {theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
            </span>
          )}
        </button>

        <button onClick={handleLogout} style={s.logout}>
          <FiLogOut size={18} />
          {!collapsed && <span style={{ fontSize: 14 }}>{t('sidebar.logout')}</span>}
        </button>
      </div>
    </aside>
  )
}
