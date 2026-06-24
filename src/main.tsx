import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EquationApp from './EquationApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EquationApp />
  </StrictMode>,
)
