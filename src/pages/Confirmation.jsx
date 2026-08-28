import { useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ContactButtons from '../components/ContactButtons';
import { formatDateFR, calcEndTime } from '../utils/date';
import { getWhatsAppLink, getBookingConfirmationMessage, getMapsDirectionsLink, getAddToCalendarLink } from '../utils/whatsapp';

const LAT = parseFloat(import.meta.env.VITE_LATITUDE)  || 36.352722;
const LNG = parseFloat(import.meta.env.VITE_LONGITUDE) || 10.209417;

export default function Confirmation() {
  const location = useLocation();
  const navigate  = useNavigate();
  const state     = location.state;

  // Si pas de state (rechargement page), retour accueil
  useEffect(() => {
    if (!state) navigate('/');
  }, [state, navigate]);

  if (!state) return null;

  const { service, date, time, endTime, client } = state;

  const waMessage = getBookingConfirmationMessage({
    clientName: client.name,
    service:    service.name,
    date:       formatDateFR(date),
    time,
  });

  const calendarUrl = getAddToCalendarLink({
    date,
    startTime: time,
    endTime:   endTime || calcEndTime(time, service.duration),
    service:   service.name,
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '40px 20px' }}>
      <div className="container-custom" style={{ maxWidth: '560px' }}>
        <div className="confirmation-card animate-scaleIn">

          {/* Icône succès */}
          <div className="confirmation-icon">✓</div>

          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
            fontWeight: 700,
            marginBottom: '8px',
          }}>
            Rendez-vous confirmé !
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.6 }}>
            Bonjour <strong style={{ color: 'var(--red)' }}>{client.name}</strong>,<br />
            votre rendez-vous chez <strong>Mohamed Hechi (Gar3a)</strong> est confirmé.
          </p>

          {/* Détails */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '28px' }}>
            {[
              { label: 'Service',  value: service.name,         icon: '✂️' },
              { label: 'Date',     value: formatDateFR(date),   icon: '📅' },
              { label: 'Heure',    value: time,                 icon: '⏰' },
              { label: 'Durée',    value: `${service.duration} min`, icon: '⏱' },
              { label: 'Téléphone', value: client.phone,        icon: '📞' },
            ].map(item => (
              <div key={item.label} className="confirmation-detail">
                <span className="confirmation-label">{item.icon} {item.label}</span>
                <span className="confirmation-value">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Adresse */}
          <div style={{
            background: 'var(--red-glow)',
            border: '1px solid var(--border-red)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '1.4rem' }}>📍</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--red)' }}>Mohamed Hechi (Gar3a)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hammam Zriba, Zaghouan, Tunisie</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href={getMapsDirectionsLink(LAT, LNG)}
              className="btn-gold"
              target="_blank"
              rel="noopener noreferrer"
              id="btn-confirm-maps"
              style={{ justifyContent: 'center' }}
            >
              <span>📍 Voir la Localisation</span>
            </a>

            <a
              href={getWhatsAppLink(waMessage)}
              className="btn-outline-gold"
              target="_blank"
              rel="noopener noreferrer"
              id="btn-confirm-whatsapp"
              style={{ justifyContent: 'center' }}
            >
              💬 Contacter le Coiffeur
            </a>

            <a
              href={calendarUrl}
              download={`rdv-gar3a-${date}.ics`}
              className="btn-ghost"
              id="btn-confirm-calendar"
              style={{ justifyContent: 'center' }}
            >
              📆 Ajouter au Calendrier
            </a>

            <Link
              to="/"
              className="btn-ghost"
              id="btn-confirm-home"
              style={{ justifyContent: 'center', marginTop: '8px' }}
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
