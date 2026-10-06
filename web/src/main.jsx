import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initTheme } from '@/app/design/theme'
import App from './App.jsx'

initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
