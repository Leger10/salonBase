import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { apiFetch, getActiveTenantId, setActiveTenantId } from "@/lib/api.js";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  Building2,
  Plus,
  Edit,
  ArrowRightLeft,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminBranchesPage() {
  const { currentUser, refresh } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [entitlement, setEntitlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    city: "",
    is_active: true,
  });

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchBranches();
    } else if (currentUser) {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setBranches([]);
        setLoading(false);
        return;
      }

      const { data, entitlement: subscription } = await apiFetch("/api/admin/branches");
      setBranches(data || []);
      setEntitlement(subscription);
    } catch (err) {
      console.error("Error fetching branches:", err);
      setError(err.message || "Erreur lors du chargement");
      setBranches([]);
      toast.error("Erreur lors du chargement des succursales");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Configuration du salon non trouvée");
        return;
      }

      const payload = {
        name: formData.name,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        city: formData.city || null,
      };

      if (editingBranch) {
        if (!editingBranch.is_main) payload.isActive = formData.is_active;
        await apiFetch(`/api/admin/branches/${encodeURIComponent(editingBranch.id)}`, {
          method: "PATCH",
          body: payload,
        });
        toast.success("Succursale mise à jour");
      } else {
        const { branch } = await apiFetch("/api/admin/branches", {
          method: "POST",
          body: payload,
        });
        toast.success(`Le salon « ${branch.name} » a été ajouté`);
      }

      setModalOpen(false);
      setEditingBranch(null);
      resetForm();
      await fetchBranches();
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      city: "",
      is_active: true,
    });
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      city: branch.city || "",
      is_active: branch.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleManage = async (branch) => {
    const previousTenantId = getActiveTenantId();
    try {
      setActiveTenantId(branch.is_main ? null : branch.id);
      const user = await refresh();
      if (!user) throw new Error("Session introuvable. Veuillez vous reconnecter.");
      toast.success(`Vous gérez maintenant « ${branch.name} »`);
      navigate("/admin/dashboard");
    } catch (error) {
      setActiveTenantId(previousTenantId);
      await refresh();
      console.error("Error switching salon:", error);
      toast.error(error.message || "Impossible de changer de salon");
    }
  };

  const handleToggleStatus = async (branchId, currentStatus) => {
    try {
      if (currentStatus && currentUser?.profile?.tenant_id === branchId) {
        setActiveTenantId(null);
        const user = await refresh();
        if (!user) throw new Error("Impossible de revenir au salon principal.");
      }
      await apiFetch(`/api/admin/branches/${encodeURIComponent(branchId)}`, {
        method: "PATCH",
        body: { isActive: !currentStatus },
      });
      toast.success(`Succursale ${!currentStatus ? "activée" : "désactivée"}`);
      await fetchBranches();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Erreur lors du changement de statut");
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Multi-établissement</h1>
            <p className="text-muted-foreground mt-1">
              Gérez plusieurs salons avec leurs propres équipes et leurs propres données.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Les salons partagent l’abonnement du salon principal.
            </p>
          </div>
          <Button
            disabled={!entitlement?.isActive || entitlement.remainingBranches <= 0}
            onClick={() => {
              setEditingBranch(null);
              resetForm();
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Ajouter un salon
          </Button>
        </div>

        {entitlement && (
          <Card className={!entitlement.isActive ? "border-destructive/40 bg-destructive/5" : ""}>
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  Succursales : {entitlement.branchesCount} / {entitlement.branchLimit}
                </p>
                <p className="text-sm text-muted-foreground">
                  Votre abonnement autorise {entitlement.branchLimit} succursale(s) supplémentaire(s)
                  {entitlement.remainingBranches > 0
                    ? `, dont ${entitlement.remainingBranches} encore disponible(s).`
                    : "."}
                </p>
                {!entitlement.isActive && (
                  <p className="mt-1 text-sm font-medium text-destructive">
                    Abonnement expiré : la gestion des salons est suspendue jusqu’au renouvellement.
                  </p>
                )}
              </div>
              {(!entitlement.isActive || entitlement.remainingBranches <= 0) && (
                <Button variant="outline" asChild>
                  <Link to="/admin/subscription">Voir les abonnements</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Salons associés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        Aucun salon secondaire. Ajoutez un salon pour commencer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    branches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-medium">
                          {branch.is_main && (
                            <Badge className="mr-2 bg-primary text-white">
                              Principal
                            </Badge>
                          )}
                          {branch.name}
                        </TableCell>
                        <TableCell>
                          {branch.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" /> {branch.phone}
                            </div>
                          )}
                          {branch.email && (
                            <div className="text-xs text-muted-foreground">
                              {branch.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {branch.address ? (
                            <div className="flex items-start gap-1 text-sm">
                              <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {branch.address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              branch.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {branch.is_active ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {branch.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant={currentUser?.profile?.tenant_id === branch.id ? "outline" : "default"}
                              size="sm"
                              disabled={!branch.is_active || !entitlement?.isActive}
                              onClick={() => handleManage(branch)}
                              className="gap-2"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                              {currentUser?.profile?.tenant_id === branch.id ? "Salon actif" : "Gérer"}
                            </Button>
                            {!branch.is_main && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Modifier ${branch.name}`}
                                  disabled={!entitlement?.isActive}
                                  onClick={() => handleEdit(branch)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={branch.is_active ? `Désactiver ${branch.name}` : `Activer ${branch.name}`}
                                  disabled={!entitlement?.isActive}
                                  className={
                                    branch.is_active
                                      ? "text-destructive hover:text-destructive"
                                      : "text-green-600 hover:text-green-600"
                                  }
                                  onClick={() => handleToggleStatus(branch.id, branch.is_active)}
                                >
                                  {branch.is_active ? (
                                    <XCircle className="h-4 w-4" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      {/* Modal d'ajout/modification */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch
                ? "Modifier la succursale"
                : "Ajouter un salon"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du salon *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Salon Centre-ville"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Avenue de la Liberté"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ouagadougou"
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="07 07 07 07 07"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="succursale@salon.com"
                  className="bg-background"
                />
              </div>
            </div>

            {editingBranch && (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Salon actif
                </Label>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingBranch ? "Mettre à jour" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}