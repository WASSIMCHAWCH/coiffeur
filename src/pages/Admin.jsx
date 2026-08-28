import { useState, useEffect } from 'react';
import { getAppointments, cancelAppointment, updateAppointmentStatus, createAppointment, getServices } from '../services/api';
import { formatDateISO, formatDateFR, getDateLabel, getDayIndex } from '../utils/date';
import { getPhoneLink, getWhatsAppLink } from '../utils/whatsapp';
import mohamedImg from '../assets/mohamed.jpg';

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
  const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'TIMELINE'
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickSlot, setQuickSlot] = useState('');
  const [newClient, setNewClient] = useState({ name: '', phone: '', serviceId: 'S001' });

  const today = new Date();
  const dayIndex = getDayIndex(selectedDate); // 0=Lun .. 4=Ven .. 6=Dim
  const isFriday = dayIndex === 4;

  // Charger les services
  useEffect(() => {
    getServices().then(setServices).catch(() => {});
  }, []);

  const load = (date) => {
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

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // Changer le statut (Terminé / Confirmé / Annulé)
  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'CANCELLED' && !confirm('Annuler ce rendez-vous ?')) return;
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
  const apptByTime   = Object.fromEntries(appointments.map(a => [a.startTime, a]));

  const statusColor = { CONFIRMED: 'status-confirmed', CANCELLED: 'status-cancelled', COMPLETED: 'status-completed' };
  const statusLabel = { CONFIRMED: 'Confirmé', CANCELLED: 'Annulé', COMPLETED: 'Terminé' };

  // Filtrage
  const filteredAppointments = appointments.filter(a => {
    if (filter === 'CONFIRMED') return a.status === 'CONFIRMED';
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    if (filter === 'CANCELLED') return a.status === 'CANCELLED';
    return true;
  });

  const getReminderMessage = (appt) => {
    return `Bonjour ${appt.clientName}, je vous confirme votre rendez-vous chez Mohamed Hechi (Gar3a) aujourd'hui à ${appt.startTime} pour ${appt.serviceName}. À tout à l'heure ! ✂️`;
  };

  return (
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

            {/* Sélecteur de date */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
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

        {/* Statistiques clés */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total RDV',  value: appointments.length,                                       color: 'var(--text-primary)', bg: '#FFFFFF' },
            { label: 'Confirmés',  value: appointments.filter(a => a.status === 'CONFIRMED').length, color: 'var(--success)',       bg: '#F0FDF4' },
            { label: 'Terminés',   value: appointments.filter(a => a.status === 'COMPLETED').length, color: 'var(--blue)',          bg: '#EFF6FF' },
            { label: 'Annulés',    value: appointments.filter(a => a.status === 'CANCELLED').length, color: 'var(--danger)',        bg: '#FEF2F2' },
          ].map(stat => (
            <div key={stat.label} className="card-dark" style={{ textAlign: 'center', padding: '14px 10px', background: stat.bg }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Onglets de filtrage */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL',       label: `Tous (${appointments.length})` },
            { key: 'CONFIRMED', label: `Confirmés (${appointments.filter(a => a.status === 'CONFIRMED').length})` },
            { key: 'COMPLETED', label: `Terminés (${appointments.filter(a => a.status === 'COMPLETED').length})` },
            { key: 'TIMELINE',  label: '⏱ Vue Grille (09h-21h)' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={filter === tab.key ? 'btn-gold' : 'btn-ghost'}
              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '100px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
                    <span className={`status-badge ${statusColor[appt.status] || 'status-confirmed'}`}>
                      {statusLabel[appt.status] || appt.status}
                    </span>
                  </div>
                );
              }

              return (
                <div key={time} className="admin-empty-slot">
                  <div className="admin-time" style={{ color: 'var(--text-muted)' }}>{time}</div>
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
                <div key={appt.id} className="card-dark animate-fadeIn" style={{ marginBottom: '12px', padding: '16px 20px' }}>
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
                        <span className={`status-badge ${statusColor[appt.status] || 'status-confirmed'}`} style={{ marginLeft: '6px' }}>
                          {statusLabel[appt.status] || appt.status}
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
                      {/* Appel Direct */}
                      <a
                        href={getPhoneLink(appt.clientPhone)}
                        className="btn-ghost"
                        style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#16A34A', borderColor: '#BBF7D0' }}
                        title="Appeler le client"
                      >
                        📞 Appeler
                      </a>

                      {/* WhatsApp Rappel */}
                      <a
                        href={getWhatsAppLink(getReminderMessage(appt), appt.clientPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost"
                        style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#16A34A', borderColor: '#BBF7D0' }}
                        title="Envoyer un rappel WhatsApp"
                      >
                        💬 WhatsApp
                      </a>

                      {/* Marquer Terminé */}
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

                      {/* Annuler */}
                      {appt.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                          disabled={updatingId === appt.id}
                          className="btn-danger"
                          style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                        >
                          ✕ Annuler
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

      </div>
    </main>
  );
}
