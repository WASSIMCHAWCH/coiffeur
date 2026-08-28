import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Hero from '../components/Hero';
import ServiceCard from '../components/ServiceCard';
import ContactButtons from '../components/ContactButtons';
import { getShopInfo, getServices, getSchedule } from '../services/api';
import { getMapsDirectionsLink } from '../utils/whatsapp';
import mohamedImg from '../assets/mohamed.jpg';

export default function Home() {
  const location = useLocation();
  const [shop, setShop]         = useState(null);
  const [services, setServices] = useState([]);
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    Promise.all([getShopInfo(), getServices(), getSchedule()]).then(([s, svc, sch]) => {
      setShop(s);
      setServices(svc.filter(s => s.active));
      setSchedule(sch);
    });
  }, []);

  // Défilement automatique vers la section demandée (ex: #services)
  useEffect(() => {
    if (location.hash === '#services') {
      setTimeout(() => {
        const el = document.getElementById('services');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [location]);

  const lat = shop?.latitude  || 36.352722;
  const lng = shop?.longitude || 10.209417;

  return (
    <main>
      {/* ── Hero ── */}
      <Hero shop={shop} />

      {/* ── Services ── */}
      <section className="section" id="services" style={{ background: 'var(--bg-surface)' }}>
        <div className="container-custom">
          <div className="text-center mb-32">
            <h2 className="section-title">Nos Services</h2>
            <div className="gold-divider" />
            <p className="section-subtitle mt-16">
              Des prestations soignées pour votre style
            </p>
          </div>

          <div className="service-grid">
            {services.length === 0
              ? [1, 2, 3].map(i => (
                  <div key={i} className="card-dark skeleton" style={{ height: 200 }} />
                ))
              : services.map(svc => (
                  <ServiceCard key={svc.id} service={svc} interactive={false} />
                ))
            }
          </div>

          <div className="text-center mt-40">
            <Link to="/booking" className="btn-gold" style={{ fontSize: '1rem', padding: '16px 40px' }}>
              <span>📅 Prendre Rendez-vous</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── À propos ── */}
      <section className="section">
        <div className="container-custom">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '48px',
            alignItems: 'center'
          }}>
            {/* Photo Card */}
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                maxWidth: '340px',
                margin: '0 auto',
                position: 'relative',
                borderRadius: 'var(--radius-xl)',
                padding: '6px',
                background: 'linear-gradient(135deg, var(--red) 0%, #CBD5E1 50%, var(--blue) 100%)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
              }}>
                <img
                  src={mohamedImg}
                  alt="Mohamed Hechi — Coiffeur & Barber Gar3a"
                  style={{
                    width: '100%',
                    height: '380px',
                    objectFit: 'cover',
                    borderRadius: 'calc(var(--radius-xl) - 6px)',
                    display: 'block',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '-16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#FFFFFF',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '100px',
                  padding: '8px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontSize: '1rem' }}>💈</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    Mohamed Hechi
                  </span>
                  <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.8rem' }}>• Gar3a</span>
                </div>
              </div>
            </div>

            {/* Description & Bio */}
            <div>
              <div style={{ display: 'inline-block', background: 'var(--red-glow)', border: '1px solid var(--border-red)', color: 'var(--red)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: '100px', marginBottom: '20px' }}>
                À propos
              </div>
              <h2 className="section-title" style={{ textAlign: 'left' }}>
                Mohamed Hechi
              </h2>
              <div className="gold-divider gold-divider-left" />
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginTop: '20px', fontSize: '1.05rem' }}>
                Bienvenue chez <strong style={{ color: 'var(--red)' }}>Mohamed Hechi (Gar3a)</strong>.
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginTop: '12px', fontSize: '1rem' }}>
                Passionné par l'art de la coiffure masculine et du soin de la barbe, 
                je vous accueille dans un espace moderne et chaleureux à Hammam Zriba.
                Chaque prestation est réalisée avec précision et professionnalisme pour mettre en valeur votre style unique.
              </p>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginTop: '12px', fontSize: '0.95rem' }}>
                Réservez votre créneau directement en ligne pour un accueil ponctuel et sans attente.
              </p>

              <div style={{ display: 'flex', gap: '24px', marginTop: '32px', flexWrap: 'wrap' }}>
                {[
                  { icon: '✂️', label: 'Coupes', sub: 'Soignées & Précises' },
                  { icon: '🧔', label: 'Barbe', sub: 'Taille & Soin' },
                  { icon: '⭐', label: 'Service', sub: '100% Personnalisé' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center', background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 20px', minWidth: '110px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{item.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Horaires ── */}
      <section className="section section-sm" style={{ background: 'var(--bg-surface)', paddingTop: 48, paddingBottom: 48 }}>
        <div className="container-custom">
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 className="section-title text-center mb-8">Horaires d'ouverture</h2>
            <div className="gold-divider" />
            <div className="card-dark" style={{ marginTop: '24px' }}>
              {schedule.length === 0
                ? <div className="loading-spinner" />
                : schedule.map(day => (
                    <div key={day.day} className="schedule-row">
                      <span className="schedule-day">{day.day}</span>
                      {day.active
                        ? <span className="schedule-hours">
                            {day.open} – {day.close}
                            {day.breakStart && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '8px' }}>
                                (pause {day.breakStart}–{day.breakEnd})
                              </span>
                            )}
                          </span>
                        : <span className="schedule-closed">Fermé</span>
                      }
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </section>

      {/* ── Localisation ── */}
      <section className="section">
        <div className="container-custom">
          <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <h2 className="section-title mb-8">📍 Où nous trouver ?</h2>
            <div className="gold-divider" />
            <p className="section-subtitle mt-16 mb-24">
              {shop?.address || 'Hammam Zriba, Zaghouan, Tunisie'}
            </p>

            {/* Carte visuelle */}
            <div className="map-card">
              <div className="map-preview">
                <div style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
                  <div className="map-pin">📍</div>
                  <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.9rem', marginTop: '8px' }}>
                    {shop?.brand || 'Gar3a'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                  </div>
                </div>
              </div>
              <div className="map-info">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Coordonnées GPS : {lat}°N, {lng}°E
                </p>
                <a
                  href={getMapsDirectionsLink(lat, lng)}
                  className="btn-gold w-100"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-maps-home"
                  style={{ justifyContent: 'center' }}
                >
                  <span>🗺️ Ouvrir Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section style={{ background: 'var(--bg-surface)', padding: '64px 20px', textAlign: 'center' }}>
        <div className="container-custom">
          <h2 className="section-title" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>
            Prêt pour votre rendez-vous ?
          </h2>
          <div className="gold-divider" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '16px', marginBottom: '32px', fontSize: '1rem' }}>
            Réservez en ligne en moins de 2 minutes. Aucun compte requis.
          </p>
          <Link to="/booking" className="btn-gold" style={{ fontSize: '1rem', padding: '16px 48px' }}>
            <span>📅 Prendre Rendez-vous</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
