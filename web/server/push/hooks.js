// Detection des evenements metier a brancher sur le moteur de donnees.
//
// Appele par data.js APRES chaque ecriture reussie. Toute erreur est captee :
// une notification ne doit jamais faire echouer l'operation metier (regle :
// "Ne pas faire echouer le systeme"). Les evenements ne sont emis qu'apres un
// COMMIT reussi (les handlers sont appeles une fois l'ecriture terminee).

import {
  onAppointmentCreated,
  onAppointmentDeleted,
  onAppointmentUpdated,
  onTicketCreated,
  onTicketReleased,
} from './events.js';

// Etats d'un ticket qui declenchent une reevaluation de la file (le prochain
// client change quand un ticket quitte l'etat "waiting").
const RELEASED_TICKET_STATUSES = new Set(['called', 'in_progress', 'completed', 'cancelled', 'served', 'archived']);

const WATCHED = new Set(['appointments', 'tickets']);

/** Normalise une ligne snake_case (retour API) en objet utilisable par events. */
function row(obj) {
  if (!obj) return null;
  return {
    id: obj.id,
    tenantId: obj.tenant_id ?? obj.tenantId,
    clientId: obj.client_id ?? obj.clientId,
    clientName: obj.client_name ?? obj.clientName,
    clientEmail: obj.client_email ?? obj.clientEmail,
    clientPhone: obj.client_phone ?? obj.clientPhone,
    appointmentDate: obj.appointment_date ?? obj.appointmentDate,
    startTime: obj.start_time ?? obj.startTime,
    status: obj.status,
    date: obj.date,
    ticketNumber: obj.ticket_number ?? obj.ticketNumber,
  };
}

/** Convertit une ligne Prisma (camelCase) en objet normalise. */
function fromPrisma(obj) {
  if (!obj) return null;
  return {
    id: obj.id,
    tenantId: obj.tenantId,
    clientId: obj.clientId,
    clientName: obj.clientName,
    clientEmail: obj.clientEmail,
    clientPhone: obj.clientPhone,
    appointmentDate: obj.appointmentDate,
    startTime: obj.startTime,
    status: obj.status,
    date: obj.date,
    ticketNumber: obj.ticketNumber,
  };
}

/**
 * Effets de bord d'une insertion. `createdRows` : lignes snake_case renvoyees
 * par le moteur (contrat PostgREST).
 */
export async function afterInsert(tableName, createdRows) {
  if (!WATCHED.has(tableName)) return;
  const rows = Array.isArray(createdRows) ? createdRows : [createdRows];
  for (const raw of rows) {
    const item = row(raw);
    if (!item) continue;
    try {
      if (tableName === 'appointments') {
        await onAppointmentCreated(item);
      } else if (tableName === 'tickets') {
        await onTicketCreated(item);
      }
    } catch (error) {
      console.error(`[push] evenement insert ${tableName} ignore :`, error?.message ?? error);
    }
  }
}

/**
 * Effets de bord d'une mise a jour. `previousRows` doivent avoir ete lus AVANT
 * l'ecriture (etat "avant"), `updated` est le payload ecrit.
 */
export async function afterUpdate(tableName, previousRows, updated) {
  if (!WATCHED.has(tableName)) return;
  const before = Array.isArray(previousRows) ? previousRows : [previousRows];

  if (tableName === 'appointments') {
    for (const prev of before) {
      const merged = { ...fromPrisma(prev), ...row(updated) };
      try {
        await onAppointmentUpdated(merged, fromPrisma(prev));
      } catch (error) {
        console.error('[push] evenement update appointments ignore :', error?.message ?? error);
      }
    }
    return;
  }

  if (tableName === 'tickets') {
    const newStatus = String(updated?.status ?? '').toLowerCase();
    const changedStatus = before.some((p) => String(p?.status ?? '').toLowerCase() !== newStatus);
    if (!changedStatus) return;
    if (RELEASED_TICKET_STATUSES.has(newStatus)) {
      for (const prev of before) {
        try {
          await onTicketReleased(fromPrisma(prev));
        } catch (error) {
          console.error('[push] evenement update tickets ignore :', error?.message ?? error);
        }
      }
    }
  }
}

/** Effets de bord d'une suppression (rattachement des rappels). */
export async function afterDelete(tableName, previousRows) {
  if (tableName !== 'appointments') return;
  const before = Array.isArray(previousRows) ? previousRows : [previousRows];
  for (const prev of before) {
    try {
      await onAppointmentDeleted(fromPrisma(prev));
    } catch (error) {
      console.error('[push] evenement delete appointments ignore :', error?.message ?? error);
    }
  }
}

export { WATCHED };
