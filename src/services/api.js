// =============================================
// API Service — GAR3A
// Communicates with Google Apps Script Web App
// =============================================

import { STATIC_SERVICES } from '../data/services.js';
import { formatDateISO } from '../utils/date.js';

const API_URL = import.meta.env.VITE_API_URL;

// ── Cache localStorage (stale-while-revalidate) ──────────────
const CACHE_TTL = {
  services:    30 * 60 * 1000, // 30 min
  services_v2: 30 * 60 * 1000,
  schedule:    30 * 60 * 1000,
  schedule_v2: 30 * 60 * 1000,
  shop:        10 * 60 * 1000, // 10 min
  appts:        2 * 60 * 1000, // 2 min pour les créneaux/rendez-vous
};

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(`gar3a_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    const ttl = (key.startsWith('appts_') || key.startsWith('avail_'))
      ? CACHE_TTL.appts
      : (CACHE_TTL[key] ?? 5 * 60 * 1000);
    if (Date.now() - ts > ttl) return null; // expiré
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(`gar3a_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota dépassé, on ignore */ }
}

export function invalidateAppointmentsCache(date) {
  try {
    if (date) {
      localStorage.removeItem(`gar3a_cache_appts_${date}`);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`gar3a_cache_avail_${date}`)) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {}
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

// Horaires par défaut synchronisés avec Google Sheets :
// Lundi = Repos (fermé), Mardi à Dimanche = Ouvert (09:00 - 21:00)
// Vendredi est bien OUVERT !
const FALLBACK_SCHEDULE = [
  { day: 'Lundi',    open: null,    close: null,    breakStart: null, breakEnd: null, active: false },
  { day: 'Mardi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Mercredi', open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Jeudi',    open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Vendredi', open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Samedi',   open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
  { day: 'Dimanche', open: '09:00', close: '21:00', breakStart: null, breakEnd: null, active: true  },
];

// ── Fetch avec cache stale-while-revalidate ───────────────────
// Retourne IMMÉDIATEMENT le cache (s'il existe) ou le fallback,
// puis recharge l'API en arrière-plan silencieusement.
async function fetchWithCache(cacheKey, apiFn, fallback, onUpdate) {
  const cached = cacheGet(cacheKey);

  // ── Cas 1 : cache valide ────────────────────────────────────
  if (cached) {
    // Revalidation en arrière-plan (sans bloquer l'UI)
    apiFn().then(fresh => {
      cacheSet(cacheKey, fresh);
      if (onUpdate) onUpdate(fresh);
    }).catch(() => { /* réseau ou cold start, on garde le cache */ });
    return cached;
  }

  // ── Cas 2 : pas de cache → afficher FALLBACK immédiatement ──
  apiFn().then(fresh => {
    cacheSet(cacheKey, fresh);
    if (onUpdate) onUpdate(fresh);
  }).catch(() => { /* silencieux */ });

  return fallback;
}

// ── GET /shop ──────────────────────────────────────────────────
export async function getShopInfo(onUpdate) {
  return fetchWithCache('shop', () => fetchGet({ action: 'shop' }), FALLBACK_SHOP, onUpdate);
}

// ── GET /services ──────────────────────────────────────────────
export async function getServices(onUpdate) {
  const staticActive = STATIC_SERVICES.filter(s => s.active);

  function mergeWithStatic(gasServices) {
    if (!Array.isArray(gasServices) || gasServices.length === 0) return staticActive;
    const merged = [...STATIC_SERVICES];
    gasServices.forEach(gasSvc => {
      const idx = merged.findIndex(s => s.id === gasSvc.id);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...gasSvc };
      } else {
        merged.push(gasSvc);
      }
    });
    return merged.filter(s => s.active);
  }

  const cached = cacheGet('services_v2');

  if (cached) {
    fetchGet({ action: 'services' })
      .then(fresh => {
        const merged = mergeWithStatic(fresh);
        cacheSet('services_v2', merged);
        if (onUpdate) onUpdate(merged);
      })
      .catch(() => {});
    return cached.filter(s => s.active);
  } else {
    fetchGet({ action: 'services' })
      .then(fresh => {
        const merged = mergeWithStatic(fresh);
        cacheSet('services_v2', merged);
        if (onUpdate) onUpdate(merged);
      })
      .catch(() => {});
    return staticActive;
  }
}

