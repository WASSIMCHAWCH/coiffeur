// =============================================
// Utils — Date helpers (français, Tunisie)
// =============================================
import { format, isToday, isTomorrow, isPast, startOfDay, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

// Formate une date en français
export function formatDateFR(date) {
  return format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr });
}

// Formate une date courte
export function formatDateShort(date) {
  return format(new Date(date), 'd MMM yyyy', { locale: fr });
}

// Formate en YYYY-MM-DD pour l'API
export function formatDateISO(date) {
  return format(new Date(date), 'yyyy-MM-dd');
}

// Formate l'heure HH:mm
export function formatTime(date) {
  return format(new Date(date), 'HH:mm');
}

// Vérifie si une date est aujourd'hui
export { isToday, isTomorrow, isPast };

// Label relatif (Aujourd'hui / Demain / date normale)
export function getDateLabel(date) {
  const d = new Date(date);
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  return formatDateFR(d);
}

// Index du jour 0=Lun ... 6=Dim (ISO)
export function getDayIndex(date) {
  const d = new Date(date);
  return (d.getDay() + 6) % 7; // Lundi = 0
}

// Noms des jours courts pour le calendrier
export const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Noms des mois en français
export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Génère tous les jours du mois donné
export function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekDay = (firstDay.getDay() + 6) % 7; // 0=Lundi

  const days = [];
  // Jours vides au début
  for (let i = 0; i < startWeekDay; i++) days.push(null);
  // Jours du mois
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

// Calcule l'heure de fin selon la durée (en minutes)
export function calcEndTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  const end = addMinutes(start, durationMinutes);
  return formatTime(end);
}

// Formate pour l'affichage du calendrier Google
export function formatICSDate(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-');
  const [h, mi] = timeStr.split(':');
  return `${y}${mo}${d}T${h}${mi}00`;
}

export { startOfDay };
