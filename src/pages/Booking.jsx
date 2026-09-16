import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard';
import BookingCalendar from '../components/BookingCalendar';
import TimeSlot from '../components/TimeSlot';
import FamilleModal from '../components/FamilleModal';
import { getServices, getAvailability, getAppointments, getSchedule, createAppointment } from '../services/api';
import { formatDateFR, calcEndTime } from '../utils/date';
import { validateBookingForm, hasErrors } from '../utils/validation';
import { useShopStatus } from '../context/ShopStatusContext.jsx';
import { computeTimeSlots } from '../utils/slots';

// Stepper
function Stepper({ current }) {
  const steps = ['Service', 'Date', 'Créneau', 'Infos'];
  return (
    <div className="stepper">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isActive    = idx === current;
        const isCompleted = idx < current;
        return (
          <div key={label} className={`step${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}>
            <div className="step-circle">
              {isCompleted ? '✓' : idx}
            </div>
            <span className="step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Booking() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Context statut salon & verrouillage complet des créneaux
  const { isOpen: shopOpen, allSlotsClosed } = useShopStatus();

  // Data
  const [services, setServices]     = useState([]);
  const [schedule, setSchedule]     = useState([]);
  const [slots, setSlots]           = useState([]); // tableau d'objets { time, available, partial, label }
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]     = useState('');

  // Modal Famille
  const [showFamilleModal, setShowFamilleModal] = useState(false);
  const [familleChildrenCount, setFamilleChildrenCount] = useState(1);

  // Sélections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate]       = useState('');
  const [selectedTime, setSelectedTime]       = useState('');

  // Formulaire
  const [form, setForm]     = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});

  // Charger services + horaires
  useEffect(() => {
    const onSvcUpdate = (svc) => setServices(svc.filter(s => s.active));
    const onSchUpdate = (sch) => setSchedule(sch);
    Promise.all([getServices(onSvcUpdate), getSchedule(onSchUpdate)]).then(([svc, sch]) => {
      setServices(svc.filter(s => s.active));
      setSchedule(sch);
    });
  }, []);

  // Index des jours fermés (0=Lun..6=Dim)
  const dayOffIndexes = schedule
    .map((day, i) => (!day.active ? i : null))
    .filter(i => i !== null);

  // Charger les créneaux quand date + service sélectionnés (ou si allSlotsClosed change)
  useEffect(() => {
    if (!selectedDate || !selectedService) return;

    let isMounted = true;
    setLoading(true);
    setSelectedTime('');

    async function loadComputedSlots() {
      try {
        let dayAppts = [];

        // 1. Tenter de récupérer les rendez-vous existants pour cette date
        try {
          const remote = await getAppointments(selectedDate);
          if (Array.isArray(remote)) {
            dayAppts = remote.filter(a => a.date === selectedDate || !a.date);
          }
        } catch {
          // Fallback silencieux
        }

        // 2. Ajouter les RDV enregistrés localement dans la session
        try {
          const local = JSON.parse(localStorage.getItem('gar3a_local_appointments') || '[]');
          const localForDay = local.filter(a => a.date === selectedDate);
          dayAppts = [...dayAppts, ...localForDay];
        } catch {
          // Ignorer
        }

        // 3. Compléter via getAvailability si disponible
        try {
          const availData = await getAvailability(selectedDate, selectedService.id);
          if (availData?.allSlots && availData?.availableSlots) {
            const booked = availData.allSlots.filter(s => !availData.availableSlots.includes(s));
            booked.forEach(s => {
              if (!dayAppts.some(a => a.startTime === s)) {
                dayAppts.push({
                  startTime: s,
                  endTime: null,
                  duration: 30,
                  status: 'CONFIRMED',
                });
              }
            });
          }
        } catch {
          // Ignorer
        }

        // 4. Horaires du jour
        const dateObj = new Date(selectedDate + 'T12:00:00');
        const dayIdx = (dateObj.getDay() + 6) % 7;
        const daySchedule = schedule[dayIdx] || { open: '09:00', close: '21:00', active: true };

        // 5. Calculer la grille de créneaux avec sous-créneaux et périodes occupées en gris
        const computed = computeTimeSlots({
          selectedDate,
          serviceDuration: selectedService.duration || 30,
          appointments: dayAppts,
          daySchedule,
          allSlotsClosed,
        });

        if (isMounted) {
          setSlots(computed);
        }
      } catch (err) {
        console.error('Erreur chargement créneaux', err);
        if (isMounted) {
          const fallback = computeTimeSlots({
            selectedDate,
            serviceDuration: selectedService.duration || 30,
            appointments: [],
            daySchedule: { open: '09:00', close: '21:00', active: true },
            allSlotsClosed,
          });
          setSlots(fallback);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadComputedSlots();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedService, schedule, allSlotsClosed]);

  // ── Étape 1 : Service standard ──
  const handleSelectService = (svc) => {
    setSelectedService(svc);
    setSelectedDate('');
    setSelectedTime('');
    setSlots([]);
    setStep(2);
  };

  // ── Étape 1 : Service Famille confirmé ──
  const handleFamilleConfirm = ({ childrenCount, duration, name }) => {
    setFamilleChildrenCount(childrenCount);
    setShowFamilleModal(false);

    const familleSvc = {
      id: 'S_FAMILLE',
      name,
      duration,
      description: `Formule Famille : 20 min (père) + ${childrenCount} × 15 min (enfants)`,
      icon: '👨‍👧‍👦',
      isFamily: true,
      childrenCount,
      active: true,
    };

    handleSelectService(familleSvc);
  };

  // ── Étape 2 : Date ──
  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setSlots([]);
    setStep(3);
  };

  // ── Étape 3 : Créneau ──
  const handleSelectTime = (time) => {
    setSelectedTime(time);
    setStep(4);
  };

  // ── Étape 4 : Soumission ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const validationErrors = validateBookingForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const endTime = calcEndTime(selectedTime, selectedService.duration);

    setSubmitting(true);
    try {
      const result = await createAppointment({
        date:        selectedDate,
        time:        selectedTime,
        endTime,
        serviceId:   selectedService.isFamily ? 'S_FAMILLE' : selectedService.id,
        serviceName: selectedService.name,
        clientName:  form.name.trim(),
        clientPhone: form.phone.trim(),
      });

      if (result?.status === 'error' || result?.code === 'SLOT_ALREADY_BOOKED') {
        setApiError('Désolé, ce créneau vient d\'être réservé. Veuillez choisir un autre horaire.');
        setStep(3);
        return;
      }

      // Enregistrer localement pour persistance immédiate
      try {
        const local = JSON.parse(localStorage.getItem('gar3a_local_appointments') || '[]');
        local.push({
          id: result?.id || ('LOCAL-' + Date.now()),
          date: selectedDate,
          startTime: selectedTime,
          endTime,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          clientName: form.name.trim(),
          clientPhone: form.phone.trim(),
          status: 'CONFIRMED',
        });
        localStorage.setItem('gar3a_local_appointments', JSON.stringify(local));
      } catch {}

      // Succès → page confirmation
      navigate('/confirmation', {
        state: {
          appointment: result || { id: 'CONF-' + Date.now() },
          service: selectedService,
          date:    selectedDate,
          time:    selectedTime,
          endTime,
          client: form,
        },
      });
    } catch (err) {
      // Mode démo (sans API) → simuler le succès
      try {
        const local = JSON.parse(localStorage.getItem('gar3a_local_appointments') || '[]');
        local.push({
          id: 'DEMO-' + Date.now(),
          date: selectedDate,
          startTime: selectedTime,
          endTime,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          clientName: form.name.trim(),
          clientPhone: form.phone.trim(),
          status: 'CONFIRMED',
        });
        localStorage.setItem('gar3a_local_appointments', JSON.stringify(local));
      } catch {}

      navigate('/confirmation', {
        state: {
          appointment: { id: 'DEMO-' + Date.now() },
          service: selectedService,
          date:    selectedDate,
          time:    selectedTime,
          endTime,
          client: form,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div className="container-custom" style={{ maxWidth: '680px' }}>

        {/* Titre */}
        <div className="text-center mb-32">
          <h1 className="section-title">Prendre Rendez-vous</h1>
          <div className="gold-divider" />
        </div>

        {/* Bannière d'alerte : TOUS LES CRÉNEAUX FERMÉS PAR LE COIFFEUR */}
        {allSlotsClosed && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderLeft: '4px solid #DC2626',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '16px 18px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
          }}>
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚫</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#991B1B', marginBottom: '4px' }}>
                Prise de rendez-vous suspendue
              </div>
              <div style={{ fontSize: '0.84rem', color: '#B91C1C', lineHeight: 1.5 }}>
                Mohamed Hechi a temporairement verrouillé tous les créneaux de réservation.
                Tous les horaires sont actuellement désactivés (affichés en gris).
              </div>
            </div>
          </div>
        )}

        {/* Bannière informative statut salon (quand ouvert/fermé normalement) */}
        {!shopOpen && !allSlotsClosed && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderLeft: '4px solid #D97706',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🔔</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400E', marginBottom: '3px' }}>
                Le salon est actuellement fermé
              </div>
              <div style={{ fontSize: '0.82rem', color: '#B45309', lineHeight: 1.5 }}>
                Vous pouvez tout de même déposer votre demande de réservation.
                Mohamed Hechi la traitera dès la réouverture du salon.
              </div>
            </div>
          </div>
        )}

        {/* Stepper */}
        <Stepper current={step} />

        {/* ── ÉTAPE 1 : Service ── */}
        {step >= 1 && (
          <div className="animate-fadeInUp" style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              1 — Quel service souhaitez-vous ?
            </h2>
            <div className="service-grid">
              {/* Services standards (Coupe, Barbe, Combo, Brushing) */}
              {services.map(svc => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  selected={selectedService?.id === svc.id && !selectedService?.isFamily}
                  onClick={() => handleSelectService(svc)}
                />
              ))}

              {/* Carte / Bouton spécial Formule Famille */}
              <div
                className={`service-card famille-card${selectedService?.isFamily ? ' selected' : ''}`}
                onClick={() => setShowFamilleModal(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setShowFamilleModal(true)}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  border: selectedService?.isFamily ? '2px solid var(--red, #DC2626)' : '2px dashed var(--border-subtle, #CBD5E1)',
                }}
              >
                <span className="service-icon">👨‍👧‍👦</span>
                <h3 className="service-name">
                  {selectedService?.isFamily ? selectedService.name : 'Formule Famille'}
                </h3>
                <span className="service-duration">
                  ⏱ {selectedService?.isFamily ? `${selectedService.duration} min` : 'Dès 35 min'}
                </span>
                <p className="service-desc" style={{ marginTop: '12px' }}>
                  {selectedService?.isFamily
                    ? selectedService.description
                    : 'Père (20 min) + 15 min par enfant. Cliquez pour configurer !'}
                </p>
                <div style={{ marginTop: '16px' }}>
                  {selectedService?.isFamily ? (
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
                    }}>
                      ✓ Sélectionné
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-block',
                      background: '#EFF6FF',
                      color: 'var(--blue, #2563EB)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em',
                      padding: '5px 14px',
                      borderRadius: '100px',
                      border: '1px solid #BFDBFE',
                    }}>
                      👨‍👧 Choisir les enfants
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal sélecteur Famille */}
        <FamilleModal
          isOpen={showFamilleModal}
          onClose={() => setShowFamilleModal(false)}
          onConfirm={handleFamilleConfirm}
          initialCount={familleChildrenCount}
        />

        {/* ── ÉTAPE 2 : Date ── */}
        {step >= 2 && selectedService && (
          <div className="animate-fadeInUp" style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              2 — Choisissez une date
            </h2>
            <BookingCalendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              dayOffIndexes={dayOffIndexes}
            />
          </div>
        )}

        {/* ── ÉTAPE 3 : Créneau ── */}
        {step >= 3 && selectedDate && (
          <div className="animate-fadeInUp" style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              3 — Choisissez un créneau
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
              📅 {formatDateFR(selectedDate)} — Durée du service : <strong>{selectedService.duration} min</strong>
            </p>

            {/* Erreur créneau pris */}
            {apiError && (
              <div className="alert-danger" style={{ marginBottom: 16 }}>
                ⚠️ {apiError}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loading-spinner" />
                <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '0.875rem' }}>
                  Calcul des disponibilités en temps réel...
                </p>
              </div>
            ) : (
              <>
                {slots.length === 0 ? (
                  <div className="alert-gold">
                    😔 Aucun horaire disponible ce jour. Veuillez choisir une autre date.
                  </div>
                ) : (
                  <>
                    <div className="slots-grid">
                      {slots.map(slot => (
                        <TimeSlot
                          key={slot.time}
                          time={slot.time}
                          available={slot.available}
                          partial={slot.partial}
                          label={slot.label}
                          selected={selectedTime === slot.time}
                          onClick={() => handleSelectTime(slot.time)}
                        />
                      ))}
                    </div>

                    {/* Légende explicative */}
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '20px',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      padding: '12px',
                      background: '#F8FAFC',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid #E2E8F0',
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FFFFFF', border: '1.5px solid var(--border-subtle)', display: 'inline-block' }} />
                        Disponible
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FFFBEB', border: '1.5px solid #F59E0B', display: 'inline-block' }} />
                        Sous-créneau partiel
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F1F5F9', border: '1.5px solid #CBD5E1', display: 'inline-block' }} />
                        Occupé / Fermé (en gris)
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ÉTAPE 4 : Infos client ── */}
        {step >= 4 && selectedTime && (
          <div className="animate-fadeInUp">
            <h2 style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              4 — Vos informations
            </h2>

            {/* Récap */}
            <div className="card-dark" style={{ marginBottom: 24, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Service</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedService.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Durée : {selectedService.duration} min</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateFR(selectedDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Heure</div>
                  <div style={{ fontWeight: 600, color: 'var(--gold, #B45309)' }}>{selectedTime}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fin prévue : {calcEndTime(selectedTime, selectedService.duration)}</div>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="client-name">Nom et prénom *</label>
                <input
                  id="client-name"
                  type="text"
                  className="form-input"
                  placeholder="Ex : Ahmed Ben Ali"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoComplete="name"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="client-phone">Téléphone *</label>
                <input
                  id="client-phone"
                  type="tel"
                  className="form-input"
                  placeholder="Ex : 22 123 456"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                  inputMode="tel"
                />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>
                * Aucun compte requis. Vos données ne sont utilisées que pour votre rendez-vous.
              </p>

              <button
                type="submit"
                className="btn-gold w-100"
                disabled={submitting}
                style={{ fontSize: '1rem', padding: '16px', justifyContent: 'center' }}
                id="btn-confirm-booking"
              >
                <span>
                  {submitting
                    ? '⏳ Confirmation en cours...'
                    : '✓ Confirmer le Rendez-vous'}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
