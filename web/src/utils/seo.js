/**
 * SEO and metadata utilities for BeautyFlow
 * Generates meta tags, structured data, and canonical URLs
 */

/**
 * Generate meta tags for a page
 * @param {Object} options - Meta tag options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} [options.keywords] - SEO keywords
 * @param {string} [options.ogImage] - Open Graph image URL
 * @param {string} [options.canonicalUrl] - Canonical URL
 * @returns {Object} Meta tags object for React Helmet
 */
export function generateMetaTags({
  title,
  description,
  keywords,
  ogImage,
  canonicalUrl,
}) {
  const siteName = "BeautyFlow";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultImage = ogImage || "/og-image.png";
  const url = canonicalUrl || window.location.href;

  return {
    title: fullTitle,
    meta: [
      { name: "description", content: description },
      ...(keywords ? [{ name: "keywords", content: keywords }] : []),
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:image", content: defaultImage },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: siteName },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: defaultImage },
    ],
    link: [{ rel: "canonical", href: url }],
  };
}

/**
 * Generate Schema.org structured data
 * @param {string} type - Schema type (LocalBusiness, Service, Review, Person)
 * @param {Object} data - Data for the schema
 * @returns {Object} JSON-LD structured data
 */
export function generateStructuredData(type, data) {
  const schemas = {
    LocalBusiness: {
      "@context": "https://schema.org",
      "@type": "HairSalon",
      name: data.name || "BeautyFlow",
      description: data.description,
      image: data.image,
      address: {
        "@type": "PostalAddress",
        streetAddress: data.address,
        addressLocality: data.city,
        postalCode: data.postalCode,
        addressCountry: data.country || "US",
      },
      telephone: data.phone,
      email: data.email,
      url: data.website,
      openingHoursSpecification: data.openingHours,
      priceRange: data.priceRange || "$$",
      aggregateRating: data.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: data.rating,
            reviewCount: data.reviewCount,
          }
        : undefined,
    },
    Service: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: data.name,
      description: data.description,
      provider: {
        "@type": "HairSalon",
        name: data.providerName || "BeautyFlow",
      },
      offers: {
        "@type": "Offer",
        price: data.price,
        priceCurrency: data.currency || "USD",
      },
    },
    Review: {
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: {
        "@type": "HairSalon",
        name: data.salonName || "BeautyFlow",
      },
      author: {
        "@type": "Person",
        name: data.authorName,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: data.rating,
        bestRating: 5,
      },
      reviewBody: data.comment,
      datePublished: data.date,
    },
    Person: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: data.name,
      jobTitle: data.jobTitle,
      worksFor: {
        "@type": "HairSalon",
        name: data.salonName || "BeautyFlow",
      },
      image: data.image,
      description: data.bio,
    },
  };

  return schemas[type] || null;
}

/**
 * React hook for managing meta tags with React Helmet
 * @param {Object} options - Meta tag options
 * @returns {Object} Meta tags for React Helmet
 */
export function useMetaTags(options) {
  return generateMetaTags(options);
}
