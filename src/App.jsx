import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home         from './pages/Home';
import Booking      from './pages/Booking';
import Confirmation from './pages/Confirmation';
import Contact      from './pages/Contact';
import Admin        from './pages/Admin';
import { useEffect, useState } from 'react';
import { getShopInfo } from './services/api';

export default function App() {
  const [shop, setShop] = useState(null);

  useEffect(() => {
    getShopInfo().then(setShop).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/booking"     element={<Booking />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/contact"     element={<Contact />} />
            <Route path="/admin"       element={<Admin />} />
            {/* 404 */}
            <Route path="*" element={
              <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px' }}>
                <div style={{ fontSize: '4rem' }}>✂️</div>
                <h1 style={{ fontFamily: 'Playfair Display', color: 'var(--gold)' }}>Page introuvable</h1>
                <a href="/" className="btn-outline-gold">← Retour à l'accueil</a>
              </div>
            } />
          </Routes>
        </div>
        <Footer shop={shop} />
      </div>
    </BrowserRouter>
  );
}
