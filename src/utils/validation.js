// =============================================
// Utils — Validation formulaire
// =============================================

export function validateName(name) {
  if (!name || name.trim().length < 2) {
    return 'Veuillez entrer votre nom complet (minimum 2 caractères).';
  }
  if (name.trim().length > 60) {
    return 'Le nom est trop long (maximum 60 caractères).';
  }
  return null;
}

export function validatePhone(phone) {
  // Numéro tunisien : commence par 2, 5, 7, 9 ou format international +216
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  const tnLocal = /^[2579]\d{7}$/;
  const tnIntl  = /^\+?216[2579]\d{7}$/;

  if (!cleaned) return 'Veuillez entrer votre numéro de téléphone.';
  if (!tnLocal.test(cleaned) && !tnIntl.test(cleaned)) {
    return 'Numéro invalide. Exemple : 22 123 456 ou +216 22 123 456';
  }
  return null;
}

export function validateBookingForm({ name, phone }) {
  const errors = {};
  const nameErr  = validateName(name);
  const phoneErr = validatePhone(phone);
  if (nameErr)  errors.name  = nameErr;
  if (phoneErr) errors.phone = phoneErr;
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
