import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './shared/services/i18n' // Import i18n configuration
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './shared/contexts/ThemeContext.jsx'
import { AuthProvider } from './shared/contexts/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
   <ErrorBoundary>
        <App />
      </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
