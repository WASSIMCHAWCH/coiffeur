// =============================================
// Utils — WhatsApp & Contact links
// =============================================

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '21621376917';

// Génère un lien WhatsApp avec message pré-rempli (vers le numéro du salon 21621376917)
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

// Message de notification de confirmation envoyé AU CLIENT par l'admin (Arabe Tunisien)
export function getConfirmationMessageToClient({ clientName, serviceName, date, time, clientPhone }) {
  const trackingUrl = clientPhone
    ? `https://coiffeur-umber.vercel.app/suivi?phone=${clientPhone}`
    : 'https://coiffeur-umber.vercel.app/suivi';

  return `عسلامة ${clientName}،

نعلموك إلي الموعد متاعك عند *محمد الحيشي (Gar3a)* تم *تأكيده بنجاح* ✅ :

✂️ الخدمة : ${serviceName}
📅 التاريخ : ${date}
⏰ الوقت : ${time}

📍 العنوان : حمام الزريبة، زغوان
🔗 تنجم تتبع الموعد متاعك من هنا :
${trackingUrl}

مرحبا بيك في كل وقت — فريق Gar3a ✂️`;
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

// Message de notification d'annulation envoyé AU SALON par le client (Arabe Tunisien vers 216 21 376 917)
export function getCancellationMessageToSalon({ clientName, clientPhone, serviceName, date, time }) {
  return `عسلامة خويا محمد،

حبيت نعلمك إلي ألغيت الموعد متاعي :

👤 الإسم : ${clientName}
📞 الهاتف : ${clientPhone}
✂️ الخدمة : ${serviceName}
📅 التاريخ : ${date}
⏰ الوقت : ${time}

شكراً وبارك الله فيك.`;
}

// Message WhatsApp après confirmation de RDV
export function getBookingConfirmationMessage({ clientName, service, date, time }) {
  return `عسلامة خويا محمد، حبيت نأكد الحجز متاعي في Gar3a :

👤 الإسم : ${clientName}
✂️ الخدمة : ${service}
📅 التاريخ : ${date}
⏰ الوقت : ${time}

شكراً وبارك الله فيك.`;
}

// Message WhatsApp générique de contact
export function getContactMessage() {
  return `عسلامة خويا محمد، حبيت نسأل على موعد (رونديفو) في Gar3a.`;
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
