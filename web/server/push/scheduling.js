// Calcul des instants de rappel - logique PURE (aucun acces base ni reseau).
//
// Les rendez-vous sont stockes en "heure murale locale" : `appointment_date`
// (DATE) + `start_time` (VARCHAR "HH:MM:SS"), SANS fuseau. Le fuseau est donc
// une configuration d'application (PUSH_TIMEZONE), pas une donnee de la ligne.
// On calcule l'instant absolu (UTC) du rendez-vous a partir de cette heure
// murale et du fuseau, sans dependance externe (offset resolu via Intl).
//
// Separer ce calcul permet de le tester unitairement sans base ni Firebase.

export const REMINDER_OFFSETS_MS = {
  h24: 24 * 60 * 60 * 1000,
  h1: 1 * 60 * 60 * 1000,
};

/**
 * Decalage (minutes) d'un fuseau IANA pour un instant donne.
 * Positif a l'est de Greenwich. Utilise Intl (disponible dans Node 22),
 * donc gere l'heure d'ete sans table externe.
 */
export function zoneOffsetMinutes(timeZone, at) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(at).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUTC - at.getTime()) / 60000);
}

/**
 * Instant absolu (Date UTC) d'une heure murale "date + HH:MM" dans un fuseau.
 * `zoneOffsetMinutes` depend de l'instant : on procede par approximation puis
 * correction (une seule passe suffit hors des rares bascules d'heure d'ete).
 */
export function zonedWallClockToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const [hh, mm] = String(timeStr ?? '00:00').split(':').map(Number);
  if (!y || !m || !d) return null;

  const naive = Date.UTC(y, m - 1, d, hh || 0, mm || 0, 0);
  const approxOffset = zoneOffsetMinutes(timeZone, new Date(naive));
  const candidate = new Date(naive - approxOffset * 60000);
  const realOffset = zoneOffsetMinutes(timeZone, candidate);
  return new Date(naive - realOffset * 60000);
}

/** Date "maintenant" dans un fuseau (pour les comparaisons "deja passe"). */
export function nowInZone(timeZone, now = new Date()) {
  return now;
}

/**
 * Calcule la liste des rappels a programmer pour un rendez-vous.
 *
 * Retourne un tableau de { kind, scheduledAt: Date, offsetMs } pour les seuls
 * rappels dont l'echeance est encore FUTURE (> now). Un rendez-vous cree moins
 * de 24 h a l'avance ne produit donc que les rappels encore pertinents (voire
 * aucun). Le rendez-vous doit etre "confirmed" : c'est a l'appelant de le
 * verifier, mais on l'expose en garde ici pour eviter tout oubli.
 */
export function computeReminderSchedule(appointment, options = {}) {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? 'UTC';

  if (!appointment) return [];
  if (String(appointment.status ?? '').toLowerCase() !== 'confirmed') return [];

  const startAt = zonedWallClockToUtc(
    appointment.appointmentDate ?? appointment.appointment_date,
    appointment.startTime ?? appointment.start_time,
    timeZone
  );
  if (!startAt) return [];

  const pending = [];
  for (const [kind, offsetMs] of Object.entries(REMINDER_OFFSETS_MS)) {
    const scheduledAt = new Date(startAt.getTime() - offsetMs);
    if (scheduledAt.getTime() <= now.getTime()) continue;
    pending.push({ kind, scheduledAt, offsetMs });
  }
  return pending;
}
