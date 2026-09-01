import { createContext, useContext, useState, useEffect } from 'react';

const ShopStatusContext = createContext(null);

const STORAGE_KEY = 'gar3a_shop_open';

export function ShopStatusProvider({ children }) {
  const [isOpen, setIsOpen] = useState(() => {
    // Lire depuis localStorage (défaut : ouvert)
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  // Persister dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  const toggle = () => setIsOpen(prev => !prev);
  const setOpen  = () => setIsOpen(true);
  const setClosed = () => setIsOpen(false);

  return (
    <ShopStatusContext.Provider value={{ isOpen, toggle, setOpen, setClosed }}>
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
