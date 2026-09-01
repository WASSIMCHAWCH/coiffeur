import { useEffect } from 'react';
import { getWhatsAppLink, getWhatsAppLinkTo, getCancellationMessageToClient, getCancellationMessageToSalon } from '../utils/whatsapp';
import { formatDateFR } from '../utils/date';

/**
 * Popup de confirmation d'annulation avec bouton WhatsApp.
 *
 * Props :
 *  - appt      : objet rendez-vous { id, clientName, clientPhone, serviceName, date, startTime }
 *  - onClose   : fermer le modal
 *  - context   : 'admin' | 'client'
 *               admin  → message envoyé AU client pour l'informer de l'annulation
 *               client → message envoyé AU SALON (21621376917) pour signaler l'annulation
 */
export default function CancelConfirmModal({ appt, onClose, context = 'admin' }) {
  const isClientContext = context === 'client';

  // Fermeture avec Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!appt) return null;

  const displayDate = appt.date ? formatDateFR(appt.date) : appt.date;

  // Message pré-rempli selon le contexte
  const waMessage = isClientContext
    ? getCancellationMessageToSalon({
        clientName:  appt.clientName,
        clientPhone: appt.clientPhone,
        serviceName: appt.serviceName,
        date:        displayDate,
        time:        appt.startTime,
      })
    : getCancellationMessageToClient({
        clientName:  appt.clientName,
        serviceName: appt.serviceName,
        date:        displayDate,
        time:        appt.startTime,
      });

  const waLink = isClientContext
    ? getWhatsAppLink(waMessage) // Envoi au coiffeur Mohamed Hechi (21621376917)
    : getWhatsAppLinkTo(appt.clientPhone, waMessage); // Envoi au client

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 3000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card-dark animate-scaleIn"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '28px 24px',
          borderTop: '4px solid #DC2626',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* Icône & titre */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#FEF2F2',
            border: '2px solid #FCA5A5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            margin: '0 auto 12px',
          }}>
            ✕
          </div>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '6px',
          }}>
            {isClientContext ? 'إلغاء الموعد / Annulation' : 'Rendez-vous annulé'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {isClientContext
              ? "لتأكيد الإلغاء، يرجى إرسال الرسالة لمحمد الحيشي (21 376 917)"
              : "Le rendez-vous a bien été annulé dans le système."}
          </p>
        </div>

        {/* Récap du RDV */}
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>👤 Client</span>
            <strong style={{ color: 'var(--text-primary)' }}>{appt.clientName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>📞 Téléphone</span>
            <strong style={{ color: 'var(--text-primary)' }}>{appt.clientPhone}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>✂️ Service</span>
            <strong style={{ color: 'var(--text-primary)' }}>{appt.serviceName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>📅 Date</span>
            <strong style={{ color: 'var(--text-primary)' }}>{displayDate}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>⏰ Heure</span>
            <strong style={{ color: 'var(--red)' }}>{appt.startTime}</strong>
          </div>
        </div>

        {/* Aperçu du message WhatsApp */}
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: '20px',
          fontSize: '0.78rem',
          color: '#166534',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          maxHeight: '130px',
          overflowY: 'auto',
          direction: 'rtl',
          textAlign: 'right',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16A34A', direction: 'ltr', textAlign: 'left' }}>
            💬 {isClientContext ? "Message pour Mohamed (21 376 917)" : "Message WhatsApp pré-rempli"}
          </div>
          {waMessage}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              background: '#22C55E',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              transition: 'background 0.2s ease',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#16A34A'}
            onMouseLeave={e => e.currentTarget.style.background = '#22C55E'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {isClientContext ? "إرسال الإشعار لمحمد عبر واتساب (WhatsApp)" : "Notifier le client par WhatsApp"}
          </a>

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ justifyContent: 'center', fontSize: '0.85rem' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
