import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import mohamedImg from '../assets/mohamed.jpg';
import { useShopStatus } from '../context/ShopStatusContext.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeHash, setActiveHash] = useState(location.hash);
  const { isOpen: shopOpen } = useShopStatus();

  useEffect(() => {
    setActiveHash(location.hash);
  }, [location]);

  // Observer de défilement pour la section Services sur la page d'accueil
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveHash('');
      return;
    }

    const handleScroll = () => {
      const servicesEl = document.getElementById('services');
      if (servicesEl) {
        const rect = servicesEl.getBoundingClientRect();
        if (rect.top <= 200 && rect.bottom >= 100) {
          setActiveHash('#services');
        } else if (window.scrollY < 200) {
          setActiveHash('');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleNavClick = (e, path, hash = '') => {
    setOpen(false);
    if (path === '/') {
      if (hash === '#services') {
        e.preventDefault();
        if (location.pathname === '/') {
          setActiveHash('#services');
          const el = document.getElementById('services');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          window.history.replaceState(null, '', '/#services');
        } else {
          navigate('/#services');
        }
      } else {
        // Accueil
        if (location.pathname === '/') {
          e.preventDefault();
          setActiveHash('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          window.history.replaceState(null, '', '/');
        } else {
          navigate('/');
        }
      }
    }
  };

  const isHomeActive = location.pathname === '/' && activeHash !== '#services';
  const isServicesActive = location.pathname === '/' && activeHash === '#services';
  const isContactActive = location.pathname === '/contact';
  const isBookingActive = location.pathname === '/booking';
  const isAdminActive = location.pathname === '/admin';

  return (
    <>
      <nav className="navbar-gar3a">
        <div className="navbar-inner">
          <div className="container-custom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Brand */}
            <Link
              to="/"
              className="navbar-brand-text"
              onClick={(e) => handleNavClick(e, '/')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <img
                src={mohamedImg}
                alt="Mohamed Hechi"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--red)',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                }}
              />
              <span>GAR3A</span>

              {/* Badge statut salon */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 9px',
                borderRadius: '100px',
                background: shopOpen ? '#F0FDF4' : '#FEF2F2',
                color: shopOpen ? '#16A34A' : '#DC2626',
                border: `1px solid ${shopOpen ? '#BBF7D0' : '#FCA5A5'}`,
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap',
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: shopOpen ? '#16A34A' : '#DC2626',
                  animation: shopOpen ? 'pulse-dot 2s infinite' : 'none',
                  flexShrink: 0,
                }} />
                {shopOpen ? 'Ouvert' : 'Fermé'}
              </span>
            </Link>

            {/* Desktop nav */}
            <ul className="nav-links" style={{ display: 'none' }} id="desktop-nav">
              <li>
                <a
                  href="/"
                  className={isHomeActive ? 'active' : ''}
                  onClick={(e) => handleNavClick(e, '/')}
                >
                  Accueil
                </a>
              </li>
              <li>
                <a
                  href="/#services"
                  className={isServicesActive ? 'active' : ''}
                  onClick={(e) => handleNavClick(e, '/', '#services')}
                >
                  Services
                </a>
              </li>
              <li>
                <Link
                  to="/suivi"
                  className={location.pathname === '/suivi' ? 'active' : ''}
                  onClick={() => setOpen(false)}
                >
                  🔍 Mes RDV
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className={isContactActive ? 'active' : ''}
                  onClick={() => setOpen(false)}
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/booking"
                  onClick={() => setOpen(false)}
                >
                  <button className="btn-gold" style={{ padding: '10px 20px', fontSize: '0.8rem' }}>
                    <span>📅 Réserver</span>
                  </button>
                </Link>
              </li>
            </ul>

            {/* Mobile: CTA + hamburger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/booking" className="btn-gold" style={{ padding: '10px 18px', fontSize: '0.8rem' }}>
                <span>📅 Réserver</span>
              </Link>
              <button
                className="hamburger"
                onClick={() => setOpen(!open)}
                aria-label="Menu"
              >
                <span style={{ transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none', transition: 'all 0.2s' }} />
                <span style={{ opacity: open ? 0 : 1, transition: 'all 0.2s' }} />
                <span style={{ transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none', transition: 'all 0.2s' }} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="mobile-menu">
          <a
            href="/"
            className={isHomeActive ? 'active' : ''}
            onClick={(e) => handleNavClick(e, '/')}
          >
            🏠 Accueil
          </a>
          <a
            href="/#services"
            className={isServicesActive ? 'active' : ''}
            onClick={(e) => handleNavClick(e, '/', '#services')}
          >
            ✂️ Services
          </a>
          <Link
            to="/suivi"
            className={location.pathname === '/suivi' ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            🔍 Mes Rendez-vous
          </Link>
          <Link
            to="/booking"
            className={isBookingActive ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            📅 Réserver
          </Link>
          <Link
            to="/contact"
            className={isContactActive ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            📞 Contact
          </Link>
          <Link
            to="/admin"
            className={isAdminActive ? 'active' : ''}
            onClick={() => setOpen(false)}
            style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
          >
            ⚙️ Admin
          </Link>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          #desktop-nav { display: flex !important; }
          .hamburger { display: none !important; }
        }
      `}</style>
    </>
  );
}
