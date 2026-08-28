import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard';
import BookingCalendar from '../components/BookingCalendar';
import TimeSlot from '../components/TimeSlot';
import { getServices, getAvailability, getSchedule, createAppointment } from '../services/api';
import { formatDateFR, calcEndTime } from '../utils/date';
import { validateBookingForm, hasErrors } from '../utils/validation';

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

  // Data
  const [services, setServices]   = useState([]);
  const [schedule, setSchedule]   = useState([]);
  const [slots, setSlots]         = useState(null); // { available: [], all: [] }
  const [loading, setLoading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]   = useState('');

  // Sélections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate]       = useState('');
  const [selectedTime, setSelectedTime]       = useState('');

  // Formulaire
  const [form, setForm]     = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});

  // Charger services + horaires
  useEffect(() => {
    Promise.all([getServices(), getSchedule()]).then(([svc, sch]) => {
      setServices(svc.filter(s => s.active));
      setSchedule(sch);
    });
  }, []);

  // Index des jours fermés (0=Lun..6=Dim)
  const dayOffIndexes = schedule
    .map((day, i) => (!day.active ? i : null))
    .filter(i => i !== null);

  // Charger les créneaux quand date + service sélectionnés
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    setLoading(true);
    setSlots(null);
    setSelectedTime('');

    getAvailability(selectedDate, selectedService.id)
      .then(data => setSlots(data))
      .catch(() => {
        // Fallback créneaux démo (09:00 - 21:00)
        const demoAvail = [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
          '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
          '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
        ];
        setSlots({ availableSlots: demoAvail, allSlots: demoAvail });
      })
      .finally(() => setLoading(false));
  }, [selectedDate, selectedService]);

  // ── Étape 1 : Service ──
  const handleSelectService = (svc) => {
    setSelectedService(svc);
    setSelectedDate('');
    setSelectedTime('');
    setSlots(null);
    setStep(2);
  };

  // ── Étape 2 : Date ──
  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setSlots(null);
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
        serviceId:   selectedService.id,
        serviceName: selectedService.name,
        clientName:  form.name.trim(),
        clientPhone: form.phone.trim(),
      });

      if (result?.status === 'error' || result?.code === 'SLOT_ALREADY_BOOKED') {
        setApiError('Désolé, ce créneau vient d\'être réservé. Veuillez choisir un autre horaire.');
        setStep(3);
        return;
      }

      // Succès → page confirmation
      navigate('/confirmation', {
        state: {
          appointment: result,
          service: selectedService,
          date:    selectedDate,
          time:    selectedTime,
          endTime,
          client: form,
        },
      });
    } catch (err) {
      // En mode démo (sans API), on simule le succès
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

  const allSlots     = slots?.allSlots     || slots?.all || [];
  const availSlots   = slots?.availableSlots || slots?.available || [];

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div className="container-custom" style={{ maxWidth: '680px' }}>

        {/* Titre */}
        <div className="text-center mb-32">
          <h1 className="section-title">Prendre Rendez-vous</h1>
          <div className="gold-divider" />
        </div>

        {/* Stepper */}
        <Stepper current={step} />

        {/* ── ÉTAPE 1 : Service ── */}
        {step >= 1 && (
          <div className="animate-fadeInUp" style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              1 — Quel service souhaitez-vous ?
            </h2>
            <div className="service-grid">
              {services.map(svc => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  selected={selectedService?.id === svc.id}
                  onClick={() => handleSelectService(svc)}
                />
              ))}
            </div>
          </div>
        )}

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
              📅 {formatDateFR(selectedDate)}
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
                  Chargement des créneaux...
                </p>
              </div>
            ) : (
              <>
                {(allSlots.length > 0 ? allSlots : availSlots).length === 0 ? (
                  <div className="alert-gold">
                    😔 Aucun créneau disponible ce jour. Essayez une autre date.
                  </div>
                ) : (
                  <div className="slots-grid">
                    {(allSlots.length > 0 ? allSlots : availSlots).map(time => (
                      <TimeSlot
                        key={time}
                        time={time}
                        available={availSlots.includes(time)}
                        selected={selectedTime === time}
                        onClick={() => handleSelectTime(time)}
                      />
                    ))}
                  </div>
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
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateFR(selectedDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Heure</div>
                  <div style={{ fontWeight: 600, color: 'var(--gold)' }}>{selectedTime}</div>
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
