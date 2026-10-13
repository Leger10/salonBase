// Agrégation de l'activité d'un client pour /admin/clients.
//
// Les RDV, tickets et commandes créés depuis la vitrine publique ne pointent pas
// toujours vers la bonne fiche `clients` (le visiteur fournit seulement un nom
// et un téléphone). On regroupe donc l'activité par `client_id` quand il est
// renseigné, sinon par téléphone / email normalisés.
import { supabase } from '@/lib/supabase';

/** Ne garde que les chiffres, et les 9 derniers pour ignorer les indicatifs. */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length > 9 ? digits.slice(-9) : digits;
}

export function normalizeEmail(email) {
  return email ? String(email).trim().toLowerCase() : '';
}

function emptyStats() {
  return {
    appointments: 0,
    completedAppointments: 0,
    tickets: 0,
    completedTickets: 0,
    transactions: 0,
    giftCards: 0,
    revenue: 0,
    lastVisit: null,
    activityDates: [],
  };
}

/**
 * Regroupe l'activité d'un établissement par client.
 * @param {Array} clients - fiches clients (avec `profile` optionnel)
 * @param {{appointments?: Array, tickets?: Array, transactions?: Array, giftCards?: Array}} activity
 * @returns {Map<string, object>} statistiques par `client.id`
 */
export function aggregateClientActivity(clients, activity = {}) {
  const appointments = activity.appointments || [];
  const tickets = activity.tickets || [];
  const transactions = activity.transactions || [];
  const giftCards = activity.giftCards || [];

  const byPhone = new Map();
  const byEmail = new Map();
  for (const client of clients) {
    const phone = normalizePhone(client.phone || client.profile?.phone);
    const email = normalizeEmail(client.email || client.profile?.email);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, client.id);
    if (email && !byEmail.has(email)) byEmail.set(email, client.id);
  }

  const statsByClient = new Map();
  const getStats = (clientId) => {
    if (!statsByClient.has(clientId)) statsByClient.set(clientId, emptyStats());
    return statsByClient.get(clientId);
  };

  // Résout la fiche client d'une activité : id direct, sinon téléphone / email.
  const resolve = (clientId, phone, email) => {
    if (clientId) return clientId;
    const p = normalizePhone(phone);
    if (p && byPhone.has(p)) return byPhone.get(p);
    const e = normalizeEmail(email);
    if (e && byEmail.has(e)) return byEmail.get(e);
    return null;
  };

  for (const appt of appointments) {
    const id = resolve(appt.client_id, appt.client_phone, appt.client_email);
    if (!id) continue;
    const stats = getStats(id);
    stats.appointments += 1;
    if (appt.status === "completed") {
      stats.completedAppointments += 1;
      stats.revenue += Number(appt.total_price || 0);
    }
    const date = appt.appointment_date || appt.created_at;
    if (date) stats.activityDates.push(date);
  }

  for (const ticket of tickets) {
    const id = resolve(ticket.client_id, ticket.client_phone, ticket.client_email);
    if (!id) continue;
    const stats = getStats(id);
    stats.tickets += 1;
    if (ticket.status === "served" || ticket.status === "completed") {
      stats.completedTickets += 1;
      stats.revenue += Number(ticket.service_price || 0);
    }
    const date = ticket.date || ticket.created_at;
    if (date) stats.activityDates.push(date);
  }

  for (const tx of transactions) {
    const id = resolve(tx.client_id || tx.customer_id, tx.customer_phone, null);
    if (!id) continue;
    const stats = getStats(id);
    stats.transactions += 1;
    if (tx.status === "completed") stats.revenue += Number(tx.amount || 0);
    const date = tx.transaction_date || tx.created_at;
    if (date) stats.activityDates.push(date);
  }

  for (const card of giftCards) {
    const id = resolve(null, card.sender_phone || card.recipient_phone, card.recipient_email);
    if (!id) continue;
    getStats(id).giftCards += 1;
  }

  for (const stats of statsByClient.values()) {
    stats.activityDates.sort((a, b) => new Date(b) - new Date(a));
    stats.lastVisit = stats.activityDates[0] || null;
  }

  return statsByClient;
}

/**
 * Détail de l'activité rattachée à un client (même logique de rattachement que
 * `aggregateClientActivity`), pour les listes d'historique.
 */
export function activityForClient(client, activity = {}) {
  const phone = normalizePhone(client.phone || client.profile?.phone);
  const email = normalizeEmail(client.email || client.profile?.email);
  const matches = (clientId, recordPhone, recordEmail) =>
    Boolean(clientId && clientId === client.id) ||
    Boolean(phone && recordPhone && normalizePhone(recordPhone) === phone) ||
    Boolean(email && recordEmail && normalizeEmail(recordEmail) === email);

  return {
    appointments: (activity.appointments || []).filter((a) =>
      matches(a.client_id, a.client_phone, a.client_email)
    ),
    tickets: (activity.tickets || []).filter((t) =>
      matches(t.client_id, t.client_phone, t.client_email)
    ),
    transactions: (activity.transactions || []).filter((t) =>
      matches(t.client_id || t.customer_id, t.customer_phone, null)
    ),
    giftCards: (activity.giftCards || []).filter((g) =>
      matches(null, g.sender_phone || g.recipient_phone, g.recipient_email)
    ),
  };
}

/**
 * Retourne l'id de la fiche client de l'établissement, en la créant au besoin.
 * Utilisé par les flux publics (commande, file d'attente) pour rattacher
 * l'activité à la bonne fiche.
 */
export async function resolveClientId(tenantId, { name, email, phone } = {}) {
  if (!tenantId) return null;
  const cleanPhone = phone ? String(phone).trim() : "";
  const cleanEmail = email ? String(email).trim() : "";
  try {
    if (cleanPhone || cleanEmail || name) {
      let query = supabase.from("clients").select("id").eq("tenant_id", tenantId);
      if (cleanPhone) query = query.eq("phone", cleanPhone);
      else if (cleanEmail) query = query.eq("email", cleanEmail);
      else if (name) query = query.eq("name", name);
      const { data: existing } = await query.maybeSingle();
      if (existing?.id) return existing.id;
    }

    if (!name) return null;
    const { data: created } = await supabase
      .from("clients")
      .insert({
        tenant_id: tenantId,
        name,
        email: cleanEmail || null,
        phone: cleanPhone || null,
        loyalty_points: 0,
        total_visits: 0,
        total_spent: 0,
      })
      .select()
      .single();
    return created?.id || null;
  } catch (error) {
    console.error("resolveClientId:", error);
    return null;
  }
}
