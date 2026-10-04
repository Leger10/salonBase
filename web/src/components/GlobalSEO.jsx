// /src/components/GlobalSEO.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

const GlobalSEO = () => {
  return (
    <Helmet>
      {/* Métadonnées globales */}
      <html lang="fr-FR" />
      <meta name="theme-color" content="#ec4899" />
      <meta name="msapplication-TileColor" content="#ec4899" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="format-detection" content="telephone=yes" />
      <meta name="apple-mobile-web-app-title" content="BeautyFlow" />
      
      {/* Favicons */}
      <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Vérification des moteurs de recherche */}
      <meta name="google-site-verification" content="VOTRE_CODE_GOOGLE" />
      <meta name="yandex-verification" content="VOTRE_CODE_YANDEX" />
      <meta name="msvalidate.01" content="VOTRE_CODE_BING" />
      
      {/* Open Graph global */}
      <meta property="og:site_name" content="BeautyFlow" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:type" content="website" />
      
      {/* Twitter Card global */}
      <meta name="twitter:card" content="summary_large_image" />
      
      {/* Canonical par défaut */}
      <link rel="canonical" href="https://beautyflow.com/" />
    </Helmet>
  );
};

export default GlobalSEO;