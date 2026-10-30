// Modeles de messages des notifications push.
//
// Un seul endroit pour les textes : le worker, les hooks d'evenements et les
// tests puisent tous ici. Les messages restent transactionnels (jamais
// promotionnels) et ne contiennent que le prenom + le nom du salon, jamais de
// donnees sensibles (regle de confidentialite).

/** Formate "HH:MM" a partir de "HH:MM:SS" ou "HH:MM". */
export function formatTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const [h, m] = raw.split(':');
  if (h === undefined || m === undefined) return raw;
  return `${h.padStart(2, '0')}:${m.slice(0, 2)}`;
}

/** Formate une date "YYYY-MM-DD" (ou Date) en "jj/mm/aaaa". */
export function formatDate(value) {
  if (!value) return '';
  const iso = value instanceof Date ? value.toISOString() : String(value);
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** "demain" si la date est le lendemain, sinon "le jj/mm/aaaa". */
export function relativeDayLabel(appointmentDate, now = new Date()) {
  if (!appointmentDate) return '';
  const iso = appointmentDate instanceof Date
    ? appointmentDate.toISOString().slice(0, 10)
    : String(appointmentDate).slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return iso === tomorrow ? 'demain' : `le ${formatDate(iso)}`;
}

const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || '';

export function reminder24h({ firstName: name, salonName, date, time }) {
  return {
    title: 'Rappel de rendez-vous',
    body:
      `Bonjour ${firstName(name)}, votre rendez-vous au salon ${salonName} ` +
      `est prévu demain à ${formatTime(time)}. Préparez-vous pour respecter votre programme.`,
  };
}

export function reminder1h({ firstName: name, salonName, time }) {
  return {
    title: 'Rendez-vous dans 1 heure',
    body:
      `Bonjour ${firstName(name)}, votre rendez-vous au salon ${salonName} ` +
      `est prévu dans une heure, à ${formatTime(time)}. Nous vous attendons !`,
  };
}

export function appointmentConfirmed({ firstName: name, salonName, date, time }) {
  return {
    title: 'Rendez-vous confirmé',
    body:
      `Bonjour ${firstName(name)}, votre rendez-vous au salon ${salonName} ` +
      `du ${formatDate(date)} à ${formatTime(time)} a été confirmé. ` +
      `Préparez-vous pour respecter le programme.`,
  };
}

export function appointmentRescheduled({ firstName: name, salonName, date, time }) {
  return {
    title: 'Rendez-vous modifié',
    body:
      `Bonjour ${firstName(name)}, votre rendez-vous au salon ${salonName} ` +
      `a été reporté au ${formatDate(date)} à ${formatTime(time)}. ` +
      `Consultez votre réservation pour confirmer les détails.`,
  };
}

export function appointmentTimeChanged({ firstName: name, salonName, date, time }) {
  return {
    title: 'Horaire modifié',
    body:
      `Bonjour ${firstName(name)}, l'horaire de votre rendez-vous au salon ${salonName} ` +
      `a été modifié. Consultez les nouveaux détails : ${formatDate(date)} à ${formatTime(time)}.`,
  };
}

export function appointmentCancelled({ firstName: name, salonName, date, time }) {
  return {
    title: 'Rendez-vous annulé',
    body:
      `Bonjour ${firstName(name)}, votre rendez-vous au salon ${salonName} ` +
      `prévu le ${formatDate(date)} à ${formatTime(time)} a été annulé. ` +
      `Consultez votre espace pour plus d'informations.`,
  };
}

export function ticketNext({ firstName: name, salonName }) {
  return {
    title: "Votre tour approche",
    body:
      `Bonjour ${firstName(name)}, votre tour approche au salon ${salonName} ! ` +
      `Vous êtes le prochain client. Préparez-vous.`,
  };
}

/** Notification au salon (admin) : une action client doit l'informer. */
export function appointmentCreatedForSalon({ clientName, date, time }) {
  return {
    title: 'Nouvelle réservation',
    body:
      `Nouvelle réservation de ${clientName || 'un client'} ` +
      `le ${formatDate(date)} à ${formatTime(time)}.`,
  };
}

export function ticketCreatedForSalon({ clientName }) {
  return {
    title: "Nouveau ticket d'attente",
    body: `Nouveau ticket pris par ${clientName || 'un client'}.`,
  };
}
