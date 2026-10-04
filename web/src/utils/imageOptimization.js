/**
 * Image optimization utilities for BeautyFlow
 * Provides functions for responsive images, lazy loading, and blur placeholders
 */

/**
 * Generate optimized image URL (placeholder for future CDN integration)
 * @param {string} url - Original image URL
 * @param {number} [width] - Desired width
 * @param {number} [height] - Desired height
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(url, width, height) {
  if (!url) return "";

  // For future CDN integration (e.g., Cloudinary, Imgix)
  // Example: return `https://cdn.example.com/image?url=${url}&w=${width}&h=${height}&fit=cover`;

  // For now, return original URL
  // When integrating with a CDN, replace this with actual optimization logic
  return url;
}

/**
 * Generate srcset attribute for responsive images
 * @param {string} url - Original image URL
 * @returns {string} srcset attribute value
 */
export function generateSrcSet(url) {
  if (!url) return "";

  const widths = [320, 640, 768, 1024, 1280, 1536];

  // For future CDN integration
  // const srcset = widths.map(w => `${getOptimizedImageUrl(url, w)} ${w}w`).join(', ');

  // For now, return single source
  return `${url} 1x`;
}

/**
 * Generate blur placeholder for images
 * @param {number} [width=20] - Placeholder width
 * @param {number} [height=20] - Placeholder height
 * @returns {string} Data URL for blur placeholder
 */
export function getImagePlaceholder(width = 20, height = 20) {
  // Generate a simple gray blur placeholder
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Fill with gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f0f0f0");
  gradient.addColorStop(1, "#e0e0e0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/**
 * Lazy load images using Intersection Observer
 * @param {HTMLElement} element - Image element to observe
 * @param {Function} callback - Callback when image enters viewport
 */
export function lazyLoadImage(element, callback) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(element);
        }
      });
    },
    {
      rootMargin: "50px",
    },
  );

  observer.observe(element);
}

/**
 * Preload critical images
 * @param {string[]} urls - Array of image URLs to preload
 */
export function preloadImages(urls) {
  urls.forEach((url) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
  });
}