// ── GET /schedule ──────────────────────────────────────────────
export async function getSchedule(onUpdate) {
  return fetchWithCache('schedule_v2', () => fetchGet({ action: 'schedule' }), FALLBACK_SCHEDULE, onUpdate);
}

// ── GET /availability ──────────────────────────────────────────
export async function getAvailability(date, serviceId) {
  if (!date) return null;
  const cacheKey = `avail_${date}_${serviceId || ''}`;
  const cached = cacheGet(cacheKey);

  if (cached) {
    fetchGet({ action: 'availability', date, serviceId })
      .then(fresh => {
        if (fresh && (fresh.allSlots || fresh.availableSlots)) {
          cacheSet(cacheKey, fresh);
        }
      })
      .catch(() => {});
    return cached;
  }

  try {
    const fresh = await fetchGet({ action: 'availability', date, serviceId });
    if (fresh && (fresh.allSlots || fresh.availableSlots)) {
      cacheSet(cacheKey, fresh);
    }
    return fresh;
  } catch {
    return null;
  }
}

// ── GET /appointments (admin & calcul créneaux) ────────────────
export async function getAppointments(date) {
  if (!date) return [];
  const cacheKey = `appts_${date}`;
  const cached = cacheGet(cacheKey);

  if (cached) {
    fetchGet({ action: 'appointments', date })
      .then(fresh => {
        if (Array.isArray(fresh)) cacheSet(cacheKey, fresh);
      })
      .catch(() => {});
    return cached;
  }

  try {
    const fresh = await fetchGet({ action: 'appointments', date });
    if (Array.isArray(fresh)) {
      cacheSet(cacheKey, fresh);
      return fresh;
    }
    return [];
  } catch {
    return [];
  }
}

// ── Préchargement déclenché à l'ouverture du site web ──────────
// Évite toute attente lorsque le client ouvre le calendrier
export function preloadBookingData() {
  try {
    // 1. Horaires & Services en cache immédiat
    getSchedule().catch(() => {});
    getServices().catch(() => {});

    // 2. Précharger les rendez-vous des 7 prochains jours
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateISO = formatDateISO(d);
      getAppointments(dateISO).catch(() => {});
    }
  } catch {
    // Silencieux
  }
}

// ── POST /appointments ──────────────────────
export async function createAppointment(data) {
  let duration = data.duration;
  if (!duration && data.time && data.endTime) {
    const [sh, sm] = String(data.time).split(':').map(Number);
    const [eh, em] = String(data.endTime).split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) duration = diff;
  }

  const payload = {
    action: 'book',
    ...data,
    duration: duration || 30,
  };

  let res = await fetchPost(payload);

  // Sécurité compatibilité immédiate :
  // Si le script Apps Script actuel ne reconnaît pas encore S005 ou S_FAMILLE dans la feuille Google Sheets
  // et renvoie "Service introuvable", on retente immédiatement avec un ID de service reconnu (S003)
  // tout en conservant le nom réel, l'heure de fin et la durée exacte !
  if (res?.status === 'error' && (
    res?.message?.includes('introuvable') ||
    res?.message?.includes('Service introuvable') ||
    res?.message?.toLowerCase().includes('service')
  )) {
    try {
      const fallbackRes = await fetchPost({
        ...payload,
        serviceId: 'S003',
      });
      if (fallbackRes && fallbackRes.status !== 'error') {
        res = fallbackRes;
      }
    } catch (e) {
      console.warn('Fallback booking error:', e);
    }
  }

  if (data?.date) {
    invalidateAppointmentsCache(data.date);
  }
  return res;
}

// ── POST /cancel ────────────────────────────
export async function cancelAppointment(appointmentId, date) {
  const res = await fetchPost({ action: 'cancel', appointmentId });
  if (date) {
    invalidateAppointmentsCache(date);
  }
  return res;
}

// ── POST /status ────────────────────────────
export async function updateAppointmentStatus(appointmentId, status, date) {
  const res = await fetchPost({ action: 'update_status', appointmentId, status });
  if (date) {
    invalidateAppointmentsCache(date);
  }
  return res;
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
