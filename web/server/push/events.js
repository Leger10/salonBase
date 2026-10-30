// Traduction des evenements metier (rendez-vous, tickets) en notifications.
//
// Appele par les hooks de data.js APRES un commit reussi. Deux effets :
//   - depose une entree d'outbox (envoi immediat : confirmation, modification,
//     annulation, tour d'attente) ;
//   - (re)programme les rappels 24 h / 1 h (via replaceReminders).
//
// Aucune donnee fictive : les cibles (profil client, personnel du salon) sont
// resolues depuis la base reelle.

import { prisma } from '../prisma.js';
import { enqueueOutbox, replaceReminders, cancelRemindersForAppointment } from './store.js';
import { computeReminderSchedule } from './scheduling.js';
import {
  appointmentCancelled,
  appointmentConfirmed,
  appointmentCreatedForSalon,
  appointmentRescheduled,
  appointmentTimeChanged,
  reminder1h,
  reminder24h,
  ticketCreatedForSalon,
  ticketNext,
} from './messages.js';

const timeZone = () => process.env.PUSH_TIMEZONE || 'Africa/Porto-Novo';

/** Nom du salon (avec repli sur le slug puis un libelle neutre). */
async function tenantName(tenantId) {
  if (!tenantId) return 'votre salon';
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });
  return tenant?.name || tenant?.slug || 'votre salon';
}

/**
 * Profil du client proprietaire du rendez-vous. On privilégie la fiche `clients`
 * (profile_id), sinon on retombe sur l'email du rendez-vous (client connecte
 * dont la fiche n'est pas encore liee).
 */
async function resolveClientProfile(appointment) {
  if (appointment.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: appointment.clientId },
      select: { profileId: true, name: true, email: true, phone: true },
    });
    if (client?.profileId) {
      return { profileId: client.profileId, name: client.name, email: client.email, phone: client.phone };
    }
    if (client) {
      return { profileId: null, name: client.name, email: client.email, phone: client.phone };
    }
  }
  if (appointment.clientEmail) {
    const client = await prisma.client.findFirst({
      where: { tenantId: appointment.tenantId, email: appointment.clientEmail },
      select: { profileId: true, name: true },
    });
    if (client) return { profileId: client.profileId, name: client.name, email: appointment.clientEmail };
    const profile = await prisma.profile.findUnique({
      where: { email: appointment.clientEmail },
      select: { id: true, name: true },
    });
    if (profile) return { profileId: profile.id, name: profile.name, email: appointment.clientEmail };
  }
  return { profileId: null, name: appointment.clientName, email: appointment.clientEmail };
}

/** Profils du personnel d'un salon (admin + employes) a informer. */
async function resolveStaffProfiles(tenantId) {
  if (!tenantId) return [];
  const profiles = await prisma.profile.findMany({
    where: { tenantId, role: { in: ['admin', 'employee'] }, isActive: true },
    select: { id: true },
  });
  return profiles.map((p) => p.id);
}

function eventKey(...parts) {
  return parts.filter((p) => p !== null && p !== undefined && p !== '').join(':');
}

/* ------------------------------------------------------------------ */
/* Rendez-vous                                                         */
/* ------------------------------------------------------------------ */

/**
 * Un rendez-vous a ete cree (statut pending ou confirmed).
 * - si confirme : programme les rappels + notifie le client (confirmation) ;
 * - notifie toujours le salon (nouvelle reservation).
 */
export async function onAppointmentCreated(appointment, { previous = null } = {}) {
  const salon = await tenantName(appointment.tenantId);
  const client = await resolveClientProfile(appointment);
  const date = appointment.appointmentDate ?? appointment.appointment_date;
  const time = appointment.startTime ?? appointment.start_time;
  const status = String(appointment.status ?? '').toLowerCase();

  if (status === 'confirmed') {
    await scheduleReminders({ appointment, salon, client, date, time });
    if (client.profileId) {
      const msg = appointmentConfirmed({
        firstName: client.name,
        salonName: salon,
        date,
        time,
      });
      await enqueueOutbox({
        type: 'appointment_confirmed',
        eventKey: eventKey('appointment', appointment.id, 'confirmed'),
        tenantId: appointment.tenantId,
        targetUserId: client.profileId,
        entityType: 'appointment',
        entityId: appointment.id,
        title: msg.title,
        body: msg.body,
        url: '/mes-reservations',
        data: { type: 'appointment', appointmentId: appointment.id },
      });
    }
  }

  // Le salon est informe de toute nouvelle reservation (y compris en attente).
  const staff = await resolveStaffProfiles(appointment.tenantId);
  if (staff.length) {
    const msg = appointmentCreatedForSalon({ clientName: client.name, date, time });
    await enqueueOutbox({
      type: 'appointment_created_salon',
      eventKey: eventKey('appointment', appointment.id, 'created_salon'),
      tenantId: appointment.tenantId,
      targetUserId: null,
      entityType: 'appointment',
      entityId: appointment.id,
      title: msg.title,
      body: msg.body,
      url: '/admin/appointments',
      data: { type: 'appointment', appointmentId: appointment.id },
      audienceUserIds: staff,
    });
  }
}

