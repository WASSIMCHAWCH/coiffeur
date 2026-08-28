/**
 * ============================================================
 * GAR3A — Google Apps Script Backend
 * Mohamed Hechi (Gar3a) — Salon de coiffure & Barber
 * ============================================================
 * 
 * INSTALLATION :
 * 1. Allez sur https://script.google.com
 * 2. Créez un nouveau projet → collez ce code
 * 3. Remplacez SPREADSHEET_ID par l'ID de votre Google Sheet
 * 4. Déployer → Nouvelle déploiement → Application Web
 *    - Exécuter en tant que : Moi
 *    - Accès : Tout le monde
 * 5. Copiez l'URL de déploiement dans le .env du projet React
 * ============================================================
 */

// ── Configuration ──────────────────────────────────────────
const SPREADSHEET_ID = '1tQPBPGtcZ3VZq72QAjHjLYPwmLixMH6L6Xgr9Ss-a7M';
const SLOT_STEP_MINUTES = 30; // Intervalle entre créneaux

// ── Point d'entrée GET ─────────────────────────────────────
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action || '';
  
  try {
    switch (action) {
      case 'shop':
        return jsonResponse(getShop());
      case 'services':
        return jsonResponse(getServices());
      case 'availability':
        return jsonResponse(getAvailability(params.date, params.serviceId));
      case 'appointments':
        return jsonResponse(getAppointments(params.date));
      case 'schedule':
        return jsonResponse(getSchedule());
      default:
        return jsonResponse({ status: 'ok', message: 'GAR3A API v1.0' });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

// ── Point d'entrée POST ────────────────────────────────────
function doPost(e) {
  const contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  const body = JSON.parse(contents);
  const action = body.action || '';
  
  try {
    switch (action) {
      case 'book':
        return jsonResponse(createAppointment(body));
      case 'cancel':
        return jsonResponse(cancelAppointment(body.appointmentId));
      case 'update_status':
        return jsonResponse(updateAppointmentStatus(body.appointmentId, body.status));
      default:
        return jsonResponse({ status: 'error', message: 'Action inconnue' }, 400);
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

// ── CORS + JSON response ────────────────────────────────────
function jsonResponse(data, code = 200) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── Accès aux feuilles ──────────────────────────────────────
function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  return ss.getSheetByName(name);
}

// ── Menu personnalisé dans Google Sheets ────────────────────
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('💈 GAR3A')
      .addItem('🚀 Initialiser les feuilles (1-Clic)', 'initSpreadsheet')
      .addToUi();
  } catch (e) {}
}

// ── GET /shop ───────────────────────────────────────────────
function getShop() {
  const sheet = getSheet('Shop');
  const data  = sheet.getDataRange().getValues();
  const shop  = {};
  data.forEach(([key, value]) => {
    if (key) shop[key.toLowerCase()] = value;
  });
  return shop;
}

// ── GET /services ───────────────────────────────────────────
function getServices() {
  const sheet = getSheet('Services');
  const [headers, ...rows] = sheet.getDataRange().getValues();
  
  return rows
    .filter(row => row[0]) // Exclure lignes vides
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h.toLowerCase()] = row[i]);
      return {
        id:          obj.id,
        name:        obj.name,
        duration:    parseInt(obj.duration) || 30,
        description: obj.description || '',
        active:      obj.active === true || obj.active === 'TRUE' || obj.active === 1,
        icon:        obj.icon || '',
      };
    })
    .filter(s => s.active);
}

// ── GET /schedule ───────────────────────────────────────────
function getSchedule() {
  const sheet = getSheet('Schedule');
  const [headers, ...rows] = sheet.getDataRange().getValues();
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.toLowerCase()] = row[i]);
    return {
      day:        obj.day,
      open:       formatTimeStr(obj.open),
      close:      formatTimeStr(obj.close),
      breakStart: formatTimeStr(obj.break_start),
      breakEnd:   formatTimeStr(obj.break_end),
      active:     obj.active === true || obj.active === 'TRUE' || obj.active === 1 || String(obj.active).toLowerCase() === 'true',
    };
  });
}

