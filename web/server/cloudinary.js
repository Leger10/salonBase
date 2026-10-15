// Envoi des images et videos vers Cloudinary (CDN) au lieu du disque Hostinger.
//
// Pourquoi : les gros fichiers (videos) ne doivent pas consommer l'espace et la
// bande passante de l'hebergement mutualise. Le navigateur envoie le fichier a
// l'API Node (/api/storage/upload), qui le transmet a Cloudinary avec une
// signature calculee cote serveur (le secret ne quitte JAMAIS le serveur).
//
// Configuration (web/.env, jamais commite) :
//   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
// ou les trois variables separees CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET.
//
// Limites du plan gratuit Cloudinary : image 10 Mo, video 100 Mo.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { HttpError } from './middleware/auth.js';

export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'mov', 'm4v', 'ogv', 'ogg', 'avi', 'mkv', 'wmv', 'flv', 'mpg', 'mpeg', '3gp',
]);

/** Etendue du fichier (minuscule) : "mp4", "jpg"... */
export function extensionOf(objectPath) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(objectPath ?? ''));
  return match ? match[1].toLowerCase() : '';
}

export function resourceTypeFor(objectPath) {
  return VIDEO_EXTENSIONS.has(extensionOf(objectPath)) ? 'video' : 'image';
}

/** Public ID Cloudinary : le chemin sans extension (les "/" creent des dossiers). */
export function publicIdFor(objectPath) {
  return String(objectPath ?? '').replace(/\.[^./]+$/, '');
}

/**
 * Lit la configuration Cloudinary depuis l'environnement.
 * @returns {{cloudName:string, apiKey:string, apiSecret:string}|null}
 */
export function cloudinaryConfig() {
  const url = (process.env.CLOUDINARY_URL || '').trim();
  if (url) {
    const match = /^cloudinary:\/\/([^:@/]+):([^@/]+)@([^/]+)\/?$/.exec(url);
    if (match) {
      return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
    }
  }
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  return null;
}

export function cloudinaryEnabled() {
  return cloudinaryConfig() !== null;
}

export function cloudinaryCloudName() {
  return cloudinaryConfig()?.cloudName ?? null;
}

/**
 * URL publique deterministe d'un fichier Cloudinary : identique a celle
 * renvoyee par l'API (`secure_url`) une fois le fichier envoye.
 */
export function cloudinaryUrl(cloudName, objectPath) {
  const ext = extensionOf(objectPath);
  const resourceType = resourceTypeFor(objectPath);
  const publicId = publicIdFor(objectPath);
  const suffix = ext ? `.${ext}` : '';
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicId}${suffix}`;
}

/**
 * Envoie un fichier local vers Cloudinary et renvoie son URL HTTPS.
 * @param {{filePath:string, objectPath:string, config:{cloudName:string,apiKey:string,apiSecret:string}}} params
 * @returns {Promise<string>} URL publique (secure_url)
 */
export async function uploadToCloudinary({ filePath, objectPath, config }) {
  const resourceType = resourceTypeFor(objectPath);
  const publicId = publicIdFor(objectPath);
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature : tous les parametres envoyes (sauf file/api_key/cloud_name/
  // resource_type/signature), tries alphabetiquement, suivis du secret.
  const signed = { invalidate: 'true', overwrite: 'true', public_id: publicId, timestamp };
  const toSign = Object.keys(signed)
    .sort()
    .map((key) => `${key}=${signed[key]}`)
    .join('&');
  const signature = crypto
    .createHash('sha1')
    .update(`${toSign}${config.apiSecret}`)
    .digest('hex');

  let blob;
  if (typeof fs.openAsBlob === 'function') {
    // Node >= 19.8 : le Blob lit le fichier sans le charger en memoire.
    blob = await fs.openAsBlob(filePath);
  } else {
    blob = new Blob([await fs.promises.readFile(filePath)]);
  }

  const form = new FormData();
  form.append('file', blob, path.basename(filePath));
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('invalidate', 'true');

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/upload`;

  let response;
  try {
    response = await fetch(endpoint, { method: 'POST', body: form });
  } catch (error) {
    throw new HttpError(502, 'CLOUDINARY_UNREACHABLE', "Impossible de joindre Cloudinary : " + (error?.message ?? 'erreur reseau'));
  }

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const detail = json?.error?.message || text?.slice(0, 300) || `statut ${response.status}`;
    const tooLarge = response.status === 413 || /size|too large|maximum/i.test(detail);
    throw new HttpError(
      tooLarge ? 413 : 400,
      'CLOUDINARY_REJECTED',
      `Cloudinary a refuse le fichier : ${detail}`
    );
  }

  return json?.secure_url ?? cloudinaryUrl(config.cloudName, objectPath);
}

/**
 * Supprime un asset Cloudinary. Idempotent : un asset deja absent n'est pas une
 * erreur.
 * @param {{objectPath:string, config:{cloudName:string,apiKey:string,apiSecret:string}}} params
 * @returns {Promise<{deleted:boolean}>}
 */
export async function destroyCloudinary({ objectPath, config }) {
  const resourceType = resourceTypeFor(objectPath);
  const publicId = publicIdFor(objectPath);
  const timestamp = Math.floor(Date.now() / 1000);

  const toSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(`${toSign}${config.apiSecret}`)
    .digest('hex');

  const form = new FormData();
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('public_id', publicId);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/destroy`;

  try {
    const response = await fetch(endpoint, { method: 'POST', body: form });
    const json = await response.json().catch(() => null);
    return { deleted: response.ok && (json?.result === 'ok' || json?.result === 'not found') };
  } catch {
    // Cloudinary injoignable : on signale seulement, la suppression n'est pas critique.
    return { deleted: false };
  }
}
