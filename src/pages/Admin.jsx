import { useState, useEffect } from 'react';
import { getAppointments, cancelAppointment, updateAppointmentStatus, createAppointment, getServices } from '../services/api';
import { formatDateISO, formatDateFR, getDateLabel, getDayIndex, isTimePast } from '../utils/date';
import { getPhoneLink, getWhatsAppLink, getWhatsAppLinkTo, getConfirmationMessageToClient } from '../utils/whatsapp';
import mohamedImg from '../assets/mohamed.jpg';
import { useShopStatus } from '../context/ShopStatusContext.jsx';
import CancelConfirmModal from '../components/CancelConfirmModal.jsx';
import ConfirmAppointmentModal from '../components/ConfirmAppointmentModal.jsx';

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Génère les créneaux de 09:00 à 21:00
function generateDisplaySlots(open = '09:00', close = '21:00', step = 30) {
  const slots = [];
  let [h, m] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  while (h < ch || (h === ch && m < cm)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += step;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

export default function Admin() {
  // ── Authentification PIN ──
  const defaultPin = import.meta.env.VITE_ADMIN_PIN || '2026';
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('gar3a_admin_auth') === 'true';
  });
  const [pinError, setPinError] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangedMsg, setPinChangedMsg] = useState('');

  // ── Statut du salon ──
  const { isOpen: shopOpen, toggle: toggleShopStatus } = useShopStatus();
  const [statusFeedback, setStatusFeedback] = useState('');

  const handleToggleStatus = () => {
    toggleShopStatus();
    const nextState = !shopOpen;
    setStatusFeedback(nextState ? '✅ Salon marqué comme OUVERT' : '🔴 Salon marqué comme FERMÉ');
    setTimeout(() => setStatusFeedback(''), 3000);
  };

  const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'TIMELINE'
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickSlot, setQuickSlot] = useState('');
  const [newClient, setNewClient] = useState({ name: '', phone: '', serviceId: 'S001' });

  const [showAdvanced, setShowAdvanced] = useState(false); // Menu Plus d'options

  // Modal de confirmation d'annulation avec WhatsApp
  const [cancelledAppt, setCancelledAppt] = useState(null);
  // Modal de validation / confirmation de RDV avec WhatsApp
  const [confirmedAppt, setConfirmedAppt] = useState(null);

  const today = new Date();
  const dayIndex = getDayIndex(selectedDate); // 0=Lun .. 4=Ven .. 6=Dim
  const isFriday = dayIndex === 4;

  const currentStoredPin = localStorage.getItem('gar3a_custom_pin') || defaultPin;

  // Validation du PIN
  const handlePinSubmit = (inputPin) => {
    const codeToVerify = inputPin || pin;
    if (codeToVerify === currentStoredPin) {
      setIsAuthenticated(true);
      localStorage.setItem('gar3a_admin_auth', 'true');
      setPinError(false);
      setPin('');
    } else {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 1500);
    }
  };

  // Clavier tactile numérique
  const handleKeypadPress = (val) => {
    if (val === 'CLEAR') {
      setPin('');
      return;
    }
    if (val === 'BACK') {
      setPin(prev => prev.slice(0, -1));
      return;
    }
    if (pin.length < 6) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === currentStoredPin.length) {
        handlePinSubmit(nextPin);
      }
    }
  };

  // Déconnexion
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('gar3a_admin_auth');
    setPin('');
  };

  // Modification du code PIN
  const handleChangePinSubmit = (e) => {
    e.preventDefault();
    if (newPinInput.length >= 4) {
      localStorage.setItem('gar3a_custom_pin', newPinInput);
      setPinChangedMsg('✅ Nouveau code PIN enregistré avec succès !');
      setTimeout(() => {
        setShowChangePin(false);
        setPinChangedMsg('');
        setNewPinInput('');
      }, 1500);
    }
  };

  // Charger les services
  useEffect(() => {
    if (isAuthenticated) {
      getServices().then(setServices).catch(() => {});
    }
  }, [isAuthenticated]);

  const load = (date) => {
    if (!isAuthenticated) return;
    setLoading(true);
    getAppointments(date)
      .then(data => setAppointments(Array.isArray(data) ? data : data?.appointments || []))
      .catch(() => {
        // Données de démonstration réalistes
        setAppointments([
          { id: 'A001', startTime: '09:00', endTime: '09:30', clientName: 'Ahmed Ben Ali',  clientPhone: '22123456', serviceName: 'Coupe',         status: 'CONFIRMED' },
          { id: 'A002', startTime: '10:00', endTime: '10:20', clientName: 'Ali Trabelsi',   clientPhone: '55987654', serviceName: 'Barbe',          status: 'COMPLETED' },
          { id: 'A003', startTime: '11:00', endTime: '11:45', clientName: 'Sami Chaabane',  clientPhone: '98765432', serviceName: 'Coupe + Barbe',  status: 'CONFIRMED' },
          { id: 'A004', startTime: '15:30', endTime: '16:00', clientName: 'Mohamed Jebali', clientPhone: '27111222', serviceName: 'Coupe',         status: 'CONFIRMED' },
        ]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      load(selectedDate);
    }
  }, [selectedDate, isAuthenticated]);

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // Changer le statut (Terminé / Confirmé / Annulé)
  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'CANCELLED' && !confirm('Annuler ce rendez-vous ?')) return;

    // Capturer l'objet avant modification pour le modal WhatsApp
    const targetAppt = appointments.find(a => a.id === id);

    setUpdatingId(id);
    try {
      if (newStatus === 'CANCELLED') {
        await cancelAppointment(id);
      } else {
        await updateAppointmentStatus(id, newStatus);
      }
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch {
      // Fallback local
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } finally {
      setUpdatingId(null);
      // Afficher le modal selon l'action (Annulation ou Confirmation)
      if (newStatus === 'CANCELLED' && targetAppt) {
        setCancelledAppt({ ...targetAppt, date: selectedDate });
      } else if (newStatus === 'CONFIRMED' && targetAppt) {
        setConfirmedAppt({ ...targetAppt, date: selectedDate });
      }
    }
  };

  // Ajout rapide d'un client direct
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!newClient.name || !newClient.phone || !quickSlot) return;
    const selectedSvc = services.find(s => s.id === newClient.serviceId) || { name: 'Coupe', duration: 30 };
    
    const newAppt = {
      id: 'WALK-' + Date.now(),
      date: selectedDate,
      startTime: quickSlot,
      endTime: quickSlot, // calculé
      serviceId: selectedSvc.id,
      serviceName: selectedSvc.name,
      clientName: newClient.name.trim(),
      clientPhone: newClient.phone.trim(),
      status: 'CONFIRMED',
    };

    try {
      await createAppointment(newAppt);
    } catch {
      // Fallback
    }

    setAppointments(prev => [...prev, newAppt]);
    setShowAddModal(false);
    setNewClient({ name: '', phone: '', serviceId: 'S001' });
    setQuickSlot('');
  };

  const displaySlots = generateDisplaySlots();

  const statusColor = {
    PENDING:   'status-pending',
    CONFIRMED: 'status-confirmed',
    CANCELLED: 'status-cancelled',
    COMPLETED: 'status-completed',
  };

  const statusLabel = {
    PENDING:   'En attente ⏳',
    CONFIRMED: 'Confirmé ✅',
    CANCELLED: 'Refusé / Annulé ❌',
    COMPLETED: 'Terminé ✂️',
  };

  // Traitement dynamique selon l'heure actuelle :
  // Si la date est aujourd'hui (ou passée) et que l'heure du créneau est dépassée :
  // - Les RDV CONFIRMÉS passent automatiquement dans "Terminés"
  // - Les RDV EN ATTENTE non traités passent en "Expirés" (dans Refusés)
  const processedAppointments = appointments.map(appt => {
    const timeToCheck = appt.endTime || appt.startTime;
    const isPast = isTimePast(timeToCheck, selectedDate);
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

  const apptByTime = Object.fromEntries(processedAppointments.map(a => [a.startTime, a]));

  // Filtrage — 'ALL' affiche uniquement les RDV actifs à venir (En attente et Confirmés)
  // Les RDV Terminés, Refusés et Expirés sont accessibles dans leurs onglets respectifs sous 'Plus d'options'
  const filteredAppointments = processedAppointments.filter(a => {
    if (filter === 'PENDING')   return a.status === 'PENDING';
    if (filter === 'CONFIRMED') return a.status === 'CONFIRMED';
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    if (filter === 'CANCELLED') return a.status === 'CANCELLED';
    // "ALL" (par défaut) : uniquement les rendez-vous actifs à venir
    return a.status === 'PENDING' || a.status === 'CONFIRMED';
  });

  const getReminderMessage = (appt) => {
    if (appt.status === 'PENDING') {
      return `Bonjour ${appt.clientName}, votre demande de rendez-vous chez Mohamed Hechi (Gar3a) pour ${appt.serviceName} le ${formatDateFR(selectedDate)} à ${appt.startTime} a bien été VALIDÉE et CONFIRMÉE ! À bientôt ✂️`;
    }
    return `Bonjour ${appt.clientName}, je vous confirme votre rendez-vous chez Mohamed Hechi (Gar3a) aujourd'hui à ${appt.startTime} pour ${appt.serviceName}. À tout à l'heure ! ✂️`;
  };

  // ── Écran de Verrouillage PIN ──
  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--bg-surface)' }}>
        <div className={`card-dark animate-fadeIn ${pinError ? 'animate-shake' : ''}`} style={{ width: '100%', maxWidth: '380px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
          {/* Avatar Mohamed */}
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: '16px' }}>
            <img
              src={mohamedImg}
              alt="Mohamed Hechi"
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--red)',
                boxShadow: '0 4px 16px rgba(220, 38, 38, 0.25)'
              }}
            />
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: 'var(--red)',
              color: '#fff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              🔒
            </span>
          </div>

          <h1 style={{ fontFamily: 'Playfair Display', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Espace Administrateur
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Saisissez le code PIN pour accéder au planning
          </p>

          {/* Indicateurs visuels du PIN (Bulles) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '24px' }}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: `2px solid ${pinError ? 'var(--danger)' : pin.length > i ? 'var(--red)' : 'var(--border)'}`,
                  background: pin.length > i ? 'var(--red)' : 'transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: pin.length > i ? 'scale(1.15)' : 'scale(1)'
                }}
              />
            ))}
          </div>

          {/* Message d'erreur */}
          {pinError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>
              ❌ Code PIN incorrect, veuillez réessayer
            </div>
          )}

          {/* Clavier Tactile Numérique (Idéal smartphone) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') handleKeypadPress('CLEAR');
                  else if (btn === '⌫') handleKeypadPress('BACK');
                  else handleKeypadPress(btn);
                }}
                style={{
                  padding: '16px 0',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: btn === 'C' || btn === '⌫' ? '#F1F5F9' : '#FFFFFF',
                  color: btn === 'C' ? 'var(--danger)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Formulaire manuel ou bouton retour */}
          <div style={{ marginTop: '12px' }}>
            <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
              ← Retour au site public
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ── Tableau de bord Administrateur Connecté ──
  return (
    <>
    <main style={{ minHeight: '100vh', padding: '32px 16px', background: 'var(--bg-surface)' }}>
      <div className="container-custom" style={{ maxWidth: '800px' }}>

        {/* Header Admin */}
        <div className="card-dark" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src={mohamedImg}
                alt="Mohamed Hechi"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--red)',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
                }}
              />
              <div>
                <h1 style={{ fontFamily: 'Playfair Display', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Tableau de Bord</span>
                  <span style={{ fontSize: '0.75rem', background: 'var(--red-glow)', color: 'var(--red)', border: '1px solid var(--border-red)', padding: '2px 8px', borderRadius: '100px' }}>
                    GAR3A Admin
                  </span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                  📅 {formatDateFR(selectedDate)}
                </p>
              </div>
            </div>

            {/* Bouton Toggle Plus d'options */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="btn-ghost"
                style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {showAdvanced ? '▲ Réduire' : '▼ Plus d\'options'}
              </button>
            </div>
          </div>

          {/* ── Panneau Statut du Salon ── */}
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Statut du salon
              </span>
              {/* Indicateur détail */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '100px',
                background: shopOpen ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${shopOpen ? '#BBF7D0' : '#FCA5A5'}`,
                color: shopOpen ? '#16A34A' : '#DC2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.3s ease',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: shopOpen ? '#16A34A' : '#DC2626',
                  animation: shopOpen ? 'pulse-dot 2s infinite' : 'none',
                }} />
                {shopOpen ? 'Ouvert' : 'Fermé'}
              </span>
              {/* Feedback transition */}
              {statusFeedback && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {statusFeedback}
                </span>
              )}
            </div>

            {/* Bouton Toggle */}
            <button
              onClick={handleToggleStatus}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${shopOpen ? '#FCA5A5' : '#BBF7D0'}`,
                background: shopOpen ? '#FEF2F2' : '#F0FDF4',
                color: shopOpen ? '#DC2626' : '#16A34A',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                letterSpacing: '0.03em',
              }}
              title={shopOpen ? 'Cliquer pour fermer le salon' : 'Cliquer pour ouvrir le salon'}
            >
              {/* Toggle visuel */}
              <div style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                background: shopOpen ? '#16A34A' : '#D1D5DB',
                position: 'relative',
                transition: 'background 0.3s ease',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: shopOpen ? '21px' : '3px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.3s ease',
                }} />
              </div>
              {shopOpen ? '🔴 Fermer le salon' : '🟢 Ouvrir le salon'}
            </button>
          </div>

          {/* Sélecteur de date */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            {[
              { label: "Aujourd'hui", date: formatDateISO(today) },
              { label: 'Demain', date: formatDateISO(addDays(today, 1)) },
              { label: '+2j',   date: formatDateISO(addDays(today, 2)) },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => setSelectedDate(btn.date)}
                className={selectedDate === btn.date ? 'btn-gold' : 'btn-ghost'}
                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
              >
                {btn.label}
              </button>
            ))}
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', minHeight: '36px' }}
            />
          </div>
        </div>

        {/* Alerte jour de repos (Vendredi) */}
        {isFriday && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--red)',
          }}>
            <span style={{ fontSize: '1.4rem' }}>⛔</span>
            <div>
              <strong style={{ fontSize: '0.9rem' }}>Vendredi — Jour de repos hebdomadaire</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Le salon est officiellement fermé pour les réservations en ligne.
              </div>
            </div>
          </div>
        )}

        {/* ── Options Avancées (PIN, Logout, Stats, Filtres) ── */}
        {showAdvanced && (
          <div className="card-dark animate-scaleIn" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowChangePin(true)}
                className="btn-ghost"
                style={{ padding: '8px 16px', fontSize: '0.75rem', borderRadius: '100px', flex: '1 1 auto', justifyContent: 'center' }}
              >
                🔑 Code PIN
              </button>
              <button
                onClick={handleLogout}
                className="btn-danger"
                style={{ padding: '8px 16px', fontSize: '0.75rem', borderRadius: '100px', flex: '1 1 auto', justifyContent: 'center' }}
              >
                🔒 Déconnexion
              </button>
            </div>

            {/* Statistiques clés */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total RDV',   value: processedAppointments.length,                                        color: 'var(--text-primary)', bg: '#FFFFFF' },
                { label: 'En attente',  value: processedAppointments.filter(a => a.status === 'PENDING').length,   color: '#D97706',              bg: '#FFFBEB' },
                { label: 'Confirmés',   value: processedAppointments.filter(a => a.status === 'CONFIRMED').length, color: 'var(--success)',       bg: '#F0FDF4' },
                { label: 'Terminés',    value: processedAppointments.filter(a => a.status === 'COMPLETED').length, color: 'var(--blue)',          bg: '#EFF6FF' },
                { label: 'Refusés',     value: processedAppointments.filter(a => a.status === 'CANCELLED').length, color: 'var(--danger)',        bg: '#FEF2F2' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '12px 8px', background: stat.bg, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Onglets de filtrage */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL',       label: `Tous actifs (${processedAppointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length})` },
                { key: 'PENDING',   label: `⏳ En attente (${processedAppointments.filter(a => a.status === 'PENDING').length})` },
                { key: 'CONFIRMED', label: `✅ Confirmés (${processedAppointments.filter(a => a.status === 'CONFIRMED').length})` },
                { key: 'COMPLETED', label: `✂️ Terminés (${processedAppointments.filter(a => a.status === 'COMPLETED').length})` },
                { key: 'CANCELLED', label: `❌ Refusés / Expirés (${processedAppointments.filter(a => a.status === 'CANCELLED').length})` },
                { key: 'TIMELINE',  label: '⏱ Vue Grille' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={filter === tab.key ? 'btn-gold' : 'btn-ghost'}
                  style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '100px', flex: '1 1 auto', justifyContent: 'center' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Vue Liste ou Grille Timeline */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="loading-spinner" />
            <p style={{ color: 'var(--text-muted)', marginTop: '12px', fontSize: '0.85rem' }}>Chargement du planning...</p>
          </div>
        ) : filter === 'TIMELINE' ? (
          /* Vue Chronologique Créneaux */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Grille complète de la journée</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>09:00 à 21:00</span>
            </div>
            {displaySlots.map(time => {
              const appt = apptByTime[time];
              if (appt) {
                return (
                  <div key={time} className="admin-day-card animate-fadeIn">
                    <div className="admin-time">{time}</div>
                    <div className="admin-client">
                      <div className="admin-client-name">{appt.clientName}</div>
                      <div className="admin-client-service">✂️ {appt.serviceName}</div>
                      <div className="admin-client-phone">📞 {appt.clientPhone}</div>
                    </div>
                    <span className={`status-badge ${statusColor[appt.status] || 'status-pending'}`}>
                      {statusLabel[appt.status] || appt.status}
                    </span>
                  </div>
                );
              }

              return (
                <div key={time} className="admin-day-card admin-slot-free">
                  <div className="admin-time">{time}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1 }}>— Libre</div>
                  <button
                    onClick={() => { setQuickSlot(time); setShowAddModal(true); }}
                    className="btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                  >
                    + Ajouter RDV
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vue Cartes Détaillées */
          <div>
            {filteredAppointments.length === 0 ? (
              <div className="card-dark text-center" style={{ padding: '40px 20px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucun rendez-vous</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Aucun rendez-vous ne correspond à ce filtre pour le {formatDateFR(selectedDate)}.
                </p>
              </div>
            ) : (
              filteredAppointments.map(appt => (
                <div key={appt.id} className="card-dark animate-fadeIn" style={{ marginBottom: '12px', padding: '16px 20px', borderLeft: appt.status === 'PENDING' ? '4px solid #D97706' : appt.status === 'CONFIRMED' ? '4px solid #16A34A' : appt.status === 'COMPLETED' ? '4px solid #2563EB' : '4px solid #DC2626' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--red)' }}>
                          ⏰ {appt.startTime}
                        </span>
                        {appt.endTime && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            – {appt.endTime}
                          </span>
                        )}
                        <span className={`status-badge ${appt.isExpired ? 'status-cancelled' : (statusColor[appt.status] || 'status-pending')}`} style={{ marginLeft: '6px' }}>
                          {appt.isExpired ? 'Expiré ⏱️' : (statusLabel[appt.status] || appt.status)}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                        {appt.clientName}
                      </h3>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span>✂️ <strong>{appt.serviceName}</strong></span>
                        <span>📞 <a href={getPhoneLink(appt.clientPhone)} style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>{appt.clientPhone}</a></span>
                      </div>
                    </div>

                    {/* Actions Rapides Barber */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* ── Valider pour En Attente ── */}
                      {appt.status === 'PENDING' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'CONFIRMED')}
                          disabled={updatingId === appt.id}
                          className="btn-gold"
                          style={{ padding: '8px 14px', fontSize: '0.75rem' }}
                        >
                          <span>✓ Confirmer</span>
                        </button>
                      )}

                      {/* Appel Direct */}
                      <a
                        href={getPhoneLink(appt.clientPhone)}
                        className="btn-ghost"
                        style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#16A34A', borderColor: '#BBF7D0' }}
                        title="Appeler le client"
                      >
                        📞 Appeler
                      </a>

                      {/* WhatsApp Rappel / Confirmation */}
                      <a
                        href={getWhatsAppLinkTo(appt.clientPhone, getConfirmationMessageToClient({
                          clientName: appt.clientName,
                          serviceName: appt.serviceName,
                          date: formatDateFR(selectedDate),
                          time: appt.startTime,
                          clientPhone: appt.clientPhone,
                        }))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost"
                        style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#16A34A', borderColor: '#BBF7D0' }}
                        title="Envoyer un message WhatsApp de confirmation"
                      >
                        💬 WhatsApp
                      </a>

                      {/* Marquer Terminé — uniquement si CONFIRMED */}
                      {appt.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                          disabled={updatingId === appt.id}
                          className="btn-ghost"
                          style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--blue)', borderColor: 'var(--border)' }}
                        >
                          ✓ Terminé
                        </button>
                      )}

                      {/* Annuler / Refuser — disponible sur PENDING, CONFIRMED et CANCELLED */}
                      {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                          disabled={updatingId === appt.id}
                          className="btn-danger"
                          style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                        >
                          {appt.status === 'PENDING' ? '✕ Refuser' : '✕ Annuler'}
                        </button>
                      )}

                      {/* Rétablir pour Annulé / Refusé */}
                      {appt.status === 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'CONFIRMED')}
                          disabled={updatingId === appt.id}
                          className="btn-ghost"
                          style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#16A34A', borderColor: '#BBF7D0' }}
                        >
                          ↺ Rétablir
                        </button>
                      )}

                      {/* Annuler aussi pour CANCELLED (si jamais on veut définitivement supprimer) */}
                      {appt.status === 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                          disabled={true}
                          className="btn-ghost"
                          style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', cursor: 'default', opacity: 0.5 }}
                          title="Déjà annulé"
                        >
                          ✕ Annulé
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal d'ajout rapide de client */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 2000,
          }}>
            <div className="card-dark animate-scaleIn" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Ajouter un Rendez-vous Direct
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleQuickAdd}>
                <div className="form-group">
                  <label className="form-label">Créneau Horaire</label>
                  <input
                    type="text"
                    value={quickSlot}
                    onChange={e => setQuickSlot(e.target.value)}
                    className="form-input"
                    placeholder="09:30"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nom du Client</label>
                  <input
                    type="text"
                    value={newClient.name}
                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                    className="form-input"
                    placeholder="Ex: Karim Ben Salah"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                    className="form-input"
                    placeholder="Ex: 22 123 456"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prestation</label>
                  <select
                    value={newClient.serviceId}
                    onChange={e => setNewClient({ ...newClient, serviceId: e.target.value })}
                    className="form-input"
                  >
                    <option value="S001">✂️ Coupe (30 min)</option>
                    <option value="S002">🧔 Barbe (20 min)</option>
                    <option value="S003">✨ Coupe + Barbe (45 min)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                    <span>Enregistrer</span>
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost" style={{ flex: 1 }}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de modification du code PIN */}
        {showChangePin && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 2000,
          }}>
            <div className="card-dark animate-scaleIn" style={{ width: '100%', maxWidth: '380px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔑</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Modifier le Code PIN
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Choisissez un nouveau code PIN à 4 chiffres minimum
              </p>

              {pinChangedMsg && (
                <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '16px' }}>
                  {pinChangedMsg}
                </div>
              )}

              <form onSubmit={handleChangePinSubmit}>
                <div className="form-group">
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength="6"
                    value={newPinInput}
                    onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    placeholder="Ex: 2026"
                    style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.3rem', fontWeight: 700 }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                    <span>Enregistrer</span>
                  </button>
                  <button type="button" onClick={() => setShowChangePin(false)} className="btn-ghost" style={{ flex: 1 }}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>

    {/* Modal de confirmation d'annulation avec bouton WhatsApp */}
    {cancelledAppt && (
      <CancelConfirmModal
        appt={cancelledAppt}
        onClose={() => setCancelledAppt(null)}
        context="admin"
      />
    )}

    {/* Modal de validation de rendez-vous avec bouton WhatsApp */}
    {confirmedAppt && (
      <ConfirmAppointmentModal
        appt={confirmedAppt}
        onClose={() => setConfirmedAppt(null)}
      />
    )}
    </>
  );
}
