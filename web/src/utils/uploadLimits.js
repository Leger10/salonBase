// Limites d'envoi de fichiers, communes a TOUTE l'application (front) et au
// serveur (web/server/storage.js). Toute page qui affiche un champ de fichier
// doit afficher ces limites via <UploadHint /> et valider avec validateFile()
// AVANT l'envoi, pour que l'utilisateur sache toujours ce qui est accepte.

const KB = 1024;
const MB = 1024 * KB;

// Limites du plan gratuit Cloudinary (le stockage des medias passe par son CDN
// pour ne pas saturer l'hebergement Hostinger) : video 100 Mo, image 10 Mo.
export const MAX_VIDEO_MB = 100;
export const MAX_IMAGE_MB = 10;

export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * MB;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * MB;

export const VIDEO_FORMATS = ['MP4', 'WebM', 'MOV', 'M4V', 'OGG', 'AVI', 'MKV', 'WMV', 'FLV'];
export const IMAGE_FORMATS = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG', 'AVIF'];

/** Formate une taille en octets en francais ("200 Mo", "1,5 Mo"). */
export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 o';
  if (value < KB) return `${value} o`;
  if (value < MB) return `${Math.round(value / KB)} Ko`;
  const mo = value / MB;
  const rounded = mo >= 100 ? Math.round(mo) : Math.round(mo * 10) / 10;
  return `${rounded} Mo`;
}

export function isVideoFile(file) {
  if (!file) return false;
  if (file.type) return file.type.startsWith('video/');
  return /\.(mp4|webm|mov|m4v|ogg|ogv|avi|mkv|wmv|flv|mpg|mpeg|3gp|ts)$/i.test(file.name || '');
}

export function maxBytesFor(kind) {
  return kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

export function formatsFor(kind) {
  return kind === 'video' ? VIDEO_FORMATS : IMAGE_FORMATS;
}

/**
 * Valide un fichier avant envoi.
 * @param {File} file fichier selectionne
 * @param {'image'|'video'|'auto'} kind type attendu ('auto' devine via le mime)
 * @returns {{ ok: boolean, kind: string, message: string|null }}
 */
export function validateFile(file, kind = 'auto') {
  if (!file) return { ok: false, kind, message: 'Aucun fichier selectionne.' };

  const resolved = kind === 'auto' ? (isVideoFile(file) ? 'video' : 'image') : kind;
  const max = maxBytesFor(resolved);
  const label = resolved === 'video' ? 'La video' : "L'image";
  const formats = formatsFor(resolved);

  if (file.size > max) {
    return {
      ok: false,
      kind: resolved,
      message: `${file.name} pese ${formatBytes(file.size)} : ${label.toLowerCase()} doit faire ${formatBytes(max)} maximum.`,
    };
  }

  if (file.type) {
    const expected = `${resolved}/`;
    if (!file.type.startsWith(expected)) {
      return {
        ok: false,
        kind: resolved,
        message: `Format non pris en charge (${file.type}). Formats acceptes : ${formats.join(', ')}.`,
      };
    }
  }

  return { ok: true, kind: resolved, message: null };
}

/** Texte d'aide standard, egalement rendu par <UploadHint />. */
export function hintFor(kind = 'image') {
  const resolved = kind === 'video' ? 'video' : 'image';
  const formats = formatsFor(resolved).join(', ');
  const max = formatBytes(maxBytesFor(resolved));
  return `${resolved === 'video' ? 'Video' : 'Image'} (${formats}) - ${max} maximum`;
}
