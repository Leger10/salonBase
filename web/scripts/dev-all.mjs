// Lance l'API Node et le serveur Vite cote a cote, avec un Ctrl+C unique.
// L'API demarre en premier : Vite peut proxy /api des la premiere requete.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import http from 'node:http';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

if (existsSync(path.join(ROOT, '.env'))) {
  process.loadEnvFile(path.join(ROOT, '.env'));
}

process.env.API_PORT ??= '4000';

const children = [];
let closing = false;

function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
  process.exit(code);
}

function run(name, command, args, color) {
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const log = (line) => process.stdout.write(prefix + line + '\n');

  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    shell: false,
    windowsHide: true,
  });

  for (const [streamName, stream] of [['out', child.stdout], ['err', child.stderr]]) {
    stream.setEncoding('utf8');
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) log(line);
    });
    stream.on('end', () => {
      if (buffer.trim()) log(buffer);
    });
    stream.on('error', (e) => log(`[${streamName}] ${e.message}`));
  }

  child.on('error', (e) => {
    log(`ECHEC DE LANCEMENT : ${e.message}`);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    log(`arret (code=${code} signal=${signal})`);
    if (!closing) shutdown(code ?? 0);
  });

  children.push(child);
  return child;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Verifie si un port est libre. Un `npm start` (API seule) laisse le port 4000
// occupe : sans ce controle, `npm run dev` echouait au demarrage de l'API et
// coupait aussi Vite, avec un simple "arret (code=0)" difficile a diagnostiquer.
function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

function probeApi(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        if (body.length < 8192) body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(res.statusCode === 200 && JSON.parse(body).ok === true);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function probeApiWithRetry(port, attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    if (await probeApi(port)) return true;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const API_PORT = Number(process.env.API_PORT);
const portFree = await canBind(API_PORT);

if (portFree) {
  // process.execPath evite de dependre du PATH pour lancer node.
  run('api', process.execPath, ['server/index.js'], '36');
} else if (await probeApiWithRetry(API_PORT)) {
  console.log(
    `[api] deja demarre sur http://localhost:${API_PORT} : reutilisation de l'instance existante.`
  );
} else {
  console.error(`[api] le port ${API_PORT} est deja utilise par une autre application.`);
  console.error(`[api] Fermez-la (ou changez API_PORT dans web/.env) puis relancez npm run dev.`);
  process.exit(1);
}

// On appelle le binaire de Vite directement : sous Windows, spawn d'un `.cmd`
// (npx.cmd) avec shell:false echoue en EINVAL.
const require = createRequire(import.meta.url);
const VITE_BIN = path.resolve(path.dirname(require.resolve('vite')), '../../bin/vite.js');
run('web', process.execPath, [VITE_BIN, '--host', '--port', '3000'], '35');
