// ============================================================
// src/data/services.js — Source statique des services GAR3A
// ============================================================
// Ces données sont affichées IMMÉDIATEMENT (0ms) au chargement.
// Google Apps Script (Sheets) reste la source d'autorité :
// si Mohamed modifie un service dans le Sheet, la mise à jour
// arrive silencieusement en arrière-plan (max 30 min via cache).
//
// ⚠️ Garder les IDs synchronisés avec Google Sheets (S001…S005).
// ============================================================

export const STATIC_SERVICES = [
  {
    id: 'S001',
    name: 'Coupe',
    duration: 20,
    description: 'Coupe de cheveux professionnelle',
    icon: '✂️',
    active: true,
  },
  {
    id: 'S002',
    name: 'Barbe',
    duration: 15,
    description: 'Taille et soin de la barbe',
    icon: '🧔',
    active: true,
  },
  {
    id: 'S003',
    name: 'Coupe + Barbe',
    duration: 35,
    description: 'Le combo complet — coupe et barbe',
    icon: '✨',
    active: true,
  },
  {
    id: 'S004',
    name: 'Brushing',
    duration: 10,
    description: 'Brushing rapide et mise en forme',
    icon: '💨',
    active: true,
  },
  {
    id: 'S005',
    name: 'Coupe + Barbe + Brushing',
    duration: 45,
    description: 'La formule complète : coupe, barbe et brushing',
    icon: '💈',
    active: true,
  },
];
