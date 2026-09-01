import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getAppointmentStatus, cancelAppointment } from '../services/api';
import { formatDateFR, isTimePast } from '../utils/date';
import { getPhoneLink, getWhatsAppLink } from '../utils/whatsapp';
import mohamedImg from '../assets/mohamed.jpg';
import CancelConfirmModal from '../components/CancelConfirmModal.jsx';

export default function Suivi() {
  const [searchParams] = useSearchParams();
  const initialPhone = searchParams.get('phone') || '';
  const initialId    = searchParams.get('id') || '';

  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [cancelledAppt, setCancelledAppt] = useState(null); // Pour le modal WhatsApp

  const search = async (phoneToSearch, idToSearch) => {
    const qPhone = (phoneToSearch !== undefined ? phoneToSearch : phone).trim();
    const qId    = idToSearch || initialId;

    if (!qPhone && !qId) return;

    setLoading(true);
    setSearched(true);
    setErrorMsg('');

    try {
      const data = await getAppointmentStatus(qPhone, qId);
      const list = Array.isArray(data) ? data : data?.appointments || (data?.id ? [data] : []);
      setAppointments(list);
      if (list.length === 0) {
        setErrorMsg('Aucun rendez-vous trouvé pour ce numéro de téléphone.');
      }
    } catch {
      setErrorMsg('Impossible de récupérer vos rendez-vous pour le moment. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPhone || initialId) {
      search(initialPhone, initialId);
    }
  }, [initialPhone, initialId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    search(phone);
  };

  // Annuler un RDV côté client
  const handleCancel = async (apptId) => {
    const targetAppt = appointments.find(a => a.id === apptId);
    if (!targetAppt) return;
    if (!window.confirm('Êtes-vous sûr(e) de vouloir annuler ce rendez-vous ? Vous devez ensuite envoyer la confirmation WhatsApp à Mohamed Hechi.')) return;

    setCancellingId(apptId);
    try {
      await cancelAppointment(apptId);
    } catch {
      // Même en cas d'erreur API, on met à jour localement
    } finally {
      setAppointments(prev =>
        prev.map(a => a.id === apptId ? { ...a, status: 'CANCELLED' } : a)
      );
      setCancellingId(null);
      // Afficher le modal de confirmation avec envoi WhatsApp obligatoire au salon (21621376917)
      setCancelledAppt(targetAppt);
    }
  };

  const statusConfig = {
    PENDING: {
      label: 'En attente ⏳',
      msg: 'Votre demande de réservation a bien été enregistrée. Elle est actuellement en attente de confirmation par Mohamed Hechi.',
      bg: '#FFFBEB',
      border: '#FDE68A',
      color: '#D97706',
    },
    CONFIRMED: {
      label: 'Confirmé ✅',
      msg: 'Votre rendez-vous est validé et confirmé ! Mohamed Hechi vous attend au salon.',
      bg: '#F0FDF4',
      border: '#BBF7D0',
      color: '#16A34A',
    },
    CANCELLED: {
      label: 'Refusé / Annulé ❌',
      msg: "Ce rendez-vous a été refusé ou annulé. N'hésitez pas à nous contacter pour convenir d'un autre créneau.",
      bg: '#FEF2F2',
      border: '#FCA5A5',
      color: '#DC2626',
    },
    COMPLETED: {
      label: 'Terminé ✂️',
      msg: 'Prestation effectuée avec succès. Merci de votre visite chez GAR3A !',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      color: '#2563EB',
    },
  };

  // Traitement dynamique selon l'heure actuelle :
  const processedAppointments = appointments.map(appt => {
    const timeToCheck = appt.endTime || appt.startTime;
    const isPast = isTimePast(timeToCheck, appt.date);
    if (isPast) {
      if (appt.status === 'CONFIRMED') {
        return { ...appt, status: 'COMPLETED', isAutoCompleted: true };
      }
      if (appt.status === 'PENDING') {
        return { ...appt, status: 'CANCELLED', isExpired: true };
      }
    }
    return appt;
  });

  // Séparer actifs et terminés
  const activeAppointments    = processedAppointments.filter(a => a.status !== 'COMPLETED');
  const completedAppointments = processedAppointments.filter(a => a.status === 'COMPLETED');

  // Carte rendez-vous réutilisable
  function AppointmentCard({ appt, showCancel }) {
    const cfg = statusConfig[appt.status] || statusConfig.CONFIRMED;
    return (
      <div
        className="card-dark animate-fadeIn"
        style={{
          marginBottom: '16px',
          padding: '20px',
          borderLeft: `5px solid ${cfg.color}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}
      >
        {/* Statut Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            N° RDV : <strong>{appt.id}</strong>
          </span>
          <span style={{
            display: 'inline-block',
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            color: cfg.color,
            padding: '4px 12px',
            borderRadius: '100px',
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Service */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          ✂️ {appt.serviceName}
        </h3>

        {/* Date & Heure */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Date</span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>📅 {formatDateFR(appt.date)}</strong>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Horaire</span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--red)' }}>
              ⏰ {appt.startTime}{appt.endTime ? ` – ${appt.endTime}` : ''}
            </strong>
          </div>
        </div>

        {/* Message statut */}
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: cfg.color, marginBottom: '16px' }}>
          {cfg.msg}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={getPhoneLink('21376917')}
            className="btn-ghost"
            style={{ padding: '8px 14px', fontSize: '0.75rem', flex: 1, textAlign: 'center' }}
          >
            📞 Appeler le salon
          </a>
          <a
            href={getWhatsAppLink(`Bonjour Mohamed, je vous contacte concernant mon rendez-vous N° ${appt.id} du ${appt.date} à ${appt.startTime}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ padding: '8px 14px', fontSize: '0.75rem', flex: 1, textAlign: 'center', color: '#16A34A', borderColor: '#BBF7D0' }}
          >
            💬 WhatsApp
          </a>

          {/* Bouton Annuler / Supprimer — pour PENDING et CONFIRMED */}
          {showCancel && (appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
            <button
              onClick={() => handleCancel(appt.id)}
              disabled={cancellingId === appt.id}
              className="btn-danger"
              style={{ padding: '8px 14px', fontSize: '0.75rem', flex: 1 }}
            >
              {cancellingId === appt.id ? '⏳ Annulation...' : '✕ Annuler ce rendez-vous'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
    <main style={{ minHeight: '100vh', padding: '40px 16px', background: 'var(--bg-surface)' }}>
      <div className="container-custom" style={{ maxWidth: '640px' }}>

        {/* Header */}
        <div className="text-center mb-32">
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: '12px' }}>
            <img
              src={mohamedImg}
              alt="Mohamed Hechi"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid var(--red)',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
              }}
            />
          </div>
          <h1 className="section-title">Suivi de Rendez-vous</h1>
          <p className="section-subtitle">
            Consultez en temps réel le statut de votre réservation
          </p>
        </div>

        {/* Barre de Recherche */}
        <div className="card-dark" style={{ padding: '24px', marginBottom: '24px' }}>
          <form onSubmit={handleSubmit}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
              📱 Entrez votre numéro de téléphone :
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ex: 20 000 000"
                className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
                required
              />
              <button type="submit" className="btn-gold" disabled={loading} style={{ minWidth: '130px' }}>
                <span>{loading ? 'Recherche...' : '🔍 Vérifier'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Notification annulation réussie */}
        {cancelSuccess && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: '16px',
            color: '#16A34A',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            ✅ {cancelSuccess}
          </div>
        )}

        {/* Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner" />
            <p style={{ color: 'var(--text-muted)', marginTop: '14px', fontSize: '0.85rem' }}>
              Vérification auprès du salon...
            </p>
          </div>
        )}

        {/* Résultats */}
        {!loading && searched && (
          <div>
            {errorMsg ? (
              <div className="card-dark text-center" style={{ padding: '36px 20px' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🔎</div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Aucun résultat
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  {errorMsg}
                </p>
                <Link to="/booking" className="btn-gold" style={{ display: 'inline-block', padding: '12px 24px' }}>
                  <span>📅 Prendre un nouveau rendez-vous</span>
                </Link>
              </div>
            ) : (
              <div>
                {/* ── Réservations Actives ── */}
                {activeAppointments.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Vos réservations ({activeAppointments.length})
                    </h2>
                    {activeAppointments.map(appt => (
                      <AppointmentCard key={appt.id} appt={appt} showCancel={true} />
                    ))}
                  </div>
                )}

                {/* Aucune réservation du tout */}
                {activeAppointments.length === 0 && completedAppointments.length === 0 && (
                  <div className="card-dark text-center" style={{ padding: '36px 20px' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>📅</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune réservation active.</p>
                    <Link to="/booking" className="btn-gold" style={{ display: 'inline-block', padding: '12px 24px', marginTop: '16px' }}>
                      <span>📅 Prendre un nouveau rendez-vous</span>
                    </Link>
                  </div>
                )}

                {/* ── Historique — Terminés ── */}
                {completedAppointments.length > 0 && (
                  <div style={{ marginTop: activeAppointments.length > 0 ? '32px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                        ✂️ Historique — Terminés ({completedAppointments.length})
                      </h2>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '14px' }}>
                      Ces prestations ont déjà été effectuées. Merci de votre visite !
                    </p>
                    {completedAppointments.map(appt => (
                      <AppointmentCard key={appt.id} appt={appt} showCancel={false} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Retour à l'accueil
          </Link>
        </div>

      </div>
    </main>

    {/* Modal de confirmation d'annulation avec bouton WhatsApp */}
    {cancelledAppt && (
      <CancelConfirmModal
        appt={cancelledAppt}
        onClose={() => setCancelledAppt(null)}
        context="client"
      />
    )}
    </>
  );
}
