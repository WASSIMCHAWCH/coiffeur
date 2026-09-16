// =============================================
// API Service — GAR3A
// Communicates with Google Apps Script Web App
// =============================================

const API_URL = import.meta.env.VITE_API_URL;

// ── Cache localStorage (stale-while-revalidate) ──────────────
const CACHE_TTL = {
  services: 10 * 60 * 1000, // 10 min
  schedule: 10 * 60 * 1000, // 10 min
  shop:      5 * 60 * 1000, //  5 min
};

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(`gar3a_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    const ttl = CACHE_TTL[key] ?? 5 * 60 * 1000;
    if (Date.now() - ts > ttl) return null; // expiré
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(`gar3a_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota dépassé, on ignore */ }
}

// ── Helper GET ────────────────────────────────────────────────
async function fetchGet(params = {}) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Helper POST ───────────────────────────────────────────────
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

// ── Fallbacks ─────────────────────────────────────────────────
const FALLBACK_SHOP = {
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

const FALLBACK_SERVICES = [
  { id: 'S001', name: 'Coupe',        duration: 30, description: 'Coupe de cheveux professionnelle', icon: '✂️', active: true },
  { id: 'S002', name: 'Barbe',        duration: 20, description: 'Taille et soin de la barbe',       icon: '🧔', active: true },
  { id: 'S003', name: 'Coupe + Barbe',duration: 45, description: 'Le combo complet — coupe et barbe',icon: '✨', active: true },
];

const FALLBACK_SCHEDULE = [
  { day: 'Lundi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Mardi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Mercredi', open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Jeudi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Vendredi', open: null,    close: null,    breakStart: null, breakEnd: null, active: false },
  { day: 'Samedi',   open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Dimanche', open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
];

// ── Fetch avec cache stale-while-revalidate ───────────────────
// Retourne immédiatement la valeur en cache (ou le fallback),
// puis recharge l'API en arrière-plan et met à jour le cache.
async function fetchWithCache(cacheKey, apiFn, fallback, onUpdate) {
  const cached = cacheGet(cacheKey);

  if (cached) {
    // Revalidation en arrière-plan (sans bloquer l'UI)
    apiFn().then(fresh => {
      cacheSet(cacheKey, fresh);
      if (onUpdate) onUpdate(fresh);
    }).catch(() => { /* réseau indisponible, on garde le cache */ });
    return cached;
  }

  // Pas de cache → attendre la réponse API
  try {
    const data = await apiFn();
    cacheSet(cacheKey, data);
    return data;
  } catch {
    return fallback;
  }
}

// ── GET /shop ──────────────────────────────────────────────────
export async function getShopInfo(onUpdate) {
  return fetchWithCache('shop', () => fetchGet({ action: 'shop' }), FALLBACK_SHOP, onUpdate);
}

// ── GET /services ──────────────────────────────────────────────
export async function getServices(onUpdate) {
  return fetchWithCache('services', () => fetchGet({ action: 'services' }), FALLBACK_SERVICES, onUpdate);
}

// ── GET /schedule ──────────────────────────────────────────────
export async function getSchedule(onUpdate) {
  return fetchWithCache('schedule', () => fetchGet({ action: 'schedule' }), FALLBACK_SCHEDULE, onUpdate);
}

// ── GET /availability ──────────────────────────────────────────
export async function getAvailability(date, serviceId) {
  return fetchGet({ action: 'availability', date, serviceId });
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

// ── GET /appointment_status (suivi client) ──
export async function getAppointmentStatus(phone, id) {
  try {
    const res = await fetchGet({ action: 'appointment_status', phone: phone || '', id: id || '' });
    if (Array.isArray(res)) return res;
    if (res && (res.appointments || res.id)) return res.appointments || [res];
  } catch (e) {
    console.warn('appointment_status API fallback', e);
  }

  // Fallback : récupérer les rendez-vous et filtrer côté client
  try {
    const all = await fetchGet({ action: 'appointments' });
    if (Array.isArray(all)) {
      const cleanQPhone = String(phone || '').replace(/\D/g, '');
      const cleanQId = String(id || '').trim();
      return all.filter(a => {
        const aPhone = String(a.clientPhone || '').replace(/\D/g, '');
        const aId = String(a.id || '').trim();
        if (cleanQId && aId === cleanQId) return true;
        if (cleanQPhone && cleanQPhone.length >= 6 && (aPhone.includes(cleanQPhone) || cleanQPhone.includes(aPhone))) return true;
        return false;
      });
    }
  } catch (err) {
    console.error('getAppointmentStatus error', err);
  }
  return [];
}
