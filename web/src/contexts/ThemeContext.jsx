// /src/contexts/ThemeContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children, defaultTheme = 'system' }) => {
  const [theme, setTheme] = useState(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // ✅ Récupérer le thème système
  const getSystemTheme = useCallback(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // ✅ Appliquer le thème au DOM
  const applyTheme = useCallback((newTheme) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && getSystemTheme() === 'dark');
    
    // ✅ Supprimer les classes existantes
    root.classList.remove('light', 'dark');
    
    // ✅ Ajouter la classe appropriée
    root.classList.add(isDark ? 'dark' : 'light');
    
    // ✅ Ajouter un attribut pour les sélecteurs CSS
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // ✅ Mettre à jour la couleur de fond
    root.style.backgroundColor = isDark ? 'hsl(220, 25%, 8%)' : 'hsl(220, 25%, 97%)';
    
    // ✅ Mettre à jour la meta theme-color
    const metaTheme = document.querySelector("meta[name='theme-color']");
    if (metaTheme) {
      metaTheme.content = isDark ? '#1a1a2e' : '#ec4899';
    }
  }, [getSystemTheme]);

  // ✅ Initialisation
  useEffect(() => {
    setMounted(true);
    
    const savedTheme = localStorage.getItem('theme');
    let initialTheme = defaultTheme;
    
    if (savedTheme) {
      initialTheme = savedTheme;
    }
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, [defaultTheme, applyTheme]);

  // ✅ Appliquer le thème quand il change
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme, mounted, applyTheme]);

  // ✅ Écouter les changements de thème système
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted, applyTheme]);

  // ✅ Fonctions de changement de thème
  const setLightTheme = useCallback(() => {
    setTheme('light');
  }, []);

  const setDarkTheme = useCallback(() => {
    setTheme('dark');
  }, []);

  const setSystemTheme = useCallback(() => {
    setTheme('system');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    isDark: theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark'),
    isLight: theme === 'light' || (theme === 'system' && getSystemTheme() === 'light'),
    isSystem: theme === 'system',
    mounted,
    getSystemTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    console.warn('useTheme must be used within a ThemeProvider, using default values');
    return {
      theme: 'system',
      setTheme: () => {},
      toggleTheme: () => {},
      setLightTheme: () => {},
      setDarkTheme: () => {},
      setSystemTheme: () => {},
      isDark: false,
      isLight: true,
      isSystem: true,
      mounted: true,
      getSystemTheme: () => 'light',
    };
  }
  return context;
};

export default ThemeContext;