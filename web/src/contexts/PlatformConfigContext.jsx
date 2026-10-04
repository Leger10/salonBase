// /src/contexts/PlatformConfigContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const PlatformConfigContext = createContext();

export function PlatformConfigProvider({ children }) {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        
        // Vérifier si l'utilisateur est super admin
        const role = currentUser?.profile?.role || currentUser?.role;
        setIsSuperAdmin(role === 'super_admin');

        // Récupérer la configuration de la plateforme
        const { data, error } = await supabase
          .from('platform_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (error) {
          console.error('❌ Erreur chargement config:', error);
          // Utiliser les valeurs par défaut
          setConfig(getDefaultConfig());
        } else if (data) {
          setConfig(data);
        } else {
          // Pas de config, utiliser les valeurs par défaut
          setConfig(getDefaultConfig());
        }
      } catch (error) {
        console.error('❌ Erreur:', error);
        setConfig(getDefaultConfig());
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [currentUser]);

  const getDefaultConfig = () => ({
    general: {
      platform_name: 'BeautyFlow',
      platform_description: 'Plateforme de gestion de salons de beauté',
      contact_email: 'contact@beautyflow.com',
      contact_phone: '+226 54 32 92 99',
      address: 'Ouagadougou, Burkina Faso',
    },
    branding: {
      primary_color: '#ec4899',
      secondary_color: '#06b6d4',
      accent_color: '#8b5cf6',
      logo_url: '',
      cover_image: '',
    },
    hero: {
      title: 'Prenez soin de vous avec BeautyFlow',
      subtitle: 'La plateforme complète pour réserver vos soins beauté',
      badge_text: '✨ Nouveau : Programme de fidélité amélioré',
      show_stats: true,
    },
    footer: {
      show_social: true,
      copyright: 'BeautyFlow',
    },
    social: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
    }
  });

  const value = {
    config,
    loading,
    isSuperAdmin,
    // Helper pour accéder facilement aux propriétés
    get: (path, defaultValue) => {
      if (!config) return defaultValue;
      const parts = path.split('.');
      let result = config;
      for (const part of parts) {
        if (result && typeof result === 'object' && part in result) {
          result = result[part];
        } else {
          return defaultValue;
        }
      }
      return result || defaultValue;
    },
    // Couleur primaire
    get primaryColor() {
      return config?.branding?.primary_color || '#ec4899';
    },
    // Nom de la plateforme
    get platformName() {
      return config?.general?.platform_name || 'BeautyFlow';
    },
    // Description
    get platformDescription() {
      return config?.general?.platform_description || 'Plateforme de gestion de salons de beauté';
    },
    // Logo
    get logoUrl() {
      return config?.branding?.logo_url || '';
    },
    // Contact email
    get contactEmail() {
      return config?.general?.contact_email || 'contact@beautyflow.com';
    },
    // Contact phone
    get contactPhone() {
      return config?.general?.contact_phone || '+225 07 12 275 374';
    },
    // Address
    get address() {
      return config?.general?.address || 'Ouagadougou, Burkina Faso';
    }
  };

  return (
    <PlatformConfigContext.Provider value={value}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig() {
  const context = useContext(PlatformConfigContext);
  if (!context) {
    throw new Error('usePlatformConfig must be used within a PlatformConfigProvider');
  }
  return context;
}