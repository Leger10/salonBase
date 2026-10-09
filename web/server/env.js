// Charge le .env avant tout autre import : Node ne le fait pas tout seul,
// contrairement au CLI Prisma. Doit rester importe EN PREMIER par index.js pour
// que process.env soit renseigne avant que ./auth.js ne le lise.
// Les variables deja definies (injectees par Hostinger/Passenger) priment.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const ENV_FILE = process.env.ENV_FILE ?? path.join(ROOT, '.env');

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
