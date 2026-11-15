// Rapport de partenariat : chiffre d'affaires issu des abonnements des salons,
// deduction des charges de survie de l'application puis partage a parts egales.
//
// Regles metier (contrat de partenariat) :
//   - le chiffre d'affaires brut d'un mois = montant des abonnements VALIDES ce mois ;
//   - les commissions des influenceurs sont deduites de ce chiffre d'affaires
//     (article 12 du contrat) : elles ne sont supportees par aucune des Parties ;
//   - 20 % du chiffre d'affaires net sont retenus pour la survie de l'application
//     (hebergement, support, maintenance, marketing) ;
//   - le reste (80 %) est partage 50/50 entre les deux associes.
//
// Le calcul est volontairement fait en JS (et non en SQL) pour rester lisible
// et auditable : chaque ligne d'abonnement, chaque salon et chaque montant
// affiche dans le tableau de bord provient d'une ligne reelle de la base.
import { prisma } from './prisma.js';

export const APP_SHARE_RATE = 0.2; // 20 % pour la survie de l'application
export const PARTNER_SPLIT = 0.5; // 50/50 sur le reste

const MONTH_LABELS = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
];

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function recognizedAt(subscription) {
  // Un abonnement est comptabilise quand il a ete valide (encaissement), sinon
  // a sa date de creation, sinon a son debut.
  return subscription.validatedAt ?? subscription.createdAt ?? subscription.startDate ?? null;
}

function emptyMonth(month) {
  return {
    month,
    label: MONTH_LABELS[month - 1],
    grossRevenue: 0,
    commissions: 0,
    revenue: 0,
    appShare: 0,
    distributable: 0,
    partnerA: 0,
    partnerB: 0,
    salonsCount: 0,
    salons: [],
  };
}

function emptyTotals() {
  return {
    grossRevenue: 0,
    commissions: 0,
    revenue: 0,
    appShare: 0,
    distributable: 0,
    partnerA: 0,
    partnerB: 0,
    salonsCount: 0,
  };
}

// `revenue` designe toujours le chiffre d'affaires NET (commissions deduites),
// c'est-a-dire la base reellement partagee entre les Parties.
function addToMonth(target, grossRevenue, commission) {
  target.grossRevenue += grossRevenue;
  target.commissions += commission;
}

function finalizeMonth(month) {
  const grossRevenue = money(month.grossRevenue);
  const commissions = money(month.commissions);
  const revenue = money(grossRevenue - commissions);
  const appShare = money(revenue * APP_SHARE_RATE);
  const distributable = money(revenue - appShare);
  const partnerA = money(distributable * PARTNER_SPLIT);
  // Le second partenaire recoit le reste exact : la somme des deux parts est
  // toujours egale au distributable, sans centime perdu par arrondi.
  const partnerB = money(distributable - partnerA);
  return {
    ...month,
    grossRevenue,
    commissions,
    revenue,
    appShare,
    distributable,
    partnerA,
    partnerB,
    salonsCount: month.salons.length,
  };
}

function finalizeTotals(totals) {
  const grossRevenue = money(totals.grossRevenue);
  const commissions = money(totals.commissions);
  const revenue = money(grossRevenue - commissions);
  const appShare = money(revenue * APP_SHARE_RATE);
  const distributable = money(revenue - appShare);
  const partnerA = money(distributable * PARTNER_SPLIT);
  const partnerB = money(distributable - partnerA);
  return { ...totals, grossRevenue, commissions, revenue, appShare, distributable, partnerA, partnerB };
}

/**
 * Rapport complet du partenariat pour une annee.
 * Les mois sans abonnement valide restent a 0 : le rapport ne fabrique jamais
 * de revenu, il indique seulement les salons actifs sans abonnement enregistre
 * pour rester transparent.
 */
