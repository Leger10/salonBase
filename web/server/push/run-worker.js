// Process de traitement permanent des notifications push.
//
// A utiliser quand l'hebergeur autorise un processus Node permanent (Hostinger
// Node.js / Passenger : `npm start` ou une commande dediee). Sinon, preferer la
// tache Cron qui appelle POST /api/push/cron (voir server/push/routes.js).
//
// Usage : node server/push/run-worker.js [intervalle_ms]
// Arret propre sur SIGINT/SIGTERM.

import './../env.js';
import { runWorker } from './worker.js';
import { prisma } from '../prisma.js';

const intervalMs = Number(process.argv[2] ?? process.env.PUSH_WORKER_INTERVAL_MS ?? 60_000);
let stopped = false;
let timer = null;

async function tick() {
  if (stopped) return;
  try {
    const summary = await runWorker();
    if (summary?.skipped !== 'LOCKED') {
      const reminders = summary?.reminders?.sent ?? 0;
      const outbox = summary?.outbox?.sent ?? 0;
      if (reminders || outbox) {
        console.log(`[push-worker] rappels=${reminders} outbox=${outbox}`);
      }
    }
  } catch (error) {
    console.error('[push-worker] erreur :', error?.message ?? error);
  } finally {
    if (!stopped) timer = setTimeout(tick, intervalMs);
  }
}

async function shutdown(signal) {
  stopped = true;
  if (timer) clearTimeout(timer);
  console.log(`[push-worker] arret (${signal})`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`[push-worker] demarrage, intervalle ${intervalMs} ms`);
tick();
