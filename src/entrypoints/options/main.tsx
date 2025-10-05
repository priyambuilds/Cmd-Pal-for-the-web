import { createRoot } from 'react-dom/client'
import Options from './App'

const el = document.getElementById('root')
if (el) createRoot(el).render(<Options />)
