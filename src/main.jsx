import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ShopStatusProvider } from './context/ShopStatusContext.jsx'

// ── Warmup silencieux de Google Apps Script ───────────────────
// GAS se met en veille après ~15 min d'inactivité (cold start = 3-8s).
// On envoie un ping discret dès le chargement de l'app pour réchauffer
// le serveur AVANT que l'utilisateur n'ait besoin des données.
const GAS_URL = import.meta.env.VITE_API_URL;
if (GAS_URL) {
  fetch(`${GAS_URL}?action=ping`, { method: 'GET', redirect: 'follow' })
    .catch(() => { /* warmup silencieux — erreurs ignorées */ });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ShopStatusProvider>
      <App />
    </ShopStatusProvider>
  </StrictMode>,
)
