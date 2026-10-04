// ============================================
// UTILITAIRES - BEAUTYFLOW
// ============================================

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// 1. FONCTIONS DE STYLE (UI)
// ============================================

/**
 * Fusionne les classes Tailwind avec clsx et tailwind-merge
 * Utilisé par tous les composants UI
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================
// 2. FONCTIONS DE DATE
// ============================================

/**
 * Formate une date en temps relatif (ex: "il y a 2 jours")
 */
export const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
};

/**
 * Formate une date en français
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options
  });
};

/**
 * Formate une date et heure en français
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ============================================
// 3. FONCTIONS POUR LES CATÉGORIES D'ACTUALITÉS
// ============================================

/**
 * Retourne les classes CSS pour une catégorie d'article
 */
export const getCategoryColor = (category) => {
  const colors = {
    'Offre/Promotion': 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200',
    'News': 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200',
    'Post': 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200',
    'Offre': 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200',
    'Promotion': 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
  };
  return colors[category] || 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
};

/**
 * Retourne le libellé d'une catégorie avec emoji
 */
export const getCategoryLabel = (category) => {
  const labels = {
    'Offre/Promotion': '🎁 Offre',
    'Offre': '🎁 Offre',
    'Promotion': '🎁 Promotion',
    'News': '📰 Actualité',
    'Post': '📝 Article'
  };
  return labels[category] || category || 'Non classé';
};

// ============================================
// 4. FONCTIONS DE TEXTE
// ============================================

/**
 * Tronque un texte à une longueur donnée
 */
export const truncateExcerpt = (text, length = 120) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
};

/**
 * Extrait les initiales d'un nom
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ============================================
// 5. FONCTIONS POUR LES ARTICLES
// ============================================

/**
 * Vérifie si un article est publié
 */
export const isArticlePublished = (article) => {
  if (!article) return false;
  if (article.status !== 'Published') return false;
  
  if (article.scheduled_publish_date) {
    const scheduledDate = new Date(article.scheduled_publish_date);
    return isPast(scheduledDate);
  }
  
  return true;
};

// ============================================
// 6. FONCTIONS DE FORMATAGE (PRIX, NOMBRES)
// ============================================

/**
 * Formate un prix en FCFA
 */
export const formatPrice = (price) => {
  if (!price && price !== 0) return '0 FCFA';
  return `${price.toLocaleString()} FCFA`;
};

/**
 * Formate un nombre avec séparateur de milliers
 */
export const formatNumber = (number) => {
  if (!number && number !== 0) return '0';
  return number.toLocaleString();
};

// ============================================
// 7. FONCTIONS DE STATUT
// ============================================

/**
 * Retourne les classes CSS pour un statut
 */
export const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Retourne le libellé d'un statut
 */
export const getStatusLabel = (status) => {
  const labels = {
    active: 'Actif',
    inactive: 'Inactif',
    pending: 'En attente',
    confirmed: 'Confirmé',
    completed: 'Terminé',
    cancelled: 'Annulé',
    expired: 'Expiré'
  };
  return labels[status] || status || 'Inconnu';
};