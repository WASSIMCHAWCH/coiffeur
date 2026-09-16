// Bouton créneau horaire avec support des sous-créneaux et affichage gris des périodes occupées
export default function TimeSlot({ time, available, selected, onClick, partial, label }) {
  return (
    <button
      type="button"
      className={`time-slot${!available ? ' unavailable' : ''}${selected ? ' selected' : ''}${partial && available ? ' partial-available' : ''}`}
      onClick={available ? onClick : undefined}
      disabled={!available}
      aria-label={available ? `Choisir ${time}${label ? ` (${label})` : ''}` : `${time} — ${label || 'indisponible'}`}
      title={available ? `Réserver à ${time}${label ? ` (${label})` : ''}` : `${time} — ${label || 'Indisponible'}`}
    >
      <span className="time-slot-time" style={{ display: 'block' }}>{time}</span>
      {label ? (
        <span className="time-slot-subtext">{label}</span>
      ) : !available ? (
        <span className="time-slot-subtext">Pris</span>
      ) : null}
    </button>
  );
}
