// =============================================
// Utils — WhatsApp & Contact links
// =============================================

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '21670000000';

// Génère un lien WhatsApp avec message pré-rempli (vers le numéro du salon)
export function getWhatsAppLink(message = '') {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WA_NUMBER}${encoded ? `?text=${encoded}` : ''}`;
}

// Génère un lien WhatsApp vers un numéro SPÉCIFIQUE (ex: client)
export function getWhatsAppLinkTo(phone, message = '') {
  // Nettoyer le numéro : garder uniquement les chiffres
  const cleaned = String(phone || '').replace(/\D/g, '');
  // Ajouter indicatif tunisien si absent
  const fullNumber = cleaned.startsWith('216') ? cleaned : `216${cleaned}`;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${fullNumber}${encoded ? `?text=${encoded}` : ''}`;
}

// Message de notification d'annulation envoyé AU CLIENT par l'admin (Arabe Tunisien)
export function getCancellationMessageToClient({ clientName, serviceName, date, time }) {
  return `عسلامة ${clientName}،

نعلموك إلي الموعد متاعك عند *محمد الحيشي (Gar3a)* تم *إلغاؤه* :

✂️ الخدمة : ${serviceName}
📅 التاريخ : ${date}
⏰ الوقت : ${time}

سامحنا على أي إزعاج. تنجم تعاود تاخو موعد جديد في أي وقت عبر الموقع متاعنا :
🌐 https://coiffeur-umber.vercel.app/

مرحبا بيك في كل وقت — فريق Gar3a ✂️`;
}

// Message de notification d'annulation envoyé AU SALON par le client (Arabe Tunisien)
export function getCancellationMessageToSalon({ clientName, clientPhone, serviceName, date, time }) {
  return `عسلامة خويا محمد،

حبيت نعلمك إلي نحب نلغي الموعد متاعي :

👤 الإسم : ${clientName}
📞 الهاتف : ${clientPhone}
✂️ الخدمة : ${serviceName}
📅 التاريخ : ${date}
⏰ الوقت : ${time}

يعطيك الصحة وبارك الله فيك.`;
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
