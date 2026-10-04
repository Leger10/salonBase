// /src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { HelmetProvider } from 'react-helmet-async';

// ============================================
// ✅ GESTION DES LIENS PROFONDS PWA
// ============================================
const handleDeepLinks = () => {
  const currentPath = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const source = searchParams.get('source');
  
  // Détecter le mode PWA
  const isPWA = source === 'pwa' || 
                window.navigator.standalone || 
                window.matchMedia('(display-mode: standalone)').matches ||
                document.documentElement.getAttribute('data-pwa') === 'true';
  
  if (isPWA) {
    console.log('📱 Application en mode PWA détectée');
    console.log('📍 Chemin actuel:', currentPath);
    
    // Si on est sur la page d'accueil
    if (currentPath === '/' || currentPath === '') {
      // Vérifier les liens profonds sauvegardés
      const savedDeepLink = localStorage.getItem('beautyflow_deep_link');
      const savedSlug = localStorage.getItem('beautyflow_last_slug');
      
      console.log('🔗 Lien profond sauvegardé:', savedDeepLink);
      console.log('📌 Slug sauvegardé:', savedSlug);
      
      // Priorité au lien complet
      if (savedDeepLink && savedDeepLink !== '/' && savedDeepLink !== '' && savedDeepLink !== 'null') {
        console.log('🔄 Restauration du lien profond:', savedDeepLink);
        window.location.replace(savedDeepLink);
        return true;
      }
      
      // Sinon, utiliser le slug
      if (savedSlug && savedSlug !== 'null') {
        const deepLink = `/showcase/${savedSlug}`;
        console.log('🔄 Restauration du showcase:', deepLink);
        window.location.replace(deepLink);
        return true;
      }
    }
    
    // Sauvegarder l'URL actuelle si c'est un showcase
    if (currentPath.includes('/showcase/')) {
      const slug = currentPath.split('/showcase/')[1]?.split('/')[0];
      if (slug && slug !== 'null') {
        localStorage.setItem('beautyflow_last_slug', slug);
        localStorage.setItem('beautyflow_deep_link', currentPath + window.location.search);
        console.log('💾 Lien profond sauvegardé:', currentPath + window.location.search);
      }
    }
  }
  
  return false;
};

// ============================================
// ✅ FORCER LA DÉSACTIVATION DES SERVICE WORKERS
// ============================================
const forceDisableServiceWorkers = () => {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.log('✅ ServiceWorker désinscrit');
          });
        })
        .catch(err => console.debug('SW cleanup error:', err));
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SKIP_WAITING'
        });
      }
    }
    
    if ('caches' in window) {
      caches.keys()
        .then(keys => {
          keys.forEach(key => {
            caches.delete(key);
            console.log('✅ Cache supprimé:', key);
          });
        })
        .catch(err => console.debug('Cache cleanup error:', err));
    }
  } catch (error) {
    console.debug('SW force disable error:', error);
  }
};

// ============================================
// ✅ INTERCEPTER LES ERREURS SW
// ============================================
const interceptSWErrors = () => {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register = function(...args) {
      console.warn('🚫 ServiceWorker registration blocked');
      return Promise.reject(new Error('ServiceWorker registration disabled'));
    };
  }

  window.addEventListener('error', (event) => {
    if (event.message?.includes('ServiceWorker') || 
        event.message?.includes('service worker') ||
        event.message?.includes('InvalidStateError')) {
      event.preventDefault();
      event.stopPropagation();
      console.debug('🔇 SW error ignored:', event.message);
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('ServiceWorker') ||
        event.reason?.message?.includes('service worker') ||
        event.reason?.name === 'InvalidStateError') {
      event.preventDefault();
      event.stopPropagation();
      console.debug('🔇 SW rejection ignored:', event.reason?.message);
      return true;
    }
  }, true);
};

// ============================================
// ✅ SCRIPT POUR JOUER LES SONS
// ============================================
const createAudioPlayer = () => {
  window.audioPlayer = {
    play: async (url) => {
      try {
        const audio = new Audio();
        audio.src = url + '?t=' + Date.now();
        audio.volume = 0.5;
        await audio.play();
        return audio;
      } catch (error) {
        console.debug('Audio play error:', error);
        return window.audioPlayer.playFallback();
      }
    },
    playFallback: () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        return true;
      } catch (e) {
        return false;
      }
    }
  };
};

// ============================================
// ✅ INITIALISATION
// ============================================
const initApp = () => {
  // Gérer les liens profonds AVANT le rendu
  const deepLinkHandled = handleDeepLinks();
  
  if (!deepLinkHandled) {
    forceDisableServiceWorkers();
    interceptSWErrors();
    createAudioPlayer();
    
    ReactDOM.createRoot(document.getElementById('root')).render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
  }
};

// Lancer l'application
initApp();

window.addEventListener('load', () => {
  setTimeout(forceDisableServiceWorkers, 500);
});

window.addEventListener('beforeunload', () => {
  forceDisableServiceWorkers();
});

export { forceDisableServiceWorkers, createAudioPlayer, handleDeepLinks };