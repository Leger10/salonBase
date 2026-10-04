// /src/components/DynamicFavicon.jsx
import { useEffect } from 'react';
import { useActiveTenant } from '@/contexts/ActiveTenantContext';

export default function DynamicFavicon() {
  const { activeTenant, isShowcase } = useActiveTenant();

  useEffect(() => {
    if (isShowcase && activeTenant) {
      // ✅ Mettre à jour le favicon avec le logo du tenant
      const link = document.querySelector("link[rel*='icon']");
      if (link && activeTenant.logo_url) {
        link.href = activeTenant.logo_url;
      }
      
      // ✅ Mettre à jour le titre
      document.title = `${activeTenant.name} - BeautyFlow`;
      
      // ✅ Mettre à jour la couleur de thème
      const metaTheme = document.querySelector("meta[name='theme-color']");
      if (metaTheme && activeTenant.primary_color) {
        metaTheme.content = activeTenant.primary_color;
      }
    }
  }, [activeTenant, isShowcase]);

  return null;
}