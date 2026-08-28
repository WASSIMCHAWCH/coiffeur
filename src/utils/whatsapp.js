// =============================================
// Utils — WhatsApp & Contact links
// =============================================

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '21670000000';

// Génère un lien WhatsApp avec message pré-rempli
export function getWhatsAppLink(message = '') {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WA_NUMBER}${encoded ? `?text=${encoded}` : ''}`;
}

// Message WhatsApp après confirmation de RDV
export function getBookingConfirmationMessage({ clientName, service, date, time }) {
  return `Bonjour Mohamed, je viens de réserver un rendez-vous chez Gar3a.

👤 Nom : ${clientName}
✂️ Service : ${service}
📅 Date : ${date}
⏰ Heure : ${time}

Merci !`;
}

// Message WhatsApp générique de contact
export function getContactMessage() {
  return `Bonjour Mohamed, je souhaite prendre un rendez-vous chez Gar3a.`;
}

// Lien téléphone
export function getPhoneLink(phone) {
  const cleaned = phone.replace(/\s/g, '');
  return `tel:${cleaned}`;
}

// Lien Google Maps
export function getMapsLink(lat, lng, label = 'Gar3a - Mohamed Hechi') {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Lien itinéraire Google Maps
export function getMapsDirectionsLink(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Lien "Ajouter au calendrier" (format ICS)
export function getAddToCalendarLink({ date, startTime, endTime, service, address }) {
  const formatDT = (d, t) => {
    const [y, mo, day] = d.split('-');
    const [h, m] = t.split(':');
    return `${y}${mo}${day}T${h}${m}00`;
  };

  const event = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatDT(date, startTime)}`,
    `DTEND:${formatDT(date, endTime)}`,
    `SUMMARY:Gar3a - ${service}`,
    `DESCRIPTION:Rendez-vous chez Mohamed Hechi (Gar3a) - ${service}`,
    `LOCATION:${address || 'Hammam Zriba, Zaghouan, Tunisie'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  const blob = new Blob([event], { type: 'text/calendar' });
  return URL.createObjectURL(blob);
}
