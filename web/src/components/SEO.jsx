// src/components/SEO.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

const SEO = ({
  title = "BeautyFlow - Plateforme de gestion de salons de beauté",
  description = "La plateforme complète pour gérer votre salon de beauté, réserver des rendez-vous et fidéliser vos clients au Burkina Faso et en Afrique.",
  keywords = "beauté, salon, gestion, rendez-vous, fidélité, bien-être, Burkina Faso, Afrique",
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl = "https://beautyflow.com",
  twitterCard = "summary_large_image",
  twitterTitle,
  twitterDescription,
  twitterImage,
  canonicalUrl = "https://beautyflow.com",
  robots = "index, follow",
  language = "fr-FR",
  author = "BeautyFlow",
  publishedTime,
  modifiedTime,
  articleSection,
  tags = [],
  noIndex = false,
  schemaJson,
  favicon,
}) => {
  const baseUrl = "https://beautyflow.com";
  const fullUrl = canonicalUrl.startsWith("http")
    ? canonicalUrl
    : `${baseUrl}${canonicalUrl}`;

  const finalOgTitle = ogTitle || title;
  const finalOgDescription = ogDescription || description;
  const finalTwitterTitle = twitterTitle || title;
  const finalTwitterDescription = twitterDescription || description;

  const finalOgImage = ogImage?.startsWith("http")
    ? ogImage
    : ogImage
      ? `${baseUrl}${ogImage}`
      : `${baseUrl}/og-image.jpg`;
  const finalTwitterImage = twitterImage?.startsWith("http")
    ? twitterImage
    : twitterImage
      ? `${baseUrl}${twitterImage}`
      : `${baseUrl}/twitter-image.jpg`;
  const finalFavicon = favicon || "/favicon.ico";

  return (
    <Helmet>
      {/* Métadonnées de base */}
      <html lang={language} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : robots} />
      <meta name="author" content={author} />

      {/* Vérification des moteurs de recherche */}
      <meta name="google-site-verification" content="VOTRE_CODE_GOOGLE" />
      <meta name="yandex-verification" content="VOTRE_CODE_YANDEX" />
      <meta name="msvalidate.01" content="VOTRE_CODE_BING" />
      
      <link rel="canonical" href={fullUrl} />

      {/* Favicon - Version complète */}
      <link rel="icon" type="image/x-icon" href={finalFavicon} />
      <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <meta name="apple-mobile-web-app-title" content="BeautyFlow" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:site_name" content="BeautyFlow" />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={finalTwitterTitle} />
      <meta name="twitter:description" content={finalTwitterDescription} />
      <meta name="twitter:image" content={finalTwitterImage} />

      {/* Article spécifique */}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {articleSection && (
        <meta property="article:section" content={articleSection} />
      )}
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Thème et couleurs */}
      <meta name="theme-color" content="#ec4899" />
      <meta name="msapplication-TileColor" content="#ec4899" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="format-detection" content="telephone=yes" />

      {/* Schema.org JSON-LD */}
      {schemaJson && (
        <script type="application/ld+json">{JSON.stringify(schemaJson)}</script>
      )}
    </Helmet>
  );
};

export default SEO;