/**
 * Un rendez-vous a ete modifie. On compare avant/apres pour distinguer :
 * - confirmation (pending -> confirmed) ;
 * - report (date ou heure changees alors que deja confirme) ;
 * - annulation (-> cancelled).
 * Les rappels sont recalcules/annules en consequence.
 */
export async function onAppointmentUpdated(appointment, previous) {
  const salon = await tenantName(appointment.tenantId);
  const client = await resolveClientProfile(appointment);
  const date = appointment.appointmentDate ?? appointment.appointment_date;
  const time = appointment.startTime ?? appointment.start_time;

  const prevStatus = String(previous?.status ?? '').toLowerCase();
  const newStatus = String(appointment.status ?? '').toLowerCase();
  const prevDate = previous?.appointmentDate ?? previous?.appointment_date;
  const prevTime = previous?.startTime ?? previous?.start_time;
  const dateChanged = String(prevDate ?? '').slice(0, 10) !== String(date ?? '').slice(0, 10);
  const timeChanged = String(prevTime ?? '') !== String(time ?? '');
  const scheduleChanged = dateChanged || timeChanged;

  // Annulation : on annule les rappels, on previent le client.
  if (newStatus === 'cancelled' && prevStatus !== 'cancelled') {
    await cancelRemindersForAppointment(appointment.id);
    if (client.profileId) {
      const msg = appointmentCancelled({ firstName: client.name, salonName: salon, date, time });
      await enqueueOutbox({
        type: 'appointment_cancelled',
        eventKey: eventKey('appointment', appointment.id, 'cancelled', newStatus),
        tenantId: appointment.tenantId,
        targetUserId: client.profileId,
        entityType: 'appointment',
        entityId: appointment.id,
        title: msg.title,
        body: msg.body,
        url: '/mes-reservations',
        data: { type: 'appointment', appointmentId: appointment.id },
      });
    }
    return;
  }

  // Confirmation : rappels + message de confirmation.
  if (newStatus === 'confirmed' && prevStatus !== 'confirmed') {
    await scheduleReminders({ appointment, salon, client, date, time });
    if (client.profileId) {
      const msg = appointmentConfirmed({ firstName: client.name, salonName: salon, date, time });
      await enqueueOutbox({
        type: 'appointment_confirmed',
        eventKey: eventKey('appointment', appointment.id, 'confirmed'),
        tenantId: appointment.tenantId,
        targetUserId: client.profileId,
        entityType: 'appointment',
        entityId: appointment.id,
        title: msg.title,
        body: msg.body,
        url: '/mes-reservations',
        data: { type: 'appointment', appointmentId: appointment.id },
      });
    }
    return;
  }

  // Modification d'horaire sur un rendez-vous deja confirme : rappels recalcules.
  if (newStatus === 'confirmed' && prevStatus === 'confirmed' && scheduleChanged) {
    await scheduleReminders({ appointment, salon, client, date, time });
    if (client.profileId) {
      const msg = prevTime && !dateChanged && timeChanged
        ? appointmentTimeChanged({ firstName: client.name, salonName: salon, date, time })
        : appointmentRescheduled({ firstName: client.name, salonName: salon, date, time });
      const dedup = eventKey('appointment', appointment.id, 'rescheduled', String(date), String(time));
      await enqueueOutbox({
        type: dateChanged ? 'appointment_rescheduled' : 'appointment_time_changed',
        eventKey: dedup,
        tenantId: appointment.tenantId,
        targetUserId: client.profileId,
        entityType: 'appointment',
        entityId: appointment.id,
        title: msg.title,
        body: msg.body,
        url: '/mes-reservations',
        data: { type: 'appointment', appointmentId: appointment.id },
      });
    }
    return;
  }

  // Deja confirme mais sans changement d'horaire : on ne renvoie rien.
}

