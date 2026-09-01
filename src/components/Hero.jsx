import { Link } from 'react-router-dom';
import ContactButtons from './ContactButtons';
import mohamedImg from '../assets/mohamed.jpg';
import { useShopStatus } from '../context/ShopStatusContext.jsx';

export default function Hero({ shop }) {
  const { isOpen } = useShopStatus();

  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-content">
        {/* Photo de profil de Mohamed Hechi */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            padding: '4px',
            background: 'linear-gradient(135deg, var(--red) 0%, #CBD5E1 50%, var(--blue) 100%)',
            boxShadow: '0 8px 30px rgba(220, 38, 38, 0.25)',
            display: 'inline-block',
          }}>
            <img
              src={mohamedImg}
              alt="Mohamed Hechi — Coiffeur & Barber"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            background: 'var(--red)',
            color: '#fff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            border: '2px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            ✂️
          </div>
        </div>

        {/* Badge professionnel */}
        <div>
          <div className="hero-badge">
            ✂️ Coiffeur &amp; Barber Professionnel
          </div>
        </div>

        {/* Indicateur Statut Salon */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 18px',
            borderRadius: '100px',
            background: isOpen ? 'rgba(240, 253, 244, 0.15)' : 'rgba(254, 242, 242, 0.15)',
            border: `1.5px solid ${isOpen ? 'rgba(187, 247, 208, 0.5)' : 'rgba(252, 165, 165, 0.5)'}`,
            backdropFilter: 'blur(8px)',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: isOpen ? '#86EFAC' : '#FCA5A5',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transition: 'all 0.4s ease',
          }}>
            {/* Point de statut */}
            <span style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: isOpen ? '#4ADE80' : '#F87171',
              boxShadow: isOpen
                ? '0 0 0 0 rgba(74, 222, 128, 0.7)'
                : '0 0 0 0 rgba(248, 113, 113, 0)',
              animation: isOpen ? 'pulse-dot 2s infinite' : 'none',
              flexShrink: 0,
            }} />
            {isOpen
              ? 'Salon ouvert — Réservez maintenant'
              : 'Salon fermé pour le moment'}
          </div>
        </div>

        {/* Titre */}
        <h1 className="hero-title gradient-text">
          {shop?.brand || 'GAR3A'}
        </h1>

        {/* Nom */}
        <p className="hero-name">
          {shop?.name || 'Mohamed Hechi'}
        </p>

        {/* Tagline */}
        <p className="hero-tagline">
          Votre style, votre rendez-vous.<br />
          Réservez en ligne en moins de 2 minutes.
        </p>

        {/* CTA Principal */}
        <div className="hero-actions">
          <Link to="/booking" className="btn-gold" style={{ fontSize: '1rem', padding: '16px 40px', width: '100%', maxWidth: '320px' }}>
            <span>📅 Prendre Rendez-vous</span>
          </Link>
        </div>

        {/* Boutons contact */}
        <div className="hero-contact-row">
          <ContactButtons shop={shop} compact />
        </div>
      </div>
    </section>
  );
}
