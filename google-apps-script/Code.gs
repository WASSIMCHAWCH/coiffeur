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
const SLOT_STEP_MINUTES = 10; // Intervalle entre créneaux (support des services 10/20/30 min)

// Services officiels du salon (synchronisés avec le site web React)
const DEFAULT_SERVICES = [
  { id: 'S001', name: 'Coupe', duration: 20, description: 'Coupe de cheveux professionnelle', icon: '✂️', active: true },
  { id: 'S002', name: 'Barbe', duration: 15, description: 'Taille et soin de la barbe', icon: '🧔', active: true },
  { id: 'S003', name: 'Coupe + Barbe', duration: 35, description: 'Le combo complet — coupe et barbe', icon: '✨', active: true },
  { id: 'S004', name: 'Brushing', duration: 10, description: 'Brushing rapide et mise en forme', icon: '💨', active: true },
  { id: 'S005', name: 'Coupe + Barbe + Brushing', duration: 45, description: 'La formule complète : coupe, barbe et brushing', icon: '💈', active: true },
  { id: 'S_FAMILLE', name: 'Formule Famille', duration: 35, description: 'Formule Famille (Père + Enfants)', icon: '👨‍👧‍👦', active: true },
];

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
      case 'sync_services':
        return jsonResponse(syncServicesToSheet());
      case 'availability':
        return jsonResponse(getAvailability(params.date, params.serviceId));
      case 'appointments':
        return jsonResponse(getAppointments(params.date));
      case 'schedule':
        return jsonResponse(getSchedule());
      case 'appointment_status':
        return jsonResponse(getAppointmentStatusByPhoneOrId(params.phone, params.id));
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

// ── Synchronisation automatique des services dans Google Sheets ────
function syncServicesToSheet() {
  try {
    const sheet = getSheet('Services');
    if (!sheet) return { status: 'error', message: 'Feuille Services introuvable' };
    const data = sheet.getDataRange().getValues();
    const existingIds = data.slice(1).map(r => String(r[0] || '').trim());
    let added = 0;
    DEFAULT_SERVICES.forEach(s => {
      if (!existingIds.includes(s.id)) {
        sheet.appendRow([s.id, s.name, s.duration, s.description, s.icon, s.active]);
        added++;
      }
    });
    return { status: 'success', added, total: DEFAULT_SERVICES.length };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// ── GET /services ───────────────────────────────────────────
function getServices() {
  const sheet = getSheet('Services');
  if (!sheet) return DEFAULT_SERVICES;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    syncServicesToSheet();
    return DEFAULT_SERVICES;
  }

  const [headers, ...rows] = data;
  const sheetServices = rows
    .filter(row => row[0]) // Exclure lignes vides
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h.toLowerCase()] = row[i]);
      return {
        id:          String(obj.id || '').trim(),
        name:        obj.name || '',
        duration:    parseInt(obj.duration) || 30,
        description: obj.description || '',
        active:      obj.active === true || obj.active === 'TRUE' || obj.active === 1 || String(obj.active).toLowerCase() === 'true',
        icon:        obj.icon || '',
      };
    })
    .filter(s => s.active);

  // Fusionner avec DEFAULT_SERVICES pour que S004, S005 et S_FAMILLE soient TOUJOURS disponibles
  const merged = [...sheetServices];
  let missingFound = false;
  DEFAULT_SERVICES.forEach(defSvc => {
    if (!merged.some(s => s.id === defSvc.id)) {
      merged.push(defSvc);
      missingFound = true;
    }
  });

  // Si des services manquaient dans la feuille, les inscrire en tâche de fond
  if (missingFound) {
    try {
      syncServicesToSheet();
    } catch (e) {}
  }

  return merged;
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
  let service  = services.find(s => s.id === serviceId);
  if (!service) service = DEFAULT_SERVICES.find(s => s.id === serviceId);
  const duration = service ? service.duration : 30;
  
  // 2. Vérifier si date bloquée
  const blockedSheet = getSheet('BlockedDates');
  if (blockedSheet) {
    const blocked = blockedSheet.getDataRange().getValues();
    const blockedList = blocked.slice(1).map(r => r[0]).filter(Boolean);
    if (blockedList.includes(date)) {
      return { date, availableSlots: [], allSlots: [], blocked: true };
    }
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
      const apptEnd   = a.endTime ? timeToMinutes(a.endTime) : (apptStart + 30);
      // Vérifier chevauchement
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  });
  
  return { date, availableSlots, allSlots, duration };
}

