import { createRoot } from 'react-dom/client'
import App from './App'

const mount = () => {
  const el = document.getElementById('root')
  if (!el) return
  createRoot(el).render(<App />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
