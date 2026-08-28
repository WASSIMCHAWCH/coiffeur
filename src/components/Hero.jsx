import { Link } from 'react-router-dom';
import ContactButtons from './ContactButtons';
import mohamedImg from '../assets/mohamed.jpg';

export default function Hero({ shop }) {
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

        {/* Badge */}
        <div>
          <div className="hero-badge">
            ✂️ Coiffeur &amp; Barber Professionnel
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