// ── GET /availability ───────────────────────────────────────
function getAvailability(date, serviceId) {
  if (!date) throw new Error('Paramètre date manquant');
  
  // 1. Récupérer le service
  const services = getServices();
  const service  = services.find(s => s.id === serviceId);
  const duration = service ? service.duration : 30;
  
  // 2. Vérifier si date bloquée
  const blocked = getSheet('BlockedDates').getDataRange().getValues();
  const blockedList = blocked.slice(1).map(r => r[0]).filter(Boolean);
  if (blockedList.includes(date)) {
    return { date, availableSlots: [], allSlots: [], blocked: true };
  }
  
  // 3. Récupérer les horaires du jour
  const dateObj    = new Date(date + 'T12:00:00');
  const dayIndex   = (dateObj.getDay() + 6) % 7; // 0=Lun
  const schedule   = getSchedule();
  const daySchedule = schedule[dayIndex];
  
  if (!daySchedule || !daySchedule.active) {
    return { date, availableSlots: [], allSlots: [], closed: true };
  }
  
  // 4. Générer tous les créneaux du jour
  const allSlots = generateSlots(
    daySchedule.open,
    daySchedule.close,
    daySchedule.breakStart,
    daySchedule.breakEnd,
    duration
  );
  
  // 5. Récupérer les RDV du jour
  const appts = getAppointmentsByDate(date);
  
  // 6. Filtrer les créneaux occupés
  const availableSlots = allSlots.filter(slot => {
    return !appts.some(a => {
      if (a.status === 'CANCELLED') return false;
      const slotStart = timeToMinutes(slot);
      const slotEnd   = slotStart + duration;
      const apptStart = timeToMinutes(a.startTime);
      const apptEnd   = timeToMinutes(a.endTime);
      // Vérifier chevauchement
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  });
  
  return { date, availableSlots, allSlots, duration };
}

// ── POST /book ──────────────────────────────────────────────
function createAppointment(data) {
  const { date, time, endTime, serviceId, serviceName, clientName, clientPhone } = data;
  
  // Validation
  if (!date || !time || !serviceId || !clientName || !clientPhone) {
    return { status: 'error', message: 'Données manquantes' };
  }
  
  // Vérification service
  const services = getServices();
  const service  = services.find(s => s.id === serviceId);
  if (!service) return { status: 'error', message: 'Service introuvable' };
  
  const calculatedEnd = endTime || minutesToTime(timeToMinutes(time) + service.duration);
  
  // ⚡ LockService — Anti-double réservation
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Attendre 10s max
  } catch (e) {
    return { status: 'error', code: 'LOCK_TIMEOUT', message: 'Serveur occupé, réessayez.' };
  }
  
  try {
    // Vérifier disponibilité DANS le verrou
    const avail = getAvailability(date, serviceId);
    if (!avail.availableSlots.includes(time)) {
      return { status: 'error', code: 'SLOT_ALREADY_BOOKED', message: 'Ce créneau vient d\'être réservé.' };
    }
    
    // Enregistrer dans Sheets
    const sheet = getSheet('Appointments');
    const id    = 'A' + Date.now();
    const now   = new Date().toISOString();
    
    sheet.appendRow([
      id, date, time, calculatedEnd,
      clientName.trim(), clientPhone.trim(),
      serviceId, serviceName,
      'CONFIRMED', now
    ]);
    
    return {
      status:      'success',
      id,
      date,
      startTime:   time,
      endTime:     calculatedEnd,
      serviceId,
      serviceName,
      clientName:  clientName.trim(),
      clientPhone: clientPhone.trim(),
      status2:     'CONFIRMED',
    };
    
  } finally {
    lock.releaseLock();
  }
}

// ── GET /appointments (admin) ───────────────────────────────
function getAppointments(date) {
  const appts = getAppointmentsByDate(date);
  return appts;
}

// Formate n'importe quel type Google Sheet (Date, String) en "YYYY-MM-DD"
function formatDateToISOStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return str;
}

function getAppointmentsByDate(date) {
  const sheet = getSheet('Appointments');
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const targetDateISO = date ? formatDateToISOStr(date) : '';
  
  return rows
    .filter(row => {
      if (!row[0] || row[0] === 'ID') return false; // Exclure header et lignes vides
      if (!targetDateISO) return true; // Tout renvoyer si pas de filtre
      const rowDateISO = formatDateToISOStr(row[1]);
      return rowDateISO === targetDateISO;
    })
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h.toLowerCase()] = row[i]);
      return {
        id:          String(obj.id),
        date:        formatDateToISOStr(obj.date),
        startTime:   formatTimeStr(obj.start_time),
        endTime:     formatTimeStr(obj.end_time),
        clientName:  String(obj.client_name || ''),
        clientPhone: String(obj.client_phone || ''),
        serviceId:   String(obj.service_id || ''),
        serviceName: String(obj.service_name || ''),
        status:      String(obj.status || 'CONFIRMED'),
        createdAt:   String(obj.created_at || ''),
      };
    });
}

// ── POST /cancel ────────────────────────────────────────────
function cancelAppointment(appointmentId) {
  return updateAppointmentStatus(appointmentId, 'CANCELLED');
}

// ── POST /update_status ─────────────────────────────────────
function updateAppointmentStatus(appointmentId, newStatus) {
  const validStatus = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];
  if (!validStatus.includes(newStatus)) {
    return { status: 'error', message: 'Statut invalide' };
  }
  
  const sheet = getSheet('Appointments');
  const data  = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === appointmentId) {
      sheet.getRange(i + 1, 9).setValue(newStatus); // Colonne STATUS (9ème)
      return { status: 'success', id: appointmentId, newStatus: newStatus };
    }
  }
  return { status: 'error', message: 'Rendez-vous introuvable' };
}

// ── Helpers ─────────────────────────────────────────────────

// Formate n'importe quel type Google Sheet (Date, String, Number) en "HH:MM"
function formatTimeStr(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  const str = String(val).trim();
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  }
  return str;
}

