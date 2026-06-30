import { useTheme } from '../contexts/ThemeContext'

export function useColors() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return {
    bg:          dark ? '#0a0e1a'  : '#f0f4f8',
    bgCard:      dark ? '#111827'  : '#ffffff',
    bgCard2:     dark ? '#0d1424'  : '#f8fafc',
    bgSidebar:   dark ? '#0d1424'  : '#ffffff',
    bgInput:     dark ? '#0d1424'  : '#f1f5f9',
    text:        dark ? '#f1f5f9'  : '#0f172a',
    textSec:     dark ? '#94a3b8'  : '#334155',
    textMuted:   dark ? '#64748b'  : '#64748b',
    textFaint:   dark ? '#475569'  : '#94a3b8',
    border:      dark ? '#1e293b'  : '#e2e8f0',
    primary:     dark ? '#00d4aa'  : '#00a884',
    accent:      dark ? '#0ea5e9'  : '#0284c7',
    gradient:    dark ? 'linear-gradient(135deg,#00d4aa,#0ea5e9)' : 'linear-gradient(135deg,#00a884,#0284c7)',
    success:     '#2ed573',
    warning:     '#ffa502',
    danger:      '#ff4757',
    successBg:   'rgba(46,213,115,0.1)',
    warningBg:   'rgba(255,165,2,0.1)',
    dangerBg:    'rgba(255,71,87,0.1)',
    aqi: {
      GOOD:                     '#2ed573',
      MODERATE:                 '#ffa502',
      UNHEALTHY_FOR_SENSITIVE:  '#e67e22',
      UNHEALTHY:                '#ff4757',
      VERY_UNHEALTHY:           '#9c27b0',
      HAZARDOUS:                '#000000',
    }
  }
}
