import { Link } from 'react-router-dom';
import mohamedImg from '../assets/mohamed.jpg';

export default function Footer({ shop }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-stripe" />
      <div className="footer-content">
      <div className="container-custom">
        <div style={{ display: 'inline-block', marginBottom: '12px' }}>
          <img
            src={mohamedImg}
            alt="Mohamed Hechi"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2.5px solid var(--red)',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
            }}
          />
        </div>
        <div className="footer-brand">GAR3A</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
          {shop?.name || 'Mohamed Hechi'} — Coiffeur &amp; Barber
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '20px' }}>
          {shop?.address || 'Hammam Zriba, Zaghouan, Tunisie'}
        </p>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          <Link to="/"        style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>Accueil</Link>
          <Link to="/booking" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>Réserver</Link>
          <Link to="/contact" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>Contact</Link>
        </div>

        <div className="gold-divider" />

        <p className="footer-text" style={{ marginTop: '16px' }}>
          © {year} Gar3a — Mohamed Hechi. Tous droits réservés.
        </p>
      </div>
      </div>
    </footer>
  );
}
