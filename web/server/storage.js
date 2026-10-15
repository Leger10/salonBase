// Stockage de fichiers (images / videos).
//
// Le frontend appelle l'API Supabase Storage (`supabase.storage.from(...).upload`)
// : la couche de compatibilite (src/lib/supabase-shim.js) redirige ces appels
// vers `POST /api/storage/upload`. Le corps HTTP est le fichier brut (pas de
// multipart, pas de depandance externe), le chemin passe en query string.
//
// Destination : Cloudinary (CDN) quand CLOUDINARY_URL est configure — les
// medias ne consomment alors ni espace ni bande passante sur Hostinger.
// Sinon, repli local : ecriture dans `web/storage/` servi sous `/storage/...`
// par index.js.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { HttpError, requireAuth, requireRole } from './middleware/auth.js';
import {
  VIDEO_EXTENSIONS as CLOUDINARY_VIDEO_EXTENSIONS,
  cloudinaryCloudName,
  cloudinaryConfig,
  destroyCloudinary,
  uploadToCloudinary,
} from './cloudinary.js';

const MB = 1024 * 1024;

// Limites uniques du site (partagees avec le front : src/utils/uploadLimits.js).
// Valeurs du plan gratuit Cloudinary : video 100 Mo, image 10 Mo.
export const MAX_VIDEO_BYTES = 100 * MB;
export const MAX_IMAGE_BYTES = 10 * MB;

export const VIDEO_EXTENSIONS = [...CLOUDINARY_VIDEO_EXTENSIONS];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'ico', 'bmp'];

const VIDEO_EXT = new Set(VIDEO_EXTENSIONS);
const IMAGE_EXT = new Set(IMAGE_EXTENSIONS);
// Chemin relatif : chiffres, lettres, tiret, point, souligne, slash uniquement.
const SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

export function storageRoot() {
  const dir = process.env.STORAGE_DIR || path.join(SERVER_DIR, '..', 'storage');
  return path.resolve(dir);
}

export function publicUrlFor(objectPath) {
  return `/storage/${objectPath}`;
}

export function describeLimits() {
  const cloudName = cloudinaryCloudName();
  return {
    max_video_bytes: MAX_VIDEO_BYTES,
    max_image_bytes: MAX_IMAGE_BYTES,
    max_video_mb: MAX_VIDEO_BYTES / MB,
    max_image_mb: MAX_IMAGE_BYTES / MB,
    video_formats: VIDEO_EXTENSIONS,
    image_formats: IMAGE_EXTENSIONS,
    // "cloudinary" quand CLOUDINARY_URL est configure, sinon stockage local.
    provider: cloudName ? 'cloudinary' : 'local',
    cloud_name: cloudName,
  };
}

// Valide un chemin de fichier : pas de `..`, pas d'absolu, pas de caractere
// exotique, et resultat toujours contenu dans le dossier de stockage.
function resolveObjectPath(rawPath) {
  const cleaned = String(rawPath ?? '').trim().replace(/\\/g, '/');
  if (!cleaned || cleaned.length > 512) {
    throw new HttpError(400, 'INVALID_PATH', 'Chemin de fichier invalide.');
  }
  if (cleaned.startsWith('/') || cleaned.includes('..') || cleaned.includes('\0')) {
    throw new HttpError(400, 'INVALID_PATH', 'Chemin de fichier invalide.');
  }
  if (!SAFE_PATH.test(cleaned)) {
    throw new HttpError(400, 'INVALID_PATH', 'Chemin de fichier invalide.');
  }

  const root = storageRoot();
  const absolute = path.resolve(root, cleaned);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new HttpError(400, 'INVALID_PATH', 'Chemin de fichier invalide.');
  }
  if (absolute === root) {
    throw new HttpError(400, 'INVALID_PATH', 'Chemin de fichier invalide.');
  }
  return { root, absolute, objectPath: cleaned };
}

function limitFor(absolutePath) {
  const ext = path.extname(absolutePath).slice(1).toLowerCase();
  if (VIDEO_EXT.has(ext)) return { kind: 'video', max: MAX_VIDEO_BYTES };
  if (IMAGE_EXT.has(ext)) return { kind: 'image', max: MAX_IMAGE_BYTES };
  throw new HttpError(
    415,
    'UNSUPPORTED_FILE_TYPE',
    `Format non pris en charge (.${ext || 'vide'}).
     Fichiers acceptes : ${[...IMAGE_EXT].join(', ')} pour les images et ${[...VIDEO_EXT].join(', ')} pour les videos.`
  );
}

function toMB(bytes) {
  return `${Math.round(bytes / MB)} Mo`;
}

