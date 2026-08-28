// Bouton créneau horaire
export default function TimeSlot({ time, available, selected, onClick }) {
  return (
    <button
      className={`time-slot${!available ? ' unavailable' : ''}${selected ? ' selected' : ''}`}
      onClick={available ? onClick : undefined}
      disabled={!available}
      aria-label={available ? `Choisir ${time}` : `${time} — indisponible`}
      title={available ? `Réserver à ${time}` : 'Créneau déjà pris'}
    >
      {time}
      {!available && <span style={{ display: 'block', fontSize: '0.6rem', marginTop: '2px' }}>Pris</span>}
    </button>
  );
}
