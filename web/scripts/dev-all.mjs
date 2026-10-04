// Lance l'API Node et le serveur Vite cote a cote, avec un Ctrl+C unique.
// L'API demarre en premier : Vite peut proxy /api des la premiere requete.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

// process.execPath evite de dependre du PATH pour lancer node.
run('api', process.execPath, ['server/index.js'], '36');

// On appelle le binaire de Vite directement : sous Windows, spawn d'un `.cmd`
// (npx.cmd) avec shell:false echoue en EINVAL.
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
run('web', process.execPath, [VITE_BIN, '--host', '--port', '3000'], '35');
