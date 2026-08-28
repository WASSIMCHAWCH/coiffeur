import { useState } from 'react';
import { getMonthDays, DAY_LABELS, MONTHS_FR, formatDateISO } from '../utils/date';

// dayOffIndexes : tableau d'index (0=Lun..6=Dim) des jours fermés
// blockedDates : tableau de strings "YYYY-MM-DD"
export default function BookingCalendar({ selectedDate, onSelectDate, dayOffIndexes = [4], blockedDates = [] }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const days = getMonthDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isDisabled = (date) => {
    if (!date) return true;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dayStart < todayStart) return true; // passé
    const dayIndex = (date.getDay() + 6) % 7; // 0=Lun
    if (dayOffIndexes.includes(dayIndex)) return true; // jour fermé
    const iso = formatDateISO(date);
    if (blockedDates.includes(iso)) return true; // date bloquée
    return false;
  };

  const isToday = (date) => {
    if (!date) return false;
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return formatDateISO(date) === selectedDate;
  };

  const isPastDay = (date) => {
    if (!date) return false;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dayStart < todayStart;
  };

  // Empêche navigation vers les mois passés
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  return (
    <div className="calendar-wrapper">
      {/* Header */}
      <div className="calendar-header">
        <button
          className="calendar-nav-btn"
          onClick={prevMonth}
          disabled={!canGoPrev}
          style={{ opacity: canGoPrev ? 1 : 0.3, cursor: canGoPrev ? 'pointer' : 'not-allowed' }}
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <span className="calendar-month">
          {MONTHS_FR[viewMonth]} {viewYear}
        </span>
        <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Mois suivant">
          ›
        </button>
      </div>

      {/* Grille */}
      <div className="calendar-grid">
        {/* Labels jours */}
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="calendar-day-label">{label}</div>
        ))}

        {/* Jours */}
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="calendar-day empty" />;

          const disabled = isDisabled(date);
          const past     = isPastDay(date);
          const selected = isSelected(date);
          const todayDay = isToday(date);

          let className = 'calendar-day';
          if (selected) className += ' selected';
          else if (past) className += ' past';
          else if (disabled) className += ' disabled';
          else if (todayDay) className += ' today';

          return (
            <div
              key={i}
              className={className}
              onClick={() => !disabled && onSelectDate(formatDateISO(date))}
              aria-label={`${date.getDate()} ${MONTHS_FR[viewMonth]}`}
              role="button"
              tabIndex={disabled ? -1 : 0}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--red)', display: 'inline-block' }} />
          Sélectionné
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1.5px solid var(--blue)', display: 'inline-block' }} />
          Aujourd'hui
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#E2E8F0', opacity: 0.8, display: 'inline-block' }} />
          Fermé (Repos)
        </span>
      </div>
    </div>
  );
}
