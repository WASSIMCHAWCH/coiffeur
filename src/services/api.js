// =============================================
// API Service — GAR3A
// Communicates with Google Apps Script Web App
// =============================================

import { STATIC_SERVICES } from '../data/services.js';

const API_URL = import.meta.env.VITE_API_URL;

// ── Cache localStorage (stale-while-revalidate) ──────────────
const CACHE_TTL = {
  services: 30 * 60 * 1000, // 30 min (les services changent rarement)
  schedule: 30 * 60 * 1000, // 30 min (les horaires changent rarement)
  shop:      10 * 60 * 1000, // 10 min
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
// Retourne IMMÉDIATEMENT le cache (s'il existe) ou le fallback,
// puis recharge l'API en arrière-plan silencieusement.
// → Plus jamais de squelettes sur la page services !
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
  // On lance la requête API en arrière-plan et on met à jour dès
  // qu'elle répond (cold start GAS peut prendre 3-8s, pas question
  // de bloquer l'affichage en attendant).
  apiFn().then(fresh => {
    cacheSet(cacheKey, fresh);
    if (onUpdate) onUpdate(fresh);
  }).catch(() => { /* silencieux */ });

  // Retourner le fallback tout de suite → affichage instantané
  return fallback;
}

// ── GET /shop ──────────────────────────────────────────────────
export async function getShopInfo(onUpdate) {
  return fetchWithCache('shop', () => fetchGet({ action: 'shop' }), FALLBACK_SHOP, onUpdate);
}

// ── GET /services ──────────────────────────────────────────────
// Architecture hybride :
// 1. Retourne TOUJOURS STATIC_SERVICES immédiatement (0ms, 5 services garantis)
// 2. GAS est appelé en background pour sync Sheets → fusionne avec le statique
//    (GAS peut mettre à jour/ajouter mais ne peut pas SUPPRIMER les services statiques)
// 3. Cache versionnée 'services_v2' pour invalider l'ancien cache GAS (3 services)
export async function getServices(onUpdate) {
  // Toujours afficher le statique immédiatement
  const staticActive = STATIC_SERVICES.filter(s => s.active);

  // Fusion : STATIC_SERVICES est la base, GAS peut mettre à jour ou ajouter
  // mais jamais supprimer un service statique (S004, S005 toujours présents)
  function mergeWithStatic(gasServices) {
    if (!Array.isArray(gasServices) || gasServices.length === 0) return staticActive;
    const merged = [...STATIC_SERVICES];
    gasServices.forEach(gasSvc => {
      const idx = merged.findIndex(s => s.id === gasSvc.id);
      if (idx >= 0) {
        // GAS met à jour un service existant (durée, nom, description…)
        merged[idx] = { ...merged[idx], ...gasSvc };
      } else {
        // GAS ajoute un nouveau service inconnu du statique
        merged.push(gasSvc);
      }
    });
    return merged.filter(s => s.active);
  }

  // Clé 'services_v2' pour invalider l'ancien cache GAS (qui n'avait que 3 services)
  const cached = cacheGet('services_v2');

  if (cached) {
    // Background revalidation depuis GAS
    fetchGet({ action: 'services' })
      .then(fresh => {
        const merged = mergeWithStatic(fresh);
        cacheSet('services_v2', merged);
        if (onUpdate) onUpdate(merged);
      })
      .catch(() => { /* GAS indisponible, cache conservé */ });
    // Retourner le cache fusionné (toujours >= 5 services)
    return cached.filter(s => s.active);
  } else {
    // Pas de cache : afficher statique immédiatement, sync GAS en background
    fetchGet({ action: 'services' })
      .then(fresh => {
        const merged = mergeWithStatic(fresh);
        cacheSet('services_v2', merged);
        if (onUpdate) onUpdate(merged);
      })
      .catch(() => { /* GAS en cold start ou indisponible */ });
    return staticActive;
  }
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
