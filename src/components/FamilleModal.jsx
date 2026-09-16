import { useState, useEffect } from 'react';

export default function FamilleModal({ isOpen, onClose, onConfirm, initialCount = 1 }) {
  const [childrenCount, setChildrenCount] = useState(initialCount);

  useEffect(() => {
    if (isOpen) {
      setChildrenCount(initialCount || 1);
    }
  }, [isOpen, initialCount]);

  if (!isOpen) return null;

  // Calcul automatique : 20 min père + 15 min par enfant
  const fatherDuration = 20;
  const childrenDuration = childrenCount * 15;
  const totalDuration = fatherDuration + childrenDuration;

  const handleIncrement = () => {
    if (childrenCount < 8) setChildrenCount(c => c + 1);
  };

  const handleDecrement = () => {
    if (childrenCount > 1) setChildrenCount(c => c - 1);
  };

  const handleConfirm = () => {
    onConfirm({
      childrenCount,
      duration: totalDuration,
      name: `Famille (Père + ${childrenCount} enfant${childrenCount > 1 ? 's' : ''})`,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1000,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-famille-title"
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg, 16px)',
          maxWidth: '440px',
          width: '100%',
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle, #E2E8F0)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            color: 'var(--text-muted, #94A3B8)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👨‍👧‍👦</div>
          <h2
            id="modal-famille-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary, #0F172A)',
              marginBottom: '6px',
            }}
          >
            Formule Famille
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
            Combien d'enfants accompagnent le père pour la séance ?
          </p>
        </div>

        {/* Sélecteur de nombre d'enfants */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            padding: '16px 0',
            background: '#F8FAFC',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={handleDecrement}
            disabled={childrenCount <= 1}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid #CBD5E1',
              background: '#FFFFFF',
              color: childrenCount <= 1 ? '#CBD5E1' : '#0F172A',
              fontSize: '1.3rem',
              fontWeight: 700,
              cursor: childrenCount <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            aria-label="Moins d'enfants"
          >
            −
          </button>

          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--blue, #2563EB)' }}>
              {childrenCount}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
              {childrenCount === 1 ? 'enfant' : 'enfants'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={childrenCount >= 8}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid #CBD5E1',
              background: '#FFFFFF',
              color: childrenCount >= 8 ? '#CBD5E1' : '#0F172A',
              fontSize: '1.3rem',
              fontWeight: 700,
              cursor: childrenCount >= 8 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            aria-label="Plus d'enfants"
          >
            +
          </button>
        </div>

        {/* Détail du calcul automatique */}
        <div
          style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '14px 16px',
            marginBottom: '24px',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#1E40AF' }}>
            <span>🧔 Père</span>
            <span style={{ fontWeight: 600 }}>20 min</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#1E40AF' }}>
            <span>👦 {childrenCount} × {childrenCount === 1 ? 'Enfant' : 'Enfants'} (15 min/chacun)</span>
            <span style={{ fontWeight: 600 }}>{childrenDuration} min</span>
          </div>
          <div
            style={{
              borderTop: '1px solid #BFDBFE',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 700,
              color: '#1E3A8A',
              fontSize: '0.95rem',
            }}
          >
            <span>⏱ Durée totale calculée :</span>
            <span style={{
              background: '#DBEAFE',
              padding: '3px 10px',
              borderRadius: '100px',
              color: '#1D4ED8',
            }}>
              {totalDuration} min
            </span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="btn-gold"
            onClick={handleConfirm}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px',
              fontSize: '0.95rem',
              fontWeight: 700,
            }}
          >
            <span>✓ Confirmer la formule ({totalDuration} min)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #64748B)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
