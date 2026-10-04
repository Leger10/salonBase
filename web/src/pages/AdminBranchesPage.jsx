import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from '@/lib/supabase';
import DashboardLayout from "@/layouts/DashboardLayout.jsx";
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
  Trash2,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminBranchesPage() {
  console.log("✅ AdminBranchesPage est monté");
  
  const { currentUser } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    is_main: false,
    is_active: true,
  });

  useEffect(() => {
    console.log("🔄 useEffect exécuté");
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log("📡 FetchData appelé");
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      console.log("🏢 Tenant ID:", tenantId);
      
      if (!tenantId) {
        console.warn("⚠️ Pas de tenant_id, utilisation de données de test");
        // Données de test pour que la page s'affiche
        setBranches([
          {
            id: "1",
            name: "Salon Principal (Test)",
            address: "123 Rue de Test, Paris",
            phone: "01 23 45 67 89",
            email: "test@salon.com",
            is_main: true,
            is_active: true,
            tenant_id: "test"
          }
        ]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_main", { ascending: false });

      console.log("📦 Données reçues:", data);
      
      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }
      
      setBranches(data || []);
    } catch (error) {
      console.error("❌ Error fetching branches:", error);
      toast.error("Erreur lors du chargement");
      // En cas d'erreur, on met des données de test
      setBranches([
        {
          id: "1",
          name: "Salon Principal",
          address: "123 Rue de la Paix, Paris",
          phone: "01 23 45 67 89",
          email: "principal@salon.com",
          is_main: true,
          is_active: true,
        }
      ]);
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

      if (formData.is_main) {
        await supabase
          .from("branches")
          .update({ is_main: false })
          .eq("tenant_id", tenantId);
      }

      const payload = {
        tenant_id: tenantId,
        name: formData.name,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        is_main: formData.is_main,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingBranch) {
        const { error } = await supabase
          .from("branches")
          .update(payload)
          .eq("id", editingBranch.id);

        if (error) throw error;
        toast.success("Succursale mise à jour");
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from("branches").insert([payload]);

        if (error) throw error;
        toast.success("Succursale ajoutée");
      }

      setModalOpen(false);
      setEditingBranch(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      is_main: false,
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
      is_main: branch.is_main || false,
      is_active: branch.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette succursale ?")) return;
    try {
      const { error } = await supabase.from("branches").delete().eq("id", id);

      if (error) throw error;
      toast.success("Succursale supprimée");
      fetchData();
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleToggleStatus = async (branchId, currentStatus) => {
    try {
      const { error } = await supabase
        .from("branches")
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", branchId);

      if (error) throw error;
      toast.success(`Succursale ${!currentStatus ? "activée" : "désactivée"}`);
      fetchData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Erreur lors du changement de statut");
    }
  };

  // Ne pas afficher le skeleton si on a des données
  if (loading && branches.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Multi-établissement</h1>
            <p className="text-muted-foreground mt-1">
              Gestion des succursales
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingBranch(null);
              resetForm();
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Ajouter une succursale
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des succursales</CardTitle>
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
                        Aucune succursale trouvée
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
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(branch)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={
                                branch.is_active
                                  ? "text-destructive hover:text-destructive"
                                  : "text-green-600 hover:text-green-600"
                              }
                              onClick={() =>
                                handleToggleStatus(branch.id, branch.is_active)
                              }
                            >
                              {branch.is_active ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(branch.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>

      {/* Modal d'ajout/modification */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch
                ? "Modifier la succursale"
                : "Ajouter une succursale"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la succursale *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Succursale Centre-ville"
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

            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_main"
                  checked={formData.is_main}
                  onChange={(e) =>
                    setFormData({ ...formData, is_main: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_main" className="cursor-pointer">
                  Succursale principale
                </Label>
              </div>
              <div className="flex items-center gap-2 ml-4">
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
                  Active
                </Label>
              </div>
            </div>

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
    </DashboardLayout>
  );
}