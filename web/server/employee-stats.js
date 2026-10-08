import { prisma } from './prisma.js';
import { HttpError, requireAuth, requireRole } from './middleware/auth.js';
import { tenantWhere } from './middleware/auth.js';

const STATUSES_TICKETS = ['completed', 'closed', 'finished', 'paid'];
const STATUSES_APPTS = ['completed', 'done', 'finished'];

/**
 * Calcule le nombre de clients traites (distincts par client_id) par employe,
 * uniquement sur les tickets ET rendez-vous assignes, et uniquement lorsque
 * l'intervention est terminee/cloturee.
 *
 * Definition : un "client traite" = client distinct (client_id) apparu dans :
 * - un ticket ASSIGNE a l'employe, avec status termine/cloture
 * - OU un appointment ASSIGNE a l'employe, avec status termine, ET client_id non null
 *
 * Un meme client peut etre traite par plusieurs employes (cas de services
 * differents) : on compte donc les occurrences distinctes (employee, client_id).
 */
export async function getEmployeeClientStats(ctx) {
  requireRole(ctx, 'admin');

  // Liste des employes du tenant (avec profil pour le nom)
  const employees = await prisma.employee.findMany({
    where: { tenantId: ctx.tenantId },
    include: { profile: { select: { fullName: true, name: true } } },
    orderBy: [{ employeeNumber: 'asc' }, { id: 'asc' }],
  });

  if (employees.length === 0) return [];

  const employeeIds = employees.map((e) => e.id);

  // Tickets termines assignes a ces employes
  const ticketPairs = await prisma.ticket.findMany({
    where: {
      tenantId: ctx.tenantId,
      assignedEmployeeId: { in: employeeIds },
      status: { in: STATUSES_TICKETS },
      clientId: { not: null },
    },
    select: { assignedEmployeeId: true, clientId: true },
  });

  // Rendez-vous termines assignes a ces employes
  const apptPairs = await prisma.appointment.findMany({
    where: {
      tenantId: ctx.tenantId,
      employeeId: { in: employeeIds },
      status: { in: STATUSES_APPTS },
      clientId: { not: null },
    },
    select: { employeeId: true, clientId: true },
  });

  // Map (employeeId -> Set(clientId)) pour garantir unicite (client traite N fois par meme employe = 1)
  const map = new Map();
  for (const e of employees) map.set(e.id, new Set());

  for (const t of ticketPairs) {
    if (!t.assignedEmployeeId || !t.clientId) continue;
    if (map.has(t.assignedEmployeeId)) map.get(t.assignedEmployeeId).add(t.clientId);
  }
  for (const a of apptPairs) {
    if (!a.employeeId || !a.clientId) continue;
    if (map.has(a.employeeId)) map.get(a.employeeId).add(a.clientId);
  }

  const stats = employees.map((e) => {
    const set = map.get(e.id) ?? new Set();
    const fullName = e.profile?.fullName ?? e.profile?.name ?? `Employé #${e.employeeNumber ?? ''}`;
    return {
      employeeId: e.id,
      profileId: e.profileId,
      employeeNumber: e.employeeNumber,
      name: fullName,
      isActive: e.isActive === true,
      clientsHandledDistinct: set.size,
    };
  });

  // Classement : nombre decroissant, puis nom
  stats.sort((a, b) => {
    if (b.clientsHandledDistinct !== a.clientsHandledDistinct) return b.clientsHandledDistinct - a.clientsHandledDistinct;
    return a.name.localeCompare(b.name);
  });

  return stats;
}