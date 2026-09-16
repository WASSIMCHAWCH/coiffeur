import { createContext, useContext, useState, useEffect } from 'react';

const ShopStatusContext = createContext(null);

const STORAGE_KEY = 'gar3a_shop_open';
const STORAGE_SLOTS_KEY = 'gar3a_all_slots_closed';

export function ShopStatusProvider({ children }) {
  // ── Statut global du salon (ouvert / fermé) ──
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  // ── Verrouillage complet des créneaux (bouton coiffeur) ──
  const [allSlotsClosed, setAllSlotsClosed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_SLOTS_KEY);
    return stored === 'true';
  });

  // Persister dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SLOTS_KEY, String(allSlotsClosed));
  }, [allSlotsClosed]);

  // Synchronisation inter-onglets en temps réel
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setIsOpen(e.newValue !== 'false');
      }
      if (e.key === STORAGE_SLOTS_KEY) {
        setAllSlotsClosed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggle = () => setIsOpen(prev => !prev);
  const setOpen = () => setIsOpen(true);
  const setClosed = () => setIsOpen(false);

  const toggleAllSlotsClosed = () => setAllSlotsClosed(prev => !prev);

  return (
    <ShopStatusContext.Provider value={{
      isOpen,
      toggle,
      setOpen,
      setClosed,
      allSlotsClosed,
      setAllSlotsClosed,
      toggleAllSlotsClosed,
    }}>
      {children}
    </ShopStatusContext.Provider>
  );
}

// Hook pratique
export function useShopStatus() {
  const ctx = useContext(ShopStatusContext);
  if (!ctx) throw new Error('useShopStatus must be used inside ShopStatusProvider');
  return ctx;
}