// Ecrit le corps de la requete directement sur le disque (streaming) : une
// video de 100 Mo ne transite jamais par la memoire du process Node.
function writeBody(req, absolutePath, maxBytes) {
  return new Promise((resolve, reject) => {
    let received = 0;
    let settled = false;

    const out = fs.createWriteStream(absolutePath);

    const fail = (error) => {
      if (settled) return;
      settled = true;
      req.removeListener('data', onChunk);
      out.destroy();
      req.unpipe?.(out);
      req.resume?.();
      fs.rm(absolutePath, { force: true }, () => reject(error));
    };

    const onChunk = (chunk) => {
      if (settled) return;
      received += chunk.length;
      if (received > maxBytes) {
        fail(
          new HttpError(
            413,
            'FILE_TOO_LARGE',
            `Fichier trop volumineux : maximum ${toMB(maxBytes)}.`
          )
        );
        return;
      }
      if (!out.write(chunk)) {
        req.pause();
        out.once('drain', () => {
          if (!settled) req.resume();
        });
      }
    };

    out.on('finish', () => {
      if (settled) return;
      settled = true;
      resolve(received);
    });
    out.on('error', fail);
    req.on('error', fail);
    req.on('data', onChunk);
    req.on('end', () => {
      if (settled) return;
      out.end();
    });
  });
}

// --- POST /api/storage/upload ---------------------------------------------
// Corps : fichier brut. Chemin : ?path=<bucket>/<...>
async function handleUpload(req, res) {
  const ctx = await requireAuth(req);
  requireRole(ctx, 'employee');

  const { absolute, objectPath } = resolveObjectPath(req.query.path);
  const { max, kind } = limitFor(absolute);

  const declared = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(declared) && declared > max) {
    throw new HttpError(
      413,
      'FILE_TOO_LARGE',
      `Fichier trop volumineux : maximum ${toMB(max)} pour une ${kind === 'video' ? 'video' : 'image'}.`
    );
  }

  const config = cloudinaryConfig();

  // Avec Cloudinary : le fichier part au CDN et RIEN ne reste sur l'hebergement
  // (fichier temporaire supprime apres envoi). Sans Cloudinary : ecriture dans
  // web/storage (repli local).
  const tmp = config
    ? path.join(os.tmpdir(), `salonstore-upload-${randomUUID()}`)
    : `${absolute}.part`;

  if (!config) await fsp.mkdir(path.dirname(absolute), { recursive: true });
  await fsp.rm(tmp, { force: true });

  const received = await writeBody(req, tmp, max);
  if (received <= 0) {
    await fsp.rm(tmp, { force: true });
    throw new HttpError(400, 'EMPTY_FILE', 'Fichier vide.');
  }

  try {
    if (config) {
      const publicUrl = await uploadToCloudinary({ filePath: tmp, objectPath, config });
      await fsp.rm(tmp, { force: true });
      return res.json({ path: objectPath, publicUrl, provider: 'cloudinary', size: received });
    }

    await fsp.rename(tmp, absolute);
    return res.json({
      path: objectPath,
      publicUrl: publicUrlFor(objectPath),
      provider: 'local',
      size: received,
    });
  } catch (error) {
    await fsp.rm(tmp, { force: true });
    throw error;
  }
}

// --- POST /api/storage/remove ---------------------------------------------
// Corps JSON `{ paths: [...] }` : supprime une ou plusieurs fichiers (idempotent).
async function handleRemove(req, res) {
  const ctx = await requireAuth(req);
  requireRole(ctx, 'employee');

  const list = Array.isArray(req.body?.paths) ? req.body.paths : [];
  if (!list.length || list.length > 50) {
    throw new HttpError(400, 'INVALID_INPUT', 'Liste de fichiers invalide.');
  }

  const config = cloudinaryConfig();
  const removed = [];

  for (const candidate of list) {
    const { root, absolute, objectPath } = resolveObjectPath(candidate);

    if (config) {
      const { deleted } = await destroyCloudinary({ objectPath, config });
      if (deleted) removed.push(candidate);
      continue;
    }

    if (!absolute.startsWith(root + path.sep)) continue;
    try {
      await fsp.rm(absolute, { force: true });
      removed.push(candidate);
    } catch {
      // fichier deja absent : on continue
    }
  }
  res.json({ removed, count: removed.length, provider: config ? 'cloudinary' : 'local' });
}

// --- GET /api/storage/limits ----------------------------------------------
// Public : le front affiche partout les limites avant meme la connexion.
function handleLimits(_req, res) {
  res.json(describeLimits());
}

export function mountStorage(app, wrap) {
  app.get('/api/storage/limits', handleLimits);
  app.post('/api/storage/upload', wrap(handleUpload));
  app.post('/api/storage/remove', wrap(handleRemove));
}
