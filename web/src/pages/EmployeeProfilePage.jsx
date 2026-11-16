// /src/pages/EmployeeProfilePage.jsx
// Profil de l'employe connecte : identite, coordonnees, disponibilite et
// securite. Les champs d'identite sont modifiables par l'employe lui-meme ;
// le poste, le taux de commission et le statut caissier restent geres par
// l'administrateur du salon.
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import {
  Award,
  Building2,
  CalendarDays,
  CheckCircle,
  Crown,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Star,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : format(date, "dd MMMM yyyy", { locale: fr });
};

export default function EmployeeProfilePage() {
  const { currentUser, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [form, setForm] = useState({ full_name: "", phone: "", avatar: "" });

  const loadProfile = useCallback(async () => {
    const tenantId = currentUser?.profile?.tenant_id;
    const profileId = currentUser?.profile?.id;

    if (!tenantId || !profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "*, profile:profile_id(id, full_name, email, phone, avatar, tenant_id, created_at)"
        )
        .eq("profile_id", profileId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;
      setEmployee(data);

      if (data) {
        setForm({
          full_name: data.profile?.full_name || "",
          phone: data.profile?.phone || "",
          avatar: data.profile?.avatar || "",
        });
      }

      const { data: tenantRow, error: tenantError } = await supabase
        .from("tenants")
        .select("id, name, address, city, phone, email")
        .eq("id", tenantId)
        .maybeSingle();
      if (tenantError) throw tenantError;
      setTenant(tenantRow || null);
    } catch (error) {
      console.error("Erreur chargement profil employe:", error);
      toast.error("Impossible de charger votre profil");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Le nom complet est obligatoire");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/me/profile", {
        method: "PATCH",
        body: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          avatar: form.avatar.trim() || null,
        },
      });
      toast.success("Profil mis à jour");
      await refresh();
      await loadProfile();
    } catch (error) {
      toast.error(error.message || "Impossible de mettre à jour le profil");
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityChange = async (nextValue) => {
    if (!employee) return;
    const previous = employee.is_available;
    setEmployee((current) => ({ ...current, is_available: nextValue }));
    setSavingAvailability(true);
    try {
      await apiFetch("/api/me/profile", {
        method: "PATCH",
        body: { is_available: nextValue },
      });
      toast.success(
        nextValue
          ? "Vous êtes maintenant disponible"
          : "Vous êtes maintenant indisponible"
      );
    } catch (error) {
      setEmployee((current) => ({ ...current, is_available: previous }));
      toast.error(error.message || "Impossible de changer votre disponibilité");
    } finally {
      setSavingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-3 sm:p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-3 sm:p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserRound className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">Profil employé introuvable</p>
            <p className="text-sm text-muted-foreground">
              Votre compte n'est rattaché à aucune fiche employé. Contactez
              l'administrateur de votre salon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = employee.profile || {};
  const displayName = form.full_name || profile.full_name || "Employé";

  return (
    <div className="space-y-5 p-3 pb-20 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <UserRound className="h-7 w-7 text-primary" />
            Mon profil
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos informations personnelles et votre disponibilité.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link to="/auth/change-password">
            <KeyRound className="h-4 w-4" />
            Changer mon mot de passe
          </Link>
        </Button>
      </div>

      {/* Carte identite */}
      <Card className="overflow-hidden border-none shadow-md">
        <div className="h-24 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
        <CardContent className="-mt-12 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={form.avatar || undefined} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <h2 className="text-xl font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  #{employee.employee_number} • {employee.position || "Employé"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    className={
                      employee.is_available
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {employee.is_available ? "🟢 Disponible" : "🔴 Indisponible"}
                  </Badge>
                  {employee.is_cashier && (
                    <Badge className="bg-amber-100 text-amber-800">
                      <Wallet className="mr-1 h-3 w-3" /> Caissier
                    </Badge>
                  )}
                  <Badge variant="outline">
                    <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {Number(employee.average_rating || 0).toFixed(1)} / 5
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-xs font-medium">Ma disponibilité</p>
                <p className="text-xs text-muted-foreground">
                  {employee.is_available
                    ? "Vous pouvez recevoir des clients"
                    : "Vous ne recevez pas de nouveaux clients"}
                </p>
              </div>
              {savingAvailability ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={Boolean(employee.is_available)}
                  onCheckedChange={handleAvailabilityChange}
                  aria-label="Disponibilité"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Crown className="h-3 w-3" /> Clients servis
            </p>
            <p className="text-2xl font-bold">{employee.total_clients_served || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" /> Note moyenne
            </p>
            <p className="text-2xl font-bold">
              {Number(employee.average_rating || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Award className="h-3 w-3" /> Commission
            </p>
            <p className="text-2xl font-bold">
              {Number(employee.commission_rate || 0).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> Depuis
            </p>
            <p className="text-sm font-bold">
              {formatDate(profile.created_at || employee.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Informations personnelles */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-5 w-5 text-primary" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="Votre nom complet"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+226 00 00 00 00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="avatar">Photo de profil (URL)</Label>
                <Input
                  id="avatar"
                  value={form.avatar}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      avatar: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour utiliser vos initiales.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse email</Label>
                <Input id="email" value={profile.email || ""} disabled />
                <p className="text-xs text-muted-foreground">
                  L'email de connexion est géré par l'administrateur.
                </p>
              </div>

              <Button type="submit" disabled={saving} className="w-full gap-2 sm:w-auto">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer les modifications
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Salon */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-primary" />
                Mon salon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Store className="h-4 w-4 text-muted-foreground" />
                {tenant?.name || "Salon"}
              </p>
              {tenant?.address && (
                <p className="text-muted-foreground">{tenant.address}</p>
              )}
              {tenant?.city && (
                <p className="text-muted-foreground">{tenant.city}</p>
              )}
              {tenant?.phone && (
                <a
                  href={`tel:${tenant.phone}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" /> {tenant.phone}
                </a>
              )}
              {tenant?.email && (
                <a
                  href={`mailto:${tenant.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" /> {tenant.email}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Poste */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Informations professionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Numéro employé</span>
                <span className="font-medium">#{employee.employee_number}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Poste</span>
                <span className="font-medium">{employee.position || "—"}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Taux de commission</span>
                <span className="font-medium">
                  {Number(employee.commission_rate || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Compte caissier</span>
                <span className="flex items-center gap-1 font-medium">
                  {employee.is_cashier ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" /> Oui
                    </>
                  ) : (
                    "Non"
                  )}
                </span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Ces informations sont gérées par l'administrateur du salon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
