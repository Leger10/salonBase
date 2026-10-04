// /src/utils/updateManifest.js
export const updateManifest = (tenant) => {
  const manifest = {
    name: tenant?.name || 'BeautyFlow',
    short_name: tenant?.name?.slice(0, 12) || 'BeautyFlow',
    description: tenant?.description || 'Plateforme de gestion de salons de beauté',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: tenant?.primary_color || '#ec4899',
    icons: [
      {
        src: tenant?.logo_url || '/favicon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      },
      {
        src: tenant?.logo_url || '/favicon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };

  // Mettre à jour le manifeste dans le DOM
  const manifestLink = document.querySelector("link[rel='manifest']");
  if (manifestLink) {
    // Créer un blob URL pour le manifeste dynamique
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    manifestLink.href = url;
  }
};