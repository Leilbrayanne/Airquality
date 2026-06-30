import { useState, useEffect } from 'react'
import Sidebar from '../../shared/components/Sidebar'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiUser, FiMail, FiShield, FiRefreshCw } from 'react-icons/fi'
import { useColors } from '../../shared/hooks/useColors'
import { useApi } from '../../shared/utils/api'

const emptyForm = { username: '', email: '', role: 'STAFF', password: '', active: true }

export default function UserManagement() {
  const [users, setUsers]       = useState([])
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [editId, setEditId]     = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch]     = useState('')
   
  const [loading, setLoading]   = useState(true)
  const [formError, setFormError] = useState('')
  
  const c = useColors()
  const { get, post, put, delete: del } = useApi()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await get('/users')
      setUsers(data)
    } catch (err) {
      setFormError('Access Denied: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [get])

  const roleColor = { ADMIN: c.accent, TECHNICIAN: c.primary, STAFF: c.warning }
  const roleBg    = { ADMIN: `${c.accent}18`, TECHNICIAN: `${c.primary}18`, STAFF: `${c.warning}18` }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  )

  const openAdd  = () => { setForm(emptyForm); setModal('add'); setFormError('') }

  const handleSave = async () => {
    setFormError('')
    
    if (!form.username.trim()) return setFormError('Username is required')
    if (modal === 'add' && !form.password) return setFormError('Password is required for new users')
    
    try {
      if (modal === 'add') {
        await post('/auth/register', form)
      } else {
        await put(`/users/${editId}`, form)
      }
      setModal(null)
      fetchUsers()
    } catch (err) {
      setFormError('Facility Data Sync Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (user) => {
    setForm({
      username: user.username,
      email: user.email || '',
      role: user.role,
      password: '', // Leave blank if not changing
      active: user.is_active
    })
    setEditId(user._id)
    setModal('edit')
    setFormError('')
  }

  const handleDelete  = async () => { 
    try {
      await del(`/users/${deleteId}`)
      setDeleteId(null)
      fetchUsers()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const inputStyle = { width: '100%', background: c.bgInput, border: `1px solid ${c.border}`, borderRadius: 10, padding: '11px 12px 11px 38px', color: c.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'background 0.3s' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, transition: 'background 0.3s' }}>
      <Sidebar role="admin" />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>User Management</h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Manage system users and role-based access</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <FiPlus size={16} /> Add User
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Users',    val: users.length,                                          color: c.primary },
            { label: 'Active',         val: users.filter(u => u.is_active).length,                 color: c.success },
            { label: 'Administrators', val: users.filter(u => u.role === 'ADMIN').length,          color: c.accent  },
            { label: 'Clinical Staff', val: users.filter(u => u.role === 'STAFF').length,          color: c.warning },
          ].map(st => (
            <div key={st.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 24px', transition: 'background 0.3s' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: st.color }}>{st.val}</div>
              <div style={{ color: c.textMuted, fontSize: 13 }}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          style={{ width: '100%', maxWidth: 400, background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 10, padding: '11px 16px', color: c.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20, transition: 'background 0.3s' }} />

        {/* Table */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden', transition: 'background 0.3s' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['User','Email','Role','Status','Created At','Actions'].map(h => (
                    <th key={h} style={{ color: c.textFaint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '14px 16px', textAlign: 'left', borderBottom: `1px solid ${c.border}`, background: c.bgCard2 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u._id} style={{ borderBottom: `1px solid ${c.bgCard2}` }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: (roleColor[u.role] || c.textFaint) + '30', color: roleColor[u.role] || c.textFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: c.textSec, fontSize: 13 }}>{u.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: roleBg[u.role] || c.border, color: roleColor[u.role] || c.textFaint, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: u.is_active ? c.successBg : c.dangerBg, color: u.is_active ? c.success : c.danger, border: `1px solid ${u.is_active ? 'rgba(46,213,115,0.3)' : 'rgba(255,71,87,0.3)'}`, padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: c.textFaint, fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(u)} style={{ background: c.primaryBg, border: '1px solid rgba(56,189,248,0.3)', color: c.primary, padding: '7px', borderRadius: 8, cursor: 'pointer' }}><FiEdit2 size={14} /></button>
                        <button onClick={() => setDeleteId(u._id)} style={{ background: c.dangerBg, border: '1px solid rgba(255,71,87,0.3)', color: c.danger, padding: '7px', borderRadius: 8, cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.4)', transition: 'background 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${c.border}` }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{modal === 'add' ? 'Add New User' : 'Edit User'}</h3>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer' }}><FiX size={18} /></button>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <FiUser size={15} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="e.g. admin, LEI, john.doe" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <FiMail size={15} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                {modal === 'add' && (
                  <div>
                    <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <FiX size={15} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', color: c.textSec, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Role</label>
                  <div style={{ position: 'relative' }}>
                    <FiShield size={15} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
                      <option value="ADMIN">Administrator</option>
                      <option value="TECHNICIAN">Technician</option>
                      <option value="STAFF">Clinical Staff</option>
                    </select>
                  </div>
                </div>
                
                {formError && (
                  <div style={{ background: c.dangerBg, border: `1px solid rgba(255,71,87,0.3)`, color: c.danger, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: c.danger, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>!</div>
                    {formError}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${c.border}` }}>
                <button onClick={() => setModal(null)} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textSec, padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.gradient, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  <FiSave size={14} /> {modal === 'add' ? 'Register User' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, width: '100%', maxWidth: 400, transition: 'background 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${c.border}` }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: c.danger }}>Delete User</h3>
                <button onClick={() => setDeleteId(null)} style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer' }}><FiX size={18} /></button>
              </div>
              <div style={{ padding: '20px 24px', color: c.textSec, fontSize: 15 }}>Are you sure you want to delete this user? This action cannot be undone.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${c.border}` }}>
                <button onClick={() => setDeleteId(null)} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textSec, padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.danger, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  <FiTrash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
