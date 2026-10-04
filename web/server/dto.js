// Serialisation des lignes Prisma vers la forme consommee par le frontend.
// Le nommage reste en snake_case comme le faisait PostgREST, ce qui evite de
// reecrire les composants qui lisent `profile.tenant_id` ou `profile.full_name`.

export function tenantDto(t) {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    slug: t.slug ?? null,
    logo: t.logo ?? null,
    logo_url: t.logoUrl ?? null,
    cover_image: t.coverImage ?? null,
    primary_color: t.primaryColor ?? null,
    secondary_color: t.secondaryColor ?? null,
    phone: t.phone ?? null,
    email: t.email ?? null,
    address: t.address ?? null,
    city: t.city ?? null,
    subscription_plan: t.subscriptionPlan ?? null,
    subscription_status: t.subscriptionStatus ?? null,
    subscription_start: t.subscriptionStart ?? null,
    subscription_end: t.subscriptionEnd ?? null,
    rating: t.rating === null || t.rating === undefined ? null : Number(t.rating),
    is_active: Boolean(t.isActive),
    show_on_home: Boolean(t.showOnHome),
  };
}

export function profileDto(p, tenant = null) {
  if (!p) return null;
  return {
    id: p.id,
    tenant_id: p.tenantId ?? null,
    email: p.email,
    full_name: p.name,
    phone: p.phone ?? null,
    role: p.role,
    avatar: p.image ?? null,
    is_active: Boolean(p.isActive),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    email_verified: Boolean(p.emailVerified),
    must_change_password: Boolean(p.mustChangePassword),
    tenants: tenantDto(tenant),
  };
}