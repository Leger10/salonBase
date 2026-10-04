// /src/contexts/ActiveTenantContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const ActiveTenantContext = createContext();

// Valeur par défaut pour éviter les erreurs
const defaultContextValue = {
  activeTenant: null,
  loading: false,
  isShowcase: false,
  fetchTenantBySlug: async () => {},
  getShowcaseLink: (path) => path,
};

export function ActiveTenantProvider({ children }) {
  const location = useLocation();
  const [activeTenant, setActiveTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isShowcase, setIsShowcase] = useState(false);

  const fetchTenantBySlug = async (slug) => {
    if (!slug) {
      setActiveTenant(null);
      setIsShowcase(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('subscription_status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setActiveTenant(data);
        setIsShowcase(true);
      } else {
        setActiveTenant(null);
        setIsShowcase(false);
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      setActiveTenant(null);
      setIsShowcase(false);
    } finally {
      setLoading(false);
    }
  };

  const getShowcaseLink = (path) => {
    if (isShowcase && activeTenant) {
      return `/showcase/${activeTenant.slug}${path}`;
    }
    return path;
  };

  // Vérifier si on est sur une page showcase
  useEffect(() => {
    const path = location.pathname;
    const isShowcasePath = path.startsWith('/showcase/');
    
    if (isShowcasePath) {
      const slug = path.split('/showcase/')[1];
      const cleanSlug = slug ? slug.split('/')[0] : null;
      if (cleanSlug) {
        fetchTenantBySlug(cleanSlug);
      } else {
        setActiveTenant(null);
        setIsShowcase(false);
        setLoading(false);
      }
    } else {
      setActiveTenant(null);
      setIsShowcase(false);
      setLoading(false);
    }
  }, [location.pathname]);

  const value = {
    activeTenant,
    loading,
    isShowcase,
    fetchTenantBySlug,
    getShowcaseLink,
  };

  return (
    <ActiveTenantContext.Provider value={value}>
      {children}
    </ActiveTenantContext.Provider>
  );
}

export function useActiveTenant() {
  const context = useContext(ActiveTenantContext);
  // ✅ Retourner une valeur par défaut si le contexte n'est pas disponible
  if (!context) {
    console.warn('useActiveTenant must be used within an ActiveTenantProvider');
    return {
      activeTenant: null,
      loading: false,
      isShowcase: false,
      fetchTenantBySlug: async () => {},
      getShowcaseLink: (path) => path,
    };
  }
  return context;
}