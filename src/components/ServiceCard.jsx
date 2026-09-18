export default function ServiceCard({ service, selected, onClick, interactive = true }) {
  const icons = {
    S001: '✂️',
    S002: '🧔',
    S003: '✨',
    S004: '💨',
    S005: '💈',
    S_FAMILLE: '👨‍👧‍👦',
  };

  const icon = service.icon || icons[service.id] || '✂️';

  return (
    <div
      className={`service-card${selected ? ' selected' : ''}${!interactive ? ' no-hover' : ''}${service.isFamily ? ' famille-card' : ''}`}
      onClick={interactive ? onClick : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <span className="service-icon">{icon}</span>
      <h3 className="service-name">{service.name}</h3>
      <span className="service-duration">
        ⏱ {service.duration} min
      </span>
      {service.description && (
        <p className="service-desc" style={{ marginTop: '12px' }}>
          {service.description}
        </p>
      )}
      {selected && (
        <div style={{ marginTop: '16px' }}>
          <span style={{
            display: 'inline-block',
            background: 'var(--red, #DC2626)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '5px 14px',
            borderRadius: '100px',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
          }}>
            ✓ Sélectionné
          </span>
        </div>
      )}
    </div>
  );
}