export async function getPartnershipReport({ year } = {}) {
  const now = new Date();
  const requestedYear = Number.isInteger(Number(year)) && Number(year) > 2000
    ? Number(year)
    : now.getUTCFullYear();

  const [subscriptions, tenants, influencers, referrals] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        tenantId: true,
        plan: true,
        duration: true,
        amount: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        validatedAt: true,
        rejectedAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        parentTenantId: true,
      },
      orderBy: [{ name: 'asc' }],
    }),
    // Lecture SQL directe : les tables/colonnes influenceur sont creees par la
    // migration et ne dependent pas de la generation du client Prisma.
    prisma
      .$queryRawUnsafe('SELECT id, commission_rate, status FROM influencers')
      .catch(() => []),
    prisma
      .$queryRawUnsafe(
        'SELECT id, referred_by_influencer_id FROM tenants WHERE referred_by_influencer_id IS NOT NULL'
      )
      .catch(() => []),
  ]);

  // Taux de commission par influenceur, pour deduire du chiffre d'affaires les
  // commissions des salons rattaches (article 12 du contrat de partenariat).
  const commissionRates = new Map(
    influencers
      .filter((influencer) => String(influencer.status ?? 'active') !== 'inactive')
      .map((influencer) => [influencer.id, Number(influencer.commission_rate) || 0])
  );
  const referralByTenant = new Map(
    referrals.map((row) => [row.id, row.referred_by_influencer_id])
  );

  const activeSubscriptions = subscriptions.filter((row) => row.status === 'active');
  const pendingSubscriptions = subscriptions.filter((row) => row.status === 'pending');

  const years = new Set([now.getUTCFullYear(), requestedYear]);
  for (const subscription of activeSubscriptions) {
    const key = dateKey(recognizedAt(subscription));
    if (key) years.add(key.year);
  }

  const months = Array.from({ length: 12 }, (_, index) => emptyMonth(index + 1));
  const totals = emptyTotals();
  const allTime = emptyTotals();
  const allTimeSalonIds = new Set();

  for (const subscription of activeSubscriptions) {
    const key = dateKey(recognizedAt(subscription));
    if (!key) continue;
    const amount = money(subscription.amount);
    const referralId = referralByTenant.get(subscription.tenantId) ?? null;
    const influencerRate = referralId ? (commissionRates.get(referralId) ?? 0) : 0;
    const commission = money(amount * influencerRate / 100);
    const salon = {
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      tenantName: subscription.tenant?.name ?? 'Salon',
      tenantSlug: subscription.tenant?.slug ?? null,
      plan: subscription.plan,
      duration: subscription.duration,
      amount,
      commission,
      influencerRate,
      date: recognizedAt(subscription),
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    };

    // Cumul global (toutes annees confondues).
    addToMonth(allTime, amount, commission);
    allTimeSalonIds.add(subscription.tenantId);

    if (key.year !== requestedYear) continue;
    const month = months[key.month - 1];
    addToMonth(month, amount, commission);
    month.salons.push(salon);
    addToMonth(totals, amount, commission);
  }

  const finalizedMonths = months.map(finalizeMonth);
  const finalizedTotals = finalizeTotals(totals);
  finalizedTotals.salonsCount = new Set(
    finalizedMonths.flatMap((month) => month.salons.map((salon) => salon.tenantId))
  ).size;

  const finalizedAllTime = finalizeTotals({
    ...allTime,
    salonsCount: allTimeSalonIds.size,
  });

  // Salons actuellement actifs mais sans abonnement enregistre : ils ne
  // generent donc aucun revenu dans ce rapport. On les affiche pour que les
  // deux associes sachent exactement ce qui est compte et ce qui ne l'est pas.
  const tenantsWithSubscription = new Set(
    activeSubscriptions.map((subscription) => subscription.tenantId)
  );
  const activeTenantsWithoutSubscription = tenants
    .filter((tenant) => !tenant.parentTenantId)
    .filter((tenant) => tenant.subscriptionStatus === 'active')
    .filter((tenant) => !tenantsWithSubscription.has(tenant.id))
    .map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.subscriptionPlan,
    }));

  return {
    year: requestedYear,
    generatedAt: new Date().toISOString(),
    rates: { appShare: APP_SHARE_RATE * 100, split: PARTNER_SPLIT * 100 },
    partners: {
      a: { key: 'a', label: 'Associe A - fondateur (DigiHouse)' },
      b: { key: 'b', label: 'Associe B - apporteur d affaires / communication' },
    },
    months: finalizedMonths,
    totals: finalizedTotals,
    allTime: finalizedAllTime,
    years: [...years].sort((a, b) => b - a),
    activeSubscriptions: activeSubscriptions.length,
    pendingSubscriptions: pendingSubscriptions.map((subscription) => ({
      id: subscription.id,
      tenantId: subscription.tenantId,
      tenantName: subscription.tenant?.name ?? 'Salon',
      plan: subscription.plan,
      amount: money(subscription.amount),
      createdAt: subscription.createdAt,
      startDate: subscription.startDate,
    })),
    activeTenantsWithoutSubscription,
  };
}
