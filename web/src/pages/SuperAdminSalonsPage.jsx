import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, Filter, RefreshCw, Ban, CheckCircle, Eye } from "lucide-react";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function SuperAdminSalonsPage() {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState({ plan: "all", status: "all" });
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    setLoading(true);
    try {
      // Récupérer tous les tenants avec leurs profils admin
      const { data: tenants, error } = await supabase
        .from("tenants")
        .select(
          `
          *,
          profiles!tenant_id (
            id,
            email,
            full_name,
            phone,
            role
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Organiser les données
      const formattedSalons = tenants.map((tenant) => {
        const adminProfile = tenant.profiles?.find((p) => p.role === "admin");
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
          phone: tenant.phone,
          email: tenant.email,
          address: tenant.address,
          subscription_plan: tenant.subscription_plan,
          subscription_status: tenant.subscription_status,
          subscription_start_date: tenant.subscription_start,
          subscription_end_date: tenant.subscription_end,
          created_at: tenant.created_at,
          owner: adminProfile
            ? {
                full_name: adminProfile.full_name,
                email: adminProfile.email,
                phone: adminProfile.phone,
              }
            : null,
          city: tenant.address?.split(",")[0] || "N/A",
          country: tenant.address?.split(",")[1] || "N/A",
        };
      });

      setSalons(formattedSalons);
    } catch (error) {
      console.error("Error fetching salons:", error);
      toast.error("Erreur lors du chargement des salons");
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (salonId, plan) => {
    try {
      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + 1); // +1 mois

      const { error } = await supabase
        .from("tenants")
        .update({
          subscription_status: "active",
          subscription_end: newEndDate.toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", salonId);

      if (error) throw error;

      toast.success("Abonnement renouvelé avec succès");
      fetchSalons();
    } catch (error) {
      console.error("Error renewing subscription:", error);
      toast.error("Échec du renouvellement");
    }
  };

  const handleBlock = async (salonId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir bloquer ce salon ?")) return;

    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          subscription_status: "blocked",
          updated_at: new Date().toISOString(),
        })
        .eq("id", salonId);

      if (error) throw error;

      toast.success("Accès du salon bloqué");
      fetchSalons();
    } catch (error) {
      console.error("Error blocking salon:", error);
      toast.error("Échec du blocage");
    }
  };

  const handleActivate = async (salonId) => {
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", salonId);

      if (error) throw error;

      toast.success("Salon activé avec succès");
      fetchSalons();
    } catch (error) {
      console.error("Error activating salon:", error);
      toast.error("Échec de l'activation");
    }
  };

  const filteredSalons = salons.filter((salon) => {
    const matchesSearch =
      salon.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salon.owner?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      salon.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filter.plan !== "all" && salon.subscription_plan !== filter.plan)
      return false;
    if (filter.status !== "all" && salon.subscription_status !== filter.status)
      return false;

    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      case "expired":
        return "bg-red-100 text-red-700";
      case "blocked":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Actif";
      case "inactive":
        return "Inactif";
      case "expired":
        return "Expiré";
      case "blocked":
        return "Bloqué";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestion des Salons - BeautyFlow</title>
        <meta
          name="description"
          content="Gérez tous les salons de la plateforme"
        />
      </Helmet>
      <Header />
      <div className="min-h-screen bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Gestion des Salons</h1>
            <p className="mt-2 text-muted-foreground">
              Visualisez et gérez tous les salons inscrits
            </p>
          </div>

          {/* Filtres et recherche */}
          <div className="mb-6 rounded-lg border bg-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher un salon, propriétaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-4">
                <select
                  value={filter.plan}
                  onChange={(e) =>
                    setFilter({ ...filter, plan: e.target.value })
                  }
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tous les plans</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>

                <select
                  value={filter.status}
                  onChange={(e) =>
                    setFilter({ ...filter, status: e.target.value })
                  }
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                  <option value="expired">Expirés</option>
                  <option value="blocked">Bloqués</option>
                </select>
              </div>
            </div>
          </div>

          {/* Liste des salons */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredSalons.length} salon(s) sur {salons.length}
              </p>
              <Button variant="outline" size="sm" onClick={fetchSalons}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Salon</th>
                    <th className="pb-3 font-medium">Propriétaire</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Date début</th>
                    <th className="pb-3 font-medium">Date fin</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalons.map((salon) => (
                    <tr
                      key={salon.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4">
                        <div>
                          <p className="font-medium">{salon.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {salon.city}, {salon.country}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="text-sm font-medium">
                            {salon.owner?.full_name || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {salon.owner?.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
                          {salon.subscription_plan}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(salon.subscription_status)}`}
                        >
                          {getStatusText(salon.subscription_status)}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {salon.subscription_start_date
                          ? new Date(
                              salon.subscription_start_date,
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {salon.subscription_end_date
                          ? new Date(
                              salon.subscription_end_date,
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Link
                            to={`/super-admin/salons/${salon.id}`}
                            className="rounded-lg border px-3 py-1 text-xs font-medium transition-all hover:bg-muted"
                          >
                            <Eye className="h-3 w-3 inline mr-1" />
                            Voir
                          </Link>
                          {salon.subscription_status !== "active" && (
                            <button
                              onClick={() =>
                                handleRenew(salon.id, salon.subscription_plan)
                              }
                              className="rounded-lg border border-green-600 px-3 py-1 text-xs font-medium text-green-600 transition-all hover:bg-green-50"
                            >
                              <RefreshCw className="h-3 w-3 inline mr-1" />
                              Renouveler
                            </button>
                          )}
                          {salon.subscription_status === "active" && (
                            <button
                              onClick={() => handleBlock(salon.id)}
                              className="rounded-lg border border-red-600 px-3 py-1 text-xs font-medium text-red-600 transition-all hover:bg-red-50"
                            >
                              <Ban className="h-3 w-3 inline mr-1" />
                              Bloquer
                            </button>
                          )}
                          {salon.subscription_status === "blocked" && (
                            <button
                              onClick={() => handleActivate(salon.id)}
                              className="rounded-lg border border-green-600 px-3 py-1 text-xs font-medium text-green-600 transition-all hover:bg-green-50"
                            >
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Activer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSalons.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Aucun salon trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
