import { useState, createContext, useContext, useCallback } from 'react'
import { FiCheckCircle, FiAlertTriangle, FiAlertOctagon, FiX, FiInfo } from 'react-icons/fi'
import { useColors } from '../hooks/useColors'

const ToastContext = createContext()

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, duration }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }) {
  const c = useColors()

  const icons = {
    success:  <FiCheckCircle size={16} color="#2ed573" />,
    warning:  <FiAlertTriangle size={16} color="#ffa502" />,
    critical: <FiAlertOctagon size={16} color="#ff4757" />,
    info:     <FiInfo size={16} color="#0ea5e9" />,
  }

  const borders = {
    success:  '#2ed573',
    warning:  '#ffa502',
    critical: '#ff4757',
    info:     '#0ea5e9',
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
      {toasts.map(t => (
        <div key={t.id}
          style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderLeft: `4px solid ${borders[t.type] || borders.info}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.25)', animation: 'slideInRight 0.3s ease', transition: 'background 0.3s' }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>{icons[t.type] || icons.info}</div>
          <div style={{ flex: 1, color: c.text, fontSize: 14, lineHeight: 1.5 }}>{t.message}</div>
          <button onClick={() => onRemove(t.id)}
            style={{ background: 'none', border: 'none', color: c.textFaint, cursor: 'pointer', flexShrink: 0, padding: 0 }}>
            <FiX size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
