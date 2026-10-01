import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)

// Dev only: lets reviewers / tests poke the mock store from the console.
if (import.meta.env.DEV)
  import('./store').then(({ useStore }) => {
    window.__sit = useStore
  })
