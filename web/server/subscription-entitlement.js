import { prisma } from './prisma.js';
import { HttpError } from './middleware/auth.js';

const DEFAULT_MAX_MONTHLY_PRICE = 30000;
const BRANCHES_PER_TIER = 2;
const PRICE_PER_TIER = 10000;

function dateAtEndOfDay(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function durationInMonths(value) {
  const match = String(value ?? '').match(/\d+/);
  return Math.max(1, Number(match?.[0] ?? 1));
}

function planDurationInMonths(plan) {
  const namedDuration = String(plan.name ?? '').match(/\b(\d+)\s*(?:mois|months?)\b/i);
  return Math.max(
    1,
    Number(namedDuration?.[1] ?? plan.durationMonths) || 1
  );
}

export function branchCountForMonthlyPrice(monthlyPrice) {
  return Math.floor(Math.max(0, monthlyPrice) / PRICE_PER_TIER) * BRANCHES_PER_TIER;
}

export async function getSubscriptionEntitlement(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      parentTenantId: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionStart: true,
      subscriptionEnd: true,
      subscriptionMode: true,
      externalPaymentExpiry: true,
    },
  });
  if (!tenant) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Etablissement introuvable.');

  const rootTenantId = tenant.parentTenantId ?? tenant.id;
  const root = rootTenantId === tenant.id
    ? tenant
    : await prisma.tenant.findUnique({
        where: { id: rootTenantId },
        select: {
          id: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionStart: true,
          subscriptionEnd: true,
          subscriptionMode: true,
          externalPaymentExpiry: true,
        },
      });
  if (!root) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Salon principal introuvable.');

  const [latestSubscription, activeSubscription, plans, branchesCount] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId: rootTenantId },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        plan: true,
        duration: true,
        amount: true,
        status: true,
        startDate: true,
        endDate: true,
        paymentMethod: true,
        autoRenew: true,
        maxEmployees: true,
        maxServices: true,
        maxProducts: true,
        features: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { tenantId: rootTenantId, status: 'active' },
      orderBy: [{ endDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        plan: true,
        duration: true,
        amount: true,
        status: true,
        startDate: true,
        endDate: true,
        paymentMethod: true,
        autoRenew: true,
        maxEmployees: true,
        maxServices: true,
        maxProducts: true,
        features: true,
        createdAt: true,
      },
    }),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: { name: true, price: true, durationMonths: true },
    }),
    prisma.tenant.count({ where: { parentTenantId: rootTenantId } }),
  ]);

  const mode = root.subscriptionMode ?? 'subscription';
  const endDate = activeSubscription
    ? dateAtEndOfDay(activeSubscription.endDate)
    : mode === 'external'
      ? dateAtEndOfDay(root.externalPaymentExpiry)
      : dateAtEndOfDay(root.subscriptionEnd);
  const now = new Date();
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000)
    : 0;
  const isActive = mode === 'free'
    || Boolean(activeSubscription && endDate && endDate > now)
    || (mode === 'external' && Boolean(endDate && endDate > now));

  const maxMonthlyPrice = plans.length
    ? Math.max(...plans.map((plan) =>
        Number(plan.price) / planDurationInMonths(plan)
      ))
    : DEFAULT_MAX_MONTHLY_PRICE;
  const maxBranches = branchCountForMonthlyPrice(maxMonthlyPrice);

  const matchingPlan = activeSubscription
    ? await prisma.subscriptionPlan.findFirst({
        where: { name: activeSubscription.plan, isActive: true },
          select: { name: true, price: true, durationMonths: true },
      })
    : null;
  const monthlyPrice = matchingPlan
    ? Number(matchingPlan.price) / planDurationInMonths(matchingPlan)
    : activeSubscription
      ? Number(activeSubscription.amount) / durationInMonths(activeSubscription.duration)
      : 0;
  const branchLimit = Math.min(maxBranches, branchCountForMonthlyPrice(monthlyPrice));
  const selectedSubscription = isActive && activeSubscription ? activeSubscription : latestSubscription;
  const currentSubscription = selectedSubscription
    ? {
        ...selectedSubscription,
        amount: Number(selectedSubscription.amount),
        start_date: selectedSubscription.startDate,
        end_date: selectedSubscription.endDate,
        payment_method: selectedSubscription.paymentMethod,
        auto_renew: selectedSubscription.autoRenew,
        max_employees: selectedSubscription.maxEmployees,
        max_services: selectedSubscription.maxServices,
        max_products: selectedSubscription.maxProducts,
        created_at: selectedSubscription.createdAt,
      }
    : null;

  return {
    rootTenantId,
    plan: activeSubscription?.plan ?? root.subscriptionPlan,
    status: activeSubscription && isActive ? 'active' : root.subscriptionStatus,
    mode,
    endDate: endDate?.toISOString() ?? null,
    daysRemaining,
    isActive,
    monthlyPrice,
    branchLimit,
    maxBranches,
    branchesCount,
    remainingBranches: Math.max(0, branchLimit - branchesCount),
    currentSubscription,
  };
}

export async function assertSubscriptionActive(ctx) {
  if (ctx.role !== 'admin' || !ctx.tenantId) return null;
  const entitlement = await getSubscriptionEntitlement(ctx.tenantId);
  if (!entitlement.isActive) {
    throw new HttpError(
      403,
      'SUBSCRIPTION_EXPIRED',
      'Abonnement expiré. Renouvelez votre abonnement pour gérer vos salons.'
    );
  }
  return entitlement;
}
