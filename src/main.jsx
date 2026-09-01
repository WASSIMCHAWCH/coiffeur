import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ShopStatusProvider } from './context/ShopStatusContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ShopStatusProvider>
      <App />
    </ShopStatusProvider>
  </StrictMode>,
)
