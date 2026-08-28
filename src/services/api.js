// =============================================
// API Service — GAR3A
// Communicates with Google Apps Script Web App
// =============================================

const API_URL = import.meta.env.VITE_API_URL;

// Helper pour les requêtes GET
async function fetchGet(params = {}) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Helper pour les requêtes POST (évite le preflight CORS bloquant de Google Apps Script)
async function fetchPost(body = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── GET /shop ──────────────────────────────
export async function getShopInfo() {
  try {
    return await fetchGet({ action: 'shop' });
  } catch {
    // Données de fallback si l'API n'est pas encore configurée
    return {
      name: 'Mohamed Hechi',
      brand: 'Gar3a',
      type: 'Barber',
      phone: import.meta.env.VITE_PHONE_NUMBER || '+216 70 000 000',
      whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || '21670000000',
      latitude: parseFloat(import.meta.env.VITE_LATITUDE) || 36.352722,
      longitude: parseFloat(import.meta.env.VITE_LONGITUDE) || 10.209417,
      address: 'Hammam Zriba, Zaghouan, Tunisie',
      description: 'Bienvenue chez Mohamed Hechi (Gar3a). Coiffeur & Barber professionnel.',
    };
  }
}

// ── GET /services ──────────────────────────
export async function getServices() {
  try {
    return await fetchGet({ action: 'services' });
  } catch {
    // Services de fallback
    return [
      { id: 'S001', name: 'Coupe', duration: 30, description: 'Coupe de cheveux professionnelle', icon: '✂️', active: true },
      { id: 'S002', name: 'Barbe', duration: 20, description: 'Taille et soin de la barbe', icon: '🧔', active: true },
      { id: 'S003', name: 'Coupe + Barbe', duration: 45, description: 'Le combo complet — coupe et barbe', icon: '✨', active: true },
    ];
  }
}

// ── GET /availability ──────────────────────
// date: "YYYY-MM-DD", serviceId: "S001"
export async function getAvailability(date, serviceId) {
  return fetchGet({ action: 'availability', date, serviceId });
}

// ── GET /schedule ──────────────────────────
export async function getSchedule() {
  try {
    return await fetchGet({ action: 'schedule' });
  } catch {
    return [
      { day: 'Lundi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true },
      { day: 'Mardi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true },
      { day: 'Mercredi', open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true },
      { day: 'Jeudi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true },
      { day: 'Vendredi', open: null,    close: null,    breakStart: null, breakEnd: null, active: false },
      { day: 'Samedi',   open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true },
      { day: 'Dimanche', open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true },
    ];
  }
}

// ── POST /appointments ──────────────────────
export async function createAppointment(data) {
  return fetchPost({ action: 'book', ...data });
}

// ── GET /appointments (admin) ──────────────
export async function getAppointments(date) {
  return fetchGet({ action: 'appointments', date });
}

// ── POST /cancel ────────────────────────────
export async function cancelAppointment(appointmentId) {
  return fetchPost({ action: 'cancel', appointmentId });
}

// ── POST /status ────────────────────────────
export async function updateAppointmentStatus(appointmentId, status) {
  return fetchPost({ action: 'update_status', appointmentId, status });
}
