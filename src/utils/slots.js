// =============================================
// Logique avancée de calcul des créneaux — GAR3A
// Gère les sous-créneaux (10/20 min), les périodes
// occupées en gris, et la fermeture globale.
// =============================================
import { formatDateISO } from './date.js';

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calcule tous les créneaux et sous-créneaux disponibles et occupés pour une date donnée.
 *
 * @param {Object} options
 * @param {string} options.selectedDate - Date au format 'YYYY-MM-DD'
 * @param {number} options.serviceDuration - Durée du service sélectionné en minutes (10, 20, 30, 45, etc.)
 * @param {Array} options.appointments - Liste des RDV existants [{ startTime, endTime, status, duration }]
 * @param {Object} options.daySchedule - Horaires du jour { open, close, breakStart, breakEnd, active }
 * @param {boolean} options.allSlotsClosed - Si vrai, TOUS les créneaux sont verrouillés en gris
 * @returns {Array<{ time: string, available: boolean, partial: boolean, label: string }>}
 */
export function computeTimeSlots({
  selectedDate,
  serviceDuration = 30,
  appointments = [],
  daySchedule = null,
  allSlotsClosed = false,
}) {
  const openTimeStr = daySchedule?.open || '09:00';
  const closeTimeStr = daySchedule?.close || '21:00';
  const openM = timeToMinutes(openTimeStr);
  const closeM = timeToMinutes(closeTimeStr);
  const breakStartM = daySchedule?.breakStart ? timeToMinutes(daySchedule.breakStart) : null;
  const breakEndM = daySchedule?.breakEnd ? timeToMinutes(daySchedule.breakEnd) : null;

  const now = new Date();
  const todayISO = formatDateISO(now);
  const isToday = selectedDate === todayISO;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Si tous les créneaux sont fermés via le dashboard coiffeur ou jour non actif
  if (allSlotsClosed || daySchedule?.active === false) {
    const slots = [];
    for (let m = openM; m < closeM; m += 30) {
      slots.push({
        time: minutesToTime(m),
        available: false,
        partial: false,
        label: 'Fermé',
      });
    }
    return slots;
  }

  // 2. Préparer les rendez-vous actifs du jour en minutes
  const activeAppts = (appointments || [])
    .filter(a => a && a.status !== 'CANCELLED')
    .map(a => {
      const start = timeToMinutes(a.startTime);
      let end = a.endTime ? timeToMinutes(a.endTime) : (start + (Number(a.duration) || 30));
      if (end <= start) end = start + 30; // Sécurité
      return { start, end, ...a };
    })
    .sort((a, b) => a.start - b.start);

  const resultSlots = [];

  // Parcourir chaque bloc de 30 minutes de la journée
  for (let blockStart = openM; blockStart < closeM; blockStart += 30) {
    const blockEnd = Math.min(blockStart + 30, closeM);

    // Pause déjeuner éventuelle
    if (breakStartM !== null && breakEndM !== null && blockStart < breakEndM && blockEnd > breakStartM) {
      resultSlots.push({
        time: minutesToTime(blockStart),
        available: false,
        partial: false,
        label: 'Pause',
      });
      continue;
    }

    // Trouver les RDV qui chevauchent ce bloc de 30 minutes
    const overlapping = activeAppts.filter(a => a.start < blockEnd && a.end > blockStart);

    if (overlapping.length === 0) {
      // ── BLOC 100% LIBRE ──
      const isPast = isToday && blockStart <= currentMinutes;
      // Vérifier si le service sélectionné dépasse l'heure de fermeture ou chevauche un RDV ultérieur
      const serviceEnd = blockStart + serviceDuration;
      const exceedsClose = serviceEnd > closeM;
      const overlapsLater = activeAppts.some(a => a.start < serviceEnd && a.end > blockStart);

      const available = !isPast && !exceedsClose && !overlapsLater;
      let label = null;
      if (isPast) label = 'Passé';
      else if (!available) label = 'Complet';

      resultSlots.push({
        time: minutesToTime(blockStart),
        available,
        partial: false,
        label,
      });
    } else {
      // ── BLOC PARTIELLEMENT OU TOTALEMENT OCCUPÉ ──
      // Prenons le 1er RDV qui intersecte ce bloc
      const appt = overlapping[0];

      // Cas 1 : Le RDV commence au début du bloc (ex: 09:00 - 09:10 ou 09:00 - 09:20)
      if (appt.start <= blockStart) {
        const apptEndInBlock = Math.min(appt.end, blockEnd);
        const occupiedMins = apptEndInBlock - blockStart;

        // Période réellement occupée → affichée en GRIS
        const occLabel = occupiedMins < 30 ? `Pris (${occupiedMins} min)` : 'Pris';
        resultSlots.push({
          time: minutesToTime(blockStart),
          available: false,
          partial: false,
          label: occLabel,
        });

        // Si le RDV se termine avant la fin du bloc de 30 min (ex: se termine à 09:10 ou 09:20)
        if (appt.end < blockEnd) {
          const remStart = appt.end;
          const remDuration = blockEnd - remStart;
          const isRemPast = isToday && remStart <= currentMinutes;

          // Si le service demandé tient dans le temps restant de ce créneau
          const canFit = serviceDuration <= remDuration;
          const available = !isRemPast && canFit;

          let remLabel = `${remDuration} min dispo`;
          if (isRemPast) remLabel = 'Passé';
          else if (!canFit) remLabel = `${remDuration} min max`;

          resultSlots.push({
            time: minutesToTime(remStart),
            available,
            partial: true,
            label: remLabel,
          });
        }
      } else {
        // Cas 2 : Le RDV commence plus tard dans le bloc (ex: 09:10 - 09:30)
        // La 1ère partie est libre (ex: 09:00 - 09:10)
        const freeStart = blockStart;
        const freeDuration = appt.start - freeStart;
        const isFreePast = isToday && freeStart <= currentMinutes;
        const canFit = serviceDuration <= freeDuration;
        const available = !isFreePast && canFit;

        let freeLabel = `${freeDuration} min dispo`;
        if (isFreePast) freeLabel = 'Passé';
        else if (!canFit) freeLabel = `${freeDuration} min max`;

        resultSlots.push({
          time: minutesToTime(freeStart),
          available,
          partial: true,
          label: freeLabel,
        });

        // La période occupée ensuite → affichée en GRIS
        const occupiedMins = Math.min(appt.end, blockEnd) - appt.start;
        resultSlots.push({
          time: minutesToTime(appt.start),
          available: false,
          partial: false,
          label: `Pris (${occupiedMins} min)`,
        });
      }
    }
  }

  return resultSlots;
}
