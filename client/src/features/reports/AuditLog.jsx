import { useState, useMemo, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiSearch, FiDownload, FiSettings, FiTrash2, FiPlus, FiEdit2, FiLogIn, FiRefreshCw } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'
import { useAuth } from '../../shared/contexts/AuthContext'

const actionIcon  = { 
  UPDATE_THRESHOLD: FiSettings, 
  REGISTER_USER: FiPlus, 
  UPDATE_USER: FiEdit2, 
  DELETE_USER: FiTrash2,
  LOGIN_SUCCESS: FiLogIn, 
  LOGIN_FAILED: FiLogIn,
  LOGOUT: FiLogIn,
  REGISTER_NODE: FiPlus, 
  UPDATE_NODE: FiEdit2,
  DELETE_NODE: FiTrash2,
  CREATE_ROOM: FiPlus,
  UPDATE_ROOM: FiEdit2,
  DELETE_ROOM: FiTrash2,
  ACKNOWLEDGE_ALERT: FiSettings, 
  REPORT_EXPORTED: FiDownload, 
  ENTER_MAINTENANCE: FiSettings, 
  EXIT_MAINTENANCE: FiSettings, 
  CALIBRATE_NODE: FiRefreshCw,
  LOG_MAINTENANCE: FiSettings,
  UPDATE_MAINTENANCE: FiEdit2
}
const actionColor = { 
  UPDATE_THRESHOLD: '#0ea5e9', 
  REGISTER_USER: '#2ed573', 
  UPDATE_USER: '#ffa502', 
  DELETE_USER: '#ff4757',
  LOGIN_SUCCESS: '#2ed573', 
  LOGIN_FAILED: '#ff4757',
  LOGOUT: '#94a3b8',
  REGISTER_NODE: '#2ed573', 
  UPDATE_NODE: '#ffa502',
  DELETE_NODE: '#ff4757',
  CREATE_ROOM: '#2ed573',
  UPDATE_ROOM: '#ffa502',
  DELETE_ROOM: '#ff4757',
  ACKNOWLEDGE_ALERT: '#00d4aa', 
  REPORT_EXPORTED: '#0ea5e9', 
  ENTER_MAINTENANCE: '#0ea5e9', 
  EXIT_MAINTENANCE: '#2ed573', 
  CALIBRATE_NODE: '#00d4aa',
  LOG_MAINTENANCE: '#0ea5e9',
  UPDATE_MAINTENANCE: '#ffa502'
}
const roleColor   = { admin: '#0ea5e9', technician: '#00d4aa', staff: '#ffa502', system: '#94a3b8' }

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const c = useColors()
  const { get } = useApi()
  const { user: currentUser } = useAuth()

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const data = await get('/audit-logs')
      setLogs(data)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [get])

  const filtered = useMemo(() => logs.filter(l => {
    const userDisplay = l.user?.username || 'System'
    const matchSearch = userDisplay.includes(search) || l.action.includes(search.toUpperCase()) || JSON.stringify(l.details || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || l.user?.role?.toLowerCase() === filter.toLowerCase()
    return matchSearch && matchFilter
  }), [logs, search, filter])

  const exportCSV = () => {
    const cell = v => `"${String(v).replace(/"/g, '""')}"`
    const rows = [
      ['Timestamp','User','Role','Action','Detail'].map(cell).join(','),
      ...filtered.map(l => [new Date(l.timestamp).toLocaleString(), l.user?.username || 'System', l.user?.role || 'SYSTEM', l.action, JSON.stringify(l.details)].map(cell).join(','))
    ]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }))
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role="admin" userName={currentUser?.username || 'Administrator'} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>Audit Log</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Track all system changes and user actions</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.bgCard, border: `1px solid ${c.border}`, color: c.textSec, padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <FiRefreshCw size={15} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} /> Refresh
            </button>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <FiDownload size={15} /> Export Log
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Events',   val: logs.length,                                           color: c.primary },
            { label: 'Config Changes', val: logs.filter(l => l.action.includes('UPDATE') || l.action.includes('CREATE')).length, color: c.accent  },
            { label: 'Logins',         val: logs.filter(l => l.action.includes('LOGIN')).length,         color: c.success },
            { label: 'Deletions',      val: logs.filter(l => l.action.includes('DELETE')).length, color: c.danger  },
          ].map(st => (
            <div key={st.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 24px', transition: 'background 0.3s' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: st.color }}>{st.val}</div>
              <div style={{ color: c.textMuted, fontSize: 13 }}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <FiSearch size={15} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, action, detail..."
              style={{ width: '100%', background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px 10px 36px', color: c.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all','admin','technician','staff'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${filter === f ? c.primary : c.border}`, background: filter === f ? `${c.primary}18` : 'transparent', color: filter === f ? c.primary : c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                {f === 'all' ? 'All Roles' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden', transition: 'background 0.3s' }}>
          {filtered.map((log, i) => {
            const Icon  = actionIcon[log.action]  || FiSettings
            const color = actionColor[log.action] || c.textSec
            const userDisplay = log.user?.username || 'System'
            const roleDisplay = log.user?.role?.toLowerCase() || 'system'
            const timeDisplay = new Date(log.timestamp).toLocaleString()
            const detailDisplay = typeof log.details === 'object' ? JSON.stringify(log.details) : log.details

            return (
              <div key={log._id || i} style={{ display: 'flex', gap: 16, padding: '16px 24px', borderBottom: i < filtered.length - 1 ? `1px solid ${c.bgCard2}` : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Icon size={16} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>{userDisplay}</span>
                      <span style={{ background: (roleColor[roleDisplay] || '#94a3b8') + '20', color: (roleColor[roleDisplay] || '#94a3b8'), padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{roleDisplay}</span>
                      <span style={{ background: color + '18', color, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{log.action.replace(/_/g, ' ')}</span>
                    </div>
                    <span style={{ color: c.textFaint, fontSize: 12, whiteSpace: 'nowrap' }}>{timeDisplay}</span>
                  </div>
                  <div style={{ color: c.textSec, fontSize: 13, marginTop: 4 }}>{detailDisplay}</div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: c.textFaint, fontSize: 14 }}>No matching log entries</div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
