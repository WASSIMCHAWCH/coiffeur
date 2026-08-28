import { getWhatsAppLink, getContactMessage, getPhoneLink, getMapsDirectionsLink } from '../utils/whatsapp';

// compact : version petite pour le Hero
// full    : version complète avec labels
export default function ContactButtons({ shop, compact = false, className = '' }) {
  const phone    = shop?.phone    || import.meta.env.VITE_PHONE_NUMBER    || '+216 70 000 000';
  const whatsapp = shop?.whatsapp || import.meta.env.VITE_WHATSAPP_NUMBER || '21670000000';
  const lat      = shop?.latitude  || parseFloat(import.meta.env.VITE_LATITUDE)  || 36.352722;
  const lng      = shop?.longitude || parseFloat(import.meta.env.VITE_LONGITUDE) || 10.209417;

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }} className={className}>
        <a href={getPhoneLink(phone)} className="contact-btn contact-btn-call" id="btn-call-hero">
          📞 <span>Appeler</span>
        </a>
        <a
          href={getWhatsAppLink(getContactMessage())}
          className="contact-btn contact-btn-whatsapp"
          target="_blank"
          rel="noopener noreferrer"
          id="btn-whatsapp-hero"
        >
          💬 <span>WhatsApp</span>
        </a>
        <a
          href={getMapsDirectionsLink(lat, lng)}
          className="contact-btn contact-btn-maps"
          target="_blank"
          rel="noopener noreferrer"
          id="btn-maps-hero"
        >
          📍 <span>Maps</span>
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className={className}>
      <a href={getPhoneLink(phone)} className="contact-btn contact-btn-call" id="btn-call-full">
        <span style={{ fontSize: '1.2rem' }}>📞</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Appeler</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{phone}</div>
        </div>
      </a>

      <a
        href={getWhatsAppLink(getContactMessage())}
        className="contact-btn contact-btn-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        id="btn-whatsapp-full"
      >
        <span style={{ fontSize: '1.2rem' }}>💬</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>WhatsApp</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Message direct</div>
        </div>
      </a>

      <a
        href={getMapsDirectionsLink(lat, lng)}
        className="contact-btn contact-btn-maps"
        target="_blank"
        rel="noopener noreferrer"
        id="btn-maps-full"
      >
        <span style={{ fontSize: '1.2rem' }}>📍</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Voir sur Google Maps</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Hammam Zriba, Zaghouan, Tunisie</div>
        </div>
      </a>
    </div>
  );
}