// ── POST /book ──────────────────────────────────────────────
function createAppointment(data) {
  const { date, time, endTime, duration, serviceId, serviceName, clientName, clientPhone } = data;
  
  // Validation
  if (!date || !time || !clientName || !clientPhone) {
    return { status: 'error', message: 'Données manquantes' };
  }
  
  // Vérification service (reconnaît sheet + DEFAULT_SERVICES + S_FAMILLE)
  const services = getServices();
  let service = services.find(s => s.id === serviceId);
  if (!service) {
    service = DEFAULT_SERVICES.find(s => s.id === serviceId);
  }
  // Si formule famille ou service customisé avec nom fourni
  if (!service && (serviceId === 'S_FAMILLE' || serviceName)) {
    service = {
      id: serviceId || 'S_CUSTOM',
      name: serviceName || 'Prestation Coiffure',
      duration: parseInt(duration) || 35,
    };
  }
  
  const finalDuration = parseInt(duration) || (service ? service.duration : 30);
  const calculatedEnd = endTime || minutesToTime(timeToMinutes(time) + finalDuration);
  const finalServiceName = serviceName || (service ? service.name : 'Coiffure');
  const finalServiceId = serviceId || (service ? service.id : 'S001');

  // ⚡ LockService — Anti-double réservation
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Attendre 10s max
  } catch (e) {
    return { status: 'error', code: 'LOCK_TIMEOUT', message: 'Serveur occupé, réessayez.' };
  }
  
  try {
    const reqStart = timeToMinutes(time);
    const reqEnd   = timeToMinutes(calculatedEnd);

    // 1. Vérifier si date bloquée
    const blockedSheet = getSheet('BlockedDates');
    if (blockedSheet) {
      const blocked = blockedSheet.getDataRange().getValues();
      const blockedList = blocked.slice(1).map(r => r[0]).filter(Boolean);
      if (blockedList.includes(date)) {
        return { status: 'error', code: 'DATE_BLOCKED', message: 'Cette date est fermée aux réservations.' };
      }
    }

    // 2. Vérifier horaires du jour
    const dateObj    = new Date(date + 'T12:00:00');
    const dayIndex   = (dateObj.getDay() + 6) % 7; // 0=Lun
    const schedule   = getSchedule();
    const daySchedule = schedule[dayIndex];
    if (!daySchedule || !daySchedule.active) {
      return { status: 'error', code: 'SHOP_CLOSED', message: 'Le salon est fermé ce jour-là.' };
    }

    // 3. Vérifier limites d'ouverture
    const openM  = timeToMinutes(daySchedule.open || '09:00');
    const closeM = timeToMinutes(daySchedule.close || '21:00');
    if (reqStart < openM || reqEnd > closeM) {
      return { status: 'error', code: 'OUT_OF_HOURS', message: 'Le créneau dépasse les heures d\'ouverture du salon.' };
    }

    // 4. Pause éventuelle
    if (daySchedule.breakStart && daySchedule.breakEnd) {
      const bsM = timeToMinutes(daySchedule.breakStart);
      const beM = timeToMinutes(daySchedule.breakEnd);
      if (reqStart < beM && reqEnd > bsM) {
        return { status: 'error', code: 'BREAK_TIME', message: 'Le créneau chevauche la pause du salon.' };
      }
    }

    // 5. Vérifier chevauchement direct avec RDV existants
    const appts = getAppointmentsByDate(date);
    const conflict = appts.some(a => {
      if (a.status === 'CANCELLED') return false;
      const aStart = timeToMinutes(a.startTime);
      let aEnd = a.endTime ? timeToMinutes(a.endTime) : (aStart + 30);
      if (aEnd <= aStart) aEnd = aStart + 30;
      return reqStart < aEnd && reqEnd > aStart;
    });

    if (conflict) {
      return { status: 'error', code: 'SLOT_ALREADY_BOOKED', message: 'Ce créneau vient d\'être réservé. Veuillez choisir un autre horaire.' };
    }
    
    // Enregistrer dans Sheets
    const sheet = getSheet('Appointments');
    const id    = 'A' + Date.now();
    const now   = new Date().toISOString();
    
    sheet.appendRow([
      id, date, time, calculatedEnd,
      clientName.trim(), clientPhone.trim(),
      finalServiceId, finalServiceName,
      'PENDING', now
    ]);
    
    return {
      status:      'success',
      id,
      date,
      startTime:   time,
      endTime:     calculatedEnd,
      serviceId:   finalServiceId,
      serviceName: finalServiceName,
      clientName:  clientName.trim(),
      clientPhone: clientPhone.trim(),
      status2:     'PENDING',
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
        status:      String(obj.status || 'PENDING'),
        createdAt:   String(obj.created_at || ''),
      };
    });
}

// ── GET /appointment_status (suivi client) ──────────────────
function getAppointmentStatusByPhoneOrId(phone, id) {
  const sheet = getSheet('Appointments');
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const cleanId = String(id || '').trim();

  return rows
    .filter(row => {
      if (!row[0] || row[0] === 'ID') return false;
      const rowId = String(row[0]).trim();
      const rowPhone = String(row[5] || '').replace(/\D/g, '');
      if (cleanId && rowId === cleanId) return true;
      if (cleanPhone && cleanPhone.length >= 6 && (rowPhone.includes(cleanPhone) || cleanPhone.includes(rowPhone))) return true;
      return false;
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
        status:      String(obj.status || 'PENDING'),
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
  const validStatus = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
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
  svcSheet.appendRow(['S001', 'Coupe', 20, 'Coupe de cheveux professionnelle', '✂️', true]);
  svcSheet.appendRow(['S002', 'Barbe', 15, 'Taille et soin de la barbe', '🧔', true]);
  svcSheet.appendRow(['S003', 'Coupe + Barbe', 35, 'Le combo complet — coupe et barbe', '✨', true]);
  svcSheet.appendRow(['S004', 'Brushing', 10, 'Brushing rapide et mise en forme', '💨', true]);
  svcSheet.appendRow(['S005', 'Coupe + Barbe + Brushing', 45, 'La formule complète : coupe, barbe et brushing', '💈', true]);
  svcSheet.appendRow(['S_FAMILLE', 'Formule Famille', 35, 'Formule Famille (Père + Enfants)', '👨‍👧‍👦', true]);

  // 3. Feuille Schedule (Horaires 09:00 - 21:00, Lundi repos, Vendredi ouvert)
  let schSheet = ss.getSheetByName('Schedule');
  if (!schSheet) schSheet = ss.insertSheet('Schedule');
  schSheet.clear();
  schSheet.appendRow(['DAY', 'OPEN', 'CLOSE', 'BREAK_START', 'BREAK_END', 'ACTIVE']);
  schSheet.appendRow(['Lundi', '', '', '', '', false]); // Repos
  schSheet.appendRow(['Mardi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Mercredi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Jeudi', '09:00', '21:00', '', '', true]);
  schSheet.appendRow(['Vendredi', '09:00', '21:00', '', '', true]);
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
