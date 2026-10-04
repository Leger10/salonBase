// /src/contexts/TenantContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const { currentUser } = useAuth();
  const [tenantSettings, setTenantSettings] = useState(null);
  const [homeSettings, setHomeSettings] = useState(null);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger les données du tenant
  const loadTenantData = useCallback(async (tenantId) => {
    if (!tenantId) {
      setTenantSettings(null);
      setHomeSettings(null);
      return;
    }

    try {
      // Charger les infos du tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenantSettings(tenant);

      // Charger les paramètres du home
      const { data: home, error: homeError } = await supabase
        .from('tenant_home_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (homeError && homeError.code !== 'PGRST116') {
        console.error('Error loading home settings:', homeError);
      }
      setHomeSettings(home || null);

    } catch (error) {
      console.error('Error loading tenant data:', error);
    }
  }, []);

  // Charger les paramètres de la plateforme (Super Admin)
  const loadPlatformSettings = useCallback(async () => {
    try {
      console.log('🔍 Chargement des paramètres de la plateforme...');
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        setPlatformSettings(data);
        console.log('✅ Platform settings chargés:', {
          branding: data.branding,
          hero: data.hero,
          cta: data.cta,
          general: data.general
        });
      } else if (error) {
        console.log('⚠️ Aucun paramètre de plateforme trouvé');
      }
    } catch (error) {
      console.error('Error loading platform settings:', error);
    }
  }, []);

  // Rafraîchir toutes les données
  const refreshAll = useCallback(async () => {
    setLoading(true);
    const tenantId = currentUser?.profile?.tenant_id;
    await Promise.all([
      loadTenantData(tenantId),
      loadPlatformSettings()
    ]);
    setLoading(false);
  }, [currentUser, loadTenantData, loadPlatformSettings]);

  // Rafraîchir les données du tenant uniquement
  const refreshTenant = useCallback(async () => {
    const tenantId = currentUser?.profile?.tenant_id;
    await loadTenantData(tenantId);
  }, [currentUser, loadTenantData]);

  // Rafraîchir les paramètres de la plateforme uniquement
  const refreshPlatform = useCallback(async () => {
    await loadPlatformSettings();
  }, [loadPlatformSettings]);

  // Chargement initial
  useEffect(() => {
    const tenantId = currentUser?.profile?.tenant_id;
    Promise.all([
      loadTenantData(tenantId),
      loadPlatformSettings()
    ]).finally(() => setLoading(false));
  }, [currentUser, loadTenantData, loadPlatformSettings]);

  return (
    <TenantContext.Provider value={{ 
      tenantSettings, 
      homeSettings,
      platformSettings,
      loading, 
      refreshTenant,
      refreshPlatform,
      refreshAll
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};