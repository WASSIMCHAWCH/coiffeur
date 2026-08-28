import { useEffect, useState } from 'react';
import ContactButtons from '../components/ContactButtons';
import { getShopInfo, getSchedule } from '../services/api';
import { getMapsDirectionsLink } from '../utils/whatsapp';

export default function Contact() {
  const [shop, setShop]         = useState(null);
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    Promise.all([getShopInfo(), getSchedule()]).then(([s, sch]) => {
      setShop(s);
      setSchedule(sch);
    });
  }, []);

  const lat = shop?.latitude  || 36.352722;
  const lng = shop?.longitude || 10.209417;

  return (
    <main style={{ padding: '60px 20px', minHeight: '100vh' }}>
      <div className="container-custom" style={{ maxWidth: '800px' }}>

        {/* Titre */}
        <div className="text-center mb-32">
          <h1 className="section-title">Nous Contacter</h1>
          <div className="gold-divider" />
          <p className="section-subtitle mt-16">
            Plusieurs façons de nous joindre ou de nous trouver
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>

          {/* Contact direct */}
          <div className="card-dark">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: 'var(--red)' }}>
              📞 Contact direct
            </h2>
            <ContactButtons shop={shop} />
          </div>

          {/* Localisation */}
          <div className="card-dark">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--red)' }}>
              📍 Localisation
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
              {shop?.address || 'Hammam Zriba, Zaghouan, Tunisie'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '20px' }}>
              {lat.toFixed(6)}°N, {lng.toFixed(6)}°E
            </p>

            {/* Aperçu carte */}
            <div style={{
              height: '160px',
              background: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.08), transparent 70%)' }} />
              <div style={{ textAlign: 'center', zIndex: 1 }}>
                <div style={{ fontSize: '2rem', animation: 'bounce 2s ease-in-out infinite' }}>📍</div>
                <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.85rem', marginTop: '6px' }}>Gar3a — Mohamed Hechi</div>
              </div>
            </div>

            <a
              href={getMapsDirectionsLink(lat, lng)}
              className="btn-gold w-100"
              target="_blank"
              rel="noopener noreferrer"
              id="btn-contact-itineraire"
              style={{ justifyContent: 'center' }}
            >
              <span>🗺️ Obtenir l'itinéraire</span>
            </a>
          </div>

          {/* Horaires */}
          <div className="card-dark">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: 'var(--red)' }}>
              🕐 Horaires d'ouverture
            </h2>
            {schedule.length === 0
              ? <div className="loading-spinner" />
              : schedule.map(day => (
                  <div key={day.day} className="schedule-row">
                    <span className="schedule-day">{day.day}</span>
                    {day.active
                      ? <span className="schedule-hours">
                          {day.open} – {day.close}
                          {day.breakStart && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '6px' }}>
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
    </main>
  );
}