/** (Re)programme 24 h / 1 h selon l'heure reelle du rendez-vous. */
async function scheduleReminders({ appointment, salon, client, date, time }) {
  if (!client.profileId) return;
  const slots = computeReminderSchedule(
    {
      status: appointment.status,
      appointmentDate: date,
      startTime: time,
    },
    { timeZone: timeZone() }
  );

  if (!slots.length) {
    // Rien de futur : on s'assure qu'aucun ancien rappel ne subsiste.
    await cancelRemindersForAppointment(appointment.id);
    return;
  }

  // Chaque echeance porte son propre libelle (24 h vs 1 h).
  const prepared = slots.map((slot) => {
    const msg = slot.kind === 'h24'
      ? reminder24h({ firstName: client.name, salonName: salon, date, time })
      : reminder1h({ firstName: client.name, salonName: salon, time });
    return {
      kind: slot.kind,
      scheduledAt: slot.scheduledAt,
      title: msg.title,
      body: msg.body,
      url: '/mes-reservations',
    };
  });

  await replaceReminders({
    appointmentId: appointment.id,
    userId: client.profileId,
    tenantId: appointment.tenantId,
    slots: prepared,
  });
}

/** Un rendez-vous a ete supprime : annule tous ses rappels. */
export async function onAppointmentDeleted(appointment) {
  if (appointment?.id) await cancelRemindersForAppointment(appointment.id);
}

/* ------------------------------------------------------------------ */
/* Tickets d'attente                                                   */
/* ------------------------------------------------------------------ */

/**
 * Un ticket a ete cree : le client est informe quand il devient LE PROCHAIN.
 * A la creation, s'il est le premier "waiting" de la file du jour, on notifie
 * immediatement ; sinon le worker s'en charge au fil des appels.
 */
export async function onTicketCreated(ticket) {
  const staff = await resolveStaffProfiles(ticket.tenantId);
  if (staff.length) {
    const msg = ticketCreatedForSalon({
      clientName: ticket.clientName ?? ticket.client_name,
    });
    await enqueueOutbox({
      type: 'ticket_created_salon',
      eventKey: eventKey('ticket', ticket.id, 'created_salon'),
      tenantId: ticket.tenantId,
      entityType: 'ticket',
      entityId: ticket.id,
      title: msg.title,
      body: msg.body,
      url: '/admin/ticket-queue',
      data: { type: 'ticket', ticketId: ticket.id },
      audienceUserIds: staff,
    });
  }
}

/**
 * Recalcule "qui est le prochain client" pour un salon/date et notifie le
 * concerné si son tour approche. Idempotent grace a eventKey.
 *
 * La position reelle est determinee par le plus petit `ticket_number` parmi les
 * tickets `waiting` non archives du jour (meme critere que l'interface).
 */
export async function evaluateTicketQueue(tenantId, date) {
  const day = date ? new Date(date) : new Date();
  day.setHours(0, 0, 0, 0);

  const nextWaiting = await prisma.ticket.findFirst({
    where: {
      tenantId,
      status: 'waiting',
      archived: { not: true },
      date: { gte: day },
    },
    orderBy: { ticketNumber: 'asc' },
  });

  if (!nextWaiting) return null;

  const client = await resolveTicketClient(nextWaiting);
  if (!client.profileId) return null;

  const salon = await tenantName(tenantId);
  const msg = ticketNext({ firstName: client.name, salonName: salon });
  await enqueueOutbox({
    type: 'ticket_next',
    eventKey: eventKey('ticket', nextWaiting.id, 'next'),
    tenantId,
    targetUserId: client.profileId,
    entityType: 'ticket',
    entityId: nextWaiting.id,
    title: msg.title,
    body: msg.body,
    url: '/mon-ticket',
    data: { type: 'ticket', ticketId: nextWaiting.id },
  });
  return nextWaiting.id;
}

async function resolveTicketClient(ticket) {
  if (ticket.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: ticket.clientId },
      select: { profileId: true, name: true },
    });
    if (client) return { profileId: client.profileId, name: client.name };
  }
  if (ticket.clientEmail) {
    const profile = await prisma.profile.findUnique({
      where: { email: ticket.clientEmail },
      select: { id: true, name: true },
    });
    if (profile) return { profileId: profile.id, name: profile.name };
  }
  return { profileId: null, name: ticket.clientName ?? ticket.client_name };
}

/** Un ticket est termine/annule/archive : on reevalue la file. */
export async function onTicketReleased(ticket) {
  if (!ticket?.tenantId) return;
  await evaluateTicketQueue(ticket.tenantId, ticket.date);
}