// Convertit n'importe quel format d'heure en minutes depuis 00:00
function timeToMinutes(time) {
  if (!time) return 0;
  if (time instanceof Date) {
    return time.getHours() * 60 + time.getMinutes();
  }
  if (typeof time === 'number' && time <= 1) {
    return Math.round(time * 24 * 60);
  }
  const str = String(time).trim();
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  return 0;
}

// 570 → "09:30"
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// Génère les créneaux entre open/close en excluant la pause
function generateSlots(open, close, breakStart, breakEnd, duration) {
  const openTime  = open ? formatTimeStr(open) : '09:00';
  const closeTime = close ? formatTimeStr(close) : '21:00';
  
  const slots  = [];
  const openM  = timeToMinutes(openTime);
  const closeM = timeToMinutes(closeTime);
  const bsM    = breakStart ? timeToMinutes(formatTimeStr(breakStart)) : null;
  const beM    = breakEnd   ? timeToMinutes(formatTimeStr(breakEnd))   : null;
  
  let current = openM;
  while (current + duration <= closeM) {
    const end = current + duration;
    const inBreak = bsM !== null && beM !== null && current < beM && end > bsM;
    
    if (!inBreak) {
      slots.push(minutesToTime(current));
    }
    current += SLOT_STEP_MINUTES;
  }
  return slots;
}

/**
 * ============================================================
 * FONCTION D'INITIALISATION AUTOMATIQUE DU GOOGLE SHEET (1-CLIC)
 * ============================================================
 * Pour créer toutes les feuilles et données initiales :
 * 1. Ouvrez ce script dans script.google.com
 * 2. Mettez votre SPREADSHEET_ID tout en haut
 * 3. Sélectionnez 'initSpreadsheet' dans le menu déroulant en haut
 * 4. Cliquez sur 'Exécuter' (Run)
 */
function initSpreadsheet() {
  const ss = getSpreadsheet();
  
  // 1. Feuille Shop
  let shopSheet = ss.getSheetByName('Shop');
  if (!shopSheet) shopSheet = ss.insertSheet('Shop');
  shopSheet.clear();
  shopSheet.appendRow(['KEY', 'VALUE']);
  shopSheet.appendRow(['name', 'Mohamed Hechi']);
  shopSheet.appendRow(['brand', 'Gar3a']);
  shopSheet.appendRow(['type', 'Barber']);
  shopSheet.appendRow(['phone', '+216 70 000 000']);
  shopSheet.appendRow(['whatsapp', '21670000000']);
  shopSheet.appendRow(['latitude', 36.352722]);
  shopSheet.appendRow(['longitude', 10.209417]);
  shopSheet.appendRow(['address', 'Hammam Zriba, Zaghouan, Tunisie']);
  shopSheet.appendRow(['description', 'Bienvenue chez Mohamed Hechi (Gar3a). Coiffeur & Barber professionnel.']);

  // 2. Feuille Services
  let svcSheet = ss.getSheetByName('Services');
  if (!svcSheet) svcSheet = ss.insertSheet('Services');
  svcSheet.clear();
  svcSheet.appendRow(['ID', 'NAME', 'DURATION', 'DESCRIPTION', 'ICON', 'ACTIVE']);
  svcSheet.appendRow(['S001', 'Coupe', 30, 'Coupe de cheveux professionnelle', '✂️', true]);
  svcSheet.appendRow(['S002', 'Barbe', 20, 'Taille et soin de la barbe', '🧔', true]);
  svcSheet.appendRow(['S003', 'Coupe + Barbe', 45, 'Le combo complet — coupe et barbe', '✨', true]);

  // 3. Feuille Schedule (Horaires 09:00 - 21:00, Vendredi repos)
  let schSheet = ss.getSheetByName('Schedule');
  if (!schSheet) schSheet = ss.insertSheet('Schedule');
  schSheet.clear();
  schSheet.appendRow(['DAY', 'OPEN', 'CLOSE', 'BREAK_START', 'BREAK_END', 'ACTIVE']);
  schSheet.appendRow(['Lundi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Mardi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Mercredi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Jeudi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Vendredi', '', '', '', '', false]); // Repos
  schSheet.appendRow(['Samedi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Dimanche', '09:00', '21:00', '', '', true]);

  // 4. Feuille Appointments
  let apptSheet = ss.getSheetByName('Appointments');
  if (!apptSheet) apptSheet = ss.insertSheet('Appointments');
  if (apptSheet.getLastRow() === 0) {
    apptSheet.appendRow(['ID', 'DATE', 'START_TIME', 'END_TIME', 'CLIENT_NAME', 'CLIENT_PHONE', 'SERVICE_ID', 'SERVICE_NAME', 'STATUS', 'CREATED_AT']);
  }

  // 5. Feuille BlockedDates
  let blockSheet = ss.getSheetByName('BlockedDates');
  if (!blockSheet) blockSheet = ss.insertSheet('BlockedDates');
  if (blockSheet.getLastRow() === 0) {
    blockSheet.appendRow(['DATE', 'REASON']);
  }

  Logger.log('✅ Google Sheet initialisé avec succès pour GAR3A !');
}
