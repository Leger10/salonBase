// Catalogue partage des packs d'abonnement.
//
// Le super administrateur gere les packs depuis /super-admin/subscriptions/plans
// et les admins de salon les voient sur /admin/subscription. Les deux pages
// lisent la meme table `subscription_plans` : toute activation, desactivation
// ou modification faite par le super admin s'applique donc automatiquement.
//
// La base de production a ete importee sans ces packs : on les cree une seule
// fois, uniquement si la table est vide, pour ne jamais ressusciter un pack que
// le super admin aurait supprime volontairement.
import { prisma } from './prisma.js';

const TIERS = [
  {
    id: 'petit_salon',
    name: 'Petit Salon',
    description: '💈 Parfait pour les salons individuels',
    icon: '💈',
    monthly: 2500,
    maxEmployees: 1,
    maxServices: 5,
    maxProducts: 5,
    features: [
      'Gestion des rendez-vous',
      'Carnet de clients',
      'Planning simple',
      'Notifications SMS',
      'Support de base',
    ],
  },
  {
    id: 'salon_moyen',
    name: 'Salon Moyen',
    description: '✂️ Pour les salons avec 2-5 employés',
    icon: '✂️',
    monthly: 7500,
    maxEmployees: 5,
    maxServices: 15,
    maxProducts: 20,
    features: [
      'Tout Petit Salon +',
      "Gestion d'équipe",
      'Planning avancé',
      'Gestion des stocks',
      'Rapports mensuels',
      'Support prioritaire',
    ],
  },
  {
    id: 'grand_salon',
    name: 'Grand Salon',
    description: '💇‍♂️ Pour les grands salons et centres de beauté',
    icon: '💇‍♂️',
    monthly: 15000,
    maxEmployees: 20,
    maxServices: 50,
    maxProducts: 100,
    features: [
      'Tout Salon Moyen +',
      'Gestion multi-sites',
      'CRM avancé',
      'Programme fidélité',
      'Réservation en ligne 24/7',
      'API personnalisée',
      'Tableaux de bord avancés',
    ],
  },
  {
    id: 'salon_plus',
    name: 'Salon Plus',
    description: '👑 Pour les grands groupes et enseignes',
    icon: '👑',
    monthly: 30000,
    maxEmployees: 50,
    maxServices: 100,
    maxProducts: 200,
    features: [
      'Tout Grand Salon +',
      'Gestion multi-enseignes',
      'Analyses prédictives',
      'Support dédié 24/7',
      'Formation incluse',
      'Migration gratuite',
      'Compte manager dédié',
    ],
  },
];

const DURATIONS = [
  { months: 1, suffix: '', idSuffix: '', discount: 0, label: '' },
  { months: 3, suffix: ' - 3 mois', idSuffix: '_3mois', discount: 10, label: 'Offre trimestrielle - Économisez 10%' },
  { months: 6, suffix: ' - 6 mois', idSuffix: '_6mois', discount: 20, label: 'Offre semestrielle - Économisez 20%' },
  { months: 12, suffix: ' - 1 an', idSuffix: '_12mois', discount: 30, label: 'Offre annuelle - Économisez 30% !' },
];

function packPrice(monthly, months, discount) {
  return Math.round(monthly * months * (1 - discount / 100));
}

/** Les 16 packs de reference (4 formules x 4 durees). */
export const DEFAULT_SUBSCRIPTION_PLANS = TIERS.flatMap((tier) =>
  DURATIONS.map((duration) => ({
    id: `${tier.id}${duration.idSuffix}`,
    name: `${tier.name}${duration.suffix}`,
    description: duration.label ? `${tier.icon} ${duration.label}` : tier.description,
    price: packPrice(tier.monthly, duration.months, duration.discount),
    currency: 'FCFA',
    durationMonths: duration.months,
    maxEmployees: tier.maxEmployees,
    maxServices: tier.maxServices,
    maxProducts: tier.maxProducts,
    features: tier.features,
    isActive: true,
  }))
);

/** Cree le catalogue une seule fois, si la table est vide. */
export async function seedSubscriptionPlans() {
  const count = await prisma.subscriptionPlan.count();
  if (count > 0) return { seeded: 0, existing: count };
  await prisma.subscriptionPlan.createMany({ data: DEFAULT_SUBSCRIPTION_PLANS });
  return { seeded: DEFAULT_SUBSCRIPTION_PLANS.length, existing: 0 };
}
