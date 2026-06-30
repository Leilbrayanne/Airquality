import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiSave, FiCheckCircle, FiShield, FiBell } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useTheme } from '../../shared/contexts/ThemeContext'

import { useAuth } from '../../shared/contexts/AuthContext'
import { useApi } from '../../shared/utils/api'

// Parse a display name from username (e.g. "lei.admin" → "Lei Admin")
const generateFullName = (uname) => {
  if (!uname) return '';
  let namePart = uname.includes('@') ? uname.split('@')[0] : uname;
  return namePart.split(/[.\-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// If the stored username IS an email address, use it as the email and
// show only the local-part (before @) in the Username field.
const resolveFields = (u) => {
  if (!u) return { username: '', email: '', fullName: '', role: '' };
  const isEmailUsername = u.username && u.username.includes('@');
  return {
    username: isEmailUsername ? u.username.split('@')[0] : (u.username || ''),
    email:    u.email || (isEmailUsername ? u.username : ''),
    fullName: generateFullName(u.username),
    role:     u.role || ''
  };
};

const Section = ({ title, icon: Icon, color, children, onSave, saveKey, saved, c }) => (
  <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden', transition: 'background 0.3s' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon && <Icon size={16} color={color} />}
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text }}>{title}</h3>
      </div>
      {saved === saveKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.success, fontSize: 13, fontWeight: 600 }}>
          <FiCheckCircle size={14} /> Saved
        </div>
      )}
    </div>
    <div style={{ padding: '24px' }}>{children}</div>
    {onSave && (
      <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <FiSave size={14} /> Save Changes
        </button>
      </div>
    )}
  </div>
)

export default function ProfileSettings({ sidebarRole = 'admin' }) {
  const c = useColors()
  const { theme, toggle } = useTheme()
  const { user, login } = useAuth()
  const { put } = useApi()

  const [profile, setProfile] = useState(() => resolveFields(user))

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(resolveFields(user));
    }
  }, [user]);

  const [pw, setPw]           = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw]   = useState({ current: false, newPw: false, confirm: false })
  const [notifs, setNotifs]   = useState({ email: true, critical: true, warning: true, reports: false })
  const [saved, setSaved]     = useState('')
  const [pwError, setPwError] = useState('')

  const saveProfile = async () => {
    try {
      const res = await put('/auth/me', { username: profile.username, email: profile.email });
      login(res.token, res.user); // refresh auth context
      setSaved('profile'); 
      setTimeout(() => setSaved(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    }
  }

  const savePassword = async () => {
    setPwError('')
    if (!pw.current) { setPwError('Enter your current password.'); return }
    if (pw.newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pw.newPw !== pw.confirm) { setPwError('Passwords do not match.'); return }
    
    try {
      await put('/auth/me/password', { currentPassword: pw.current, newPassword: pw.newPw });
      setPw({ current: '', newPw: '', confirm: '' })
      setSaved('password')
      setTimeout(() => setSaved(''), 3000)
    } catch (err) {
      setPwError(err.message || 'Failed to update password');
    }
  }

  const inputStyle = (focused) => ({
    width: '100%', background: c.bgInput, border: `1.5px solid ${focused ? c.primary : c.border}`,
    borderRadius: 10, padding: '12px 14px', color: c.text, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.3s',
  })

  const [focused, setFocused] = useState(null)



  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role={sidebarRole} userName={profile.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto', maxWidth: 800 }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Profile & Settings</h1>
          <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Manage your account and preferences</p>
        </div>

        {/* Avatar */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, transition: 'background 0.3s' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {profile.username ? profile.username[0].toUpperCase() : '?'}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{profile.fullName}</div>
            <div style={{ color: c.textMuted, fontSize: 14, marginTop: 2 }}>{profile.email}</div>
            <div style={{ display: 'inline-block', background: `${c.accent}18`, color: c.accent, padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginTop: 6 }}>{profile.role}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Profile info */}
          <Section title="Profile Information" icon={FiUser} color={c.primary} onSave={saveProfile} saveKey="profile" saved={saved} c={c}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {[
                { label: 'Full Name',  key: 'fullName', icon: FiUser },
                { label: 'Username',   key: 'username', icon: FiUser },
                { label: 'Email',      key: 'email',    icon: FiMail },
              ].map(f => {
                const Icon = f.icon
                return (
                  <div key={f.key} style={{ gridColumn: f.key === 'email' ? '1 / -1' : 'auto' }}>
                    <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{f.label}</label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={15} color={focused === f.key ? c.primary : c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input value={profile[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                        onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle(focused === f.key), paddingLeft: 38 }} />
                    </div>
                  </div>
                )
              })}
              <div>
                <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Role</label>
                <div style={{ background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px', color: c.textMuted, fontSize: 14 }}>{profile.role} (read-only)</div>
              </div>
            </div>
          </Section>

          {/* Password */}
          <Section title="Change Password" icon={FiLock} color={c.accent} onSave={savePassword} saveKey="password" saved={saved} c={c}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Current Password', key: 'current' },
                { label: 'New Password',     key: 'newPw' },
                { label: 'Confirm Password', key: 'confirm' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <FiLock size={15} color={focused === f.key ? c.primary : c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input type={showPw[f.key] ? 'text' : 'password'} value={pw[f.key]}
                      onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                      onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                      placeholder="••••••••"
                      style={{ ...inputStyle(focused === f.key), paddingLeft: 38, paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPw(p => ({ ...p, [f.key]: !p[f.key] }))}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPw[f.key] ? <FiEyeOff size={15} color={c.textMuted} /> : <FiEye size={15} color={c.textMuted} />}
                    </button>
                  </div>
                </div>
              ))}
              {pwError && (
                <div style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.3)', color: c.danger, padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>⚠ {pwError}</div>
              )}
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notification Preferences" icon={FiBell} color={c.warning} onSave={() => { setSaved('notifs'); setTimeout(() => setSaved(''), 3000) }} saveKey="notifs" saved={saved} c={c}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'email',    label: 'Email Notifications',         desc: 'Receive alerts via email' },
                { key: 'critical', label: 'Critical Alert Notifications', desc: 'Immediate alerts for critical thresholds' },
                { key: 'warning',  label: 'Warning Notifications',        desc: 'Alerts when values enter warning range' },
                { key: 'reports',  label: 'Daily Report Emails',          desc: 'Receive daily summary at 08:00' },
              ].map(n => (
                <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: c.bgCard2, borderRadius: 10, transition: 'background 0.3s' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: c.text }}>{n.label}</div>
                    <div style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{n.desc}</div>
                  </div>
                  <button onClick={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))}
                    style={{ width: 44, height: 24, borderRadius: 12, background: notifs[n.key] ? c.primary : c.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: notifs[n.key] ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" icon={FiShield} color={c.success} saved={saved} c={c}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: c.bgCard2, borderRadius: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: c.text }}>Dark Mode</div>
                <div style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>Switch between light and dark theme</div>
              </div>
              <button onClick={toggle}
                style={{ width: 44, height: 24, borderRadius: 12, background: theme === 'dark' ? c.primary : c.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: theme === 'dark' ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </Section>
        </div>
      </main>
    </div>
  )
}
