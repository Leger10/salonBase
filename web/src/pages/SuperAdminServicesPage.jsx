// /src/pages/SuperAdminServicesPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Search,
  Filter,
  RefreshCw,
  Scissors,
  Building2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Trash2,
  Edit,
  Shield,
  User,
  Store,
  Package,
  Calendar,
  MessageSquare,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminServicesPage() {
  const { currentUser } = useAuth();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTenant, setFilterTenant] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedService, setSelectedService] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("🔍 Récupération des services pour super admin...");

      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            slug,
            subscription_status,
            primary_color
          ),
          categories:category_id (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      console.log(`📋 ${servicesData?.length || 0} services récupérés`);

      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, name, slug, subscription_status")
        .eq("subscription_status", "active")
        .order("name");

      if (tenantsError) throw tenantsError;

      setTenants(tenantsData || []);
      setServices(servicesData || []);
      applyFilters(servicesData || [], searchTerm, filterTenant, filterStatus, activeTab);
    } catch (error) {
      console.error("❌ Error fetching services:", error);
      toast.error("Erreur lors du chargement des services");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, search, tenant, status, tab) => {
    let filtered = [...data];

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase()) ||
          s.tenants?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (tenant !== "all") {
      filtered = filtered.filter((s) => s.tenant_id === tenant);
    }

    if (status !== "all") {
      const isActive = status === "active";
      filtered = filtered.filter((s) => s.is_active === isActive);
    }

    if (tab === "active") {
      filtered = filtered.filter((s) => s.is_active === true);
    } else if (tab === "inactive") {
      filtered = filtered.filter((s) => s.is_active === false);
    }

    setFilteredServices(filtered);
  };

  useEffect(() => {
    applyFilters(services, searchTerm, filterTenant, filterStatus, activeTab);
  }, [searchTerm, filterTenant, filterStatus, activeTab, services]);

  // ========== OUVRIR LE FORMULAIRE D'ÉDITION ==========
  const openEditDialog = (service) => {
    setSelectedService(service);
    setEditFormData({
      name: service.name || "",
      description: service.description || "",
      duration: service.duration?.toString() || "",
      price: service.price?.toString() || "",
      is_active: service.is_active !== undefined ? service.is_active : true,
    });
    setIsEditDialogOpen(true);
  };

  // ========== SAUVEGARDER LES MODIFICATIONS ==========
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.duration || !editFormData.price) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: editFormData.name,
          description: editFormData.description || null,
          duration: parseInt(editFormData.duration),
          price: parseFloat(editFormData.price),
          is_active: editFormData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedService.id);

      if (error) throw error;

      toast.success(`Service "${editFormData.name}" mis à jour avec succès`);
      setIsEditDialogOpen(false);
      setSelectedService(null);
      setEditFormData({ name: "", description: "", duration: "", price: "", is_active: true });
      fetchData();
    } catch (error) {
      console.error("❌ Failed to update service:", error);
      toast.error("Échec de la mise à jour du service");
    } finally {
      setSubmitting(false);
    }
  };

  // ========== TOGGLE STATUS ==========
  const handleToggleStatus = (service, newStatus) => {
    setSelectedService(service);
    setActionType(newStatus ? "activate" : "deactivate");
    setIsToggleDialogOpen(true);
  };

  const confirmToggleStatus = async () => {
    setSubmitting(true);
    try {
      const newStatus = actionType === "activate";
      const { error } = await supabase
        .from("services")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedService.id);

      if (error) throw error;

      toast.success(
        `Service "${selectedService.name}" ${newStatus ? "activé" : "désactivé"} avec succès`
      );
      setIsToggleDialogOpen(false);
      setSelectedService(null);
      setActionType(null);
      fetchData();
    } catch (error) {
      console.error("❌ Failed to toggle service status:", error);
      toast.error("Échec du changement de statut");
    } finally {
      setSubmitting(false);
    }
  };

  // ========== SUPPRIMER ==========
  const handleDelete = (service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", selectedService.id);

      if (error) throw error;

      toast.success(`Service "${selectedService.name}" supprimé avec succès`);
      setIsDeleteDialogOpen(false);
      setSelectedService(null);
      fetchData();
    } catch (error) {
      console.error("❌ Failed to delete service:", error);
      toast.error("Échec de la suppression du service");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (isActive) => {
    if (isActive) {
      return (
        <Badge className="bg-green-100 text-green-800 gap-1">
          <CheckCircle className="h-3 w-3" />
          Actif
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 gap-1">
        <XCircle className="h-3 w-3" />
        Inactif
      </Badge>
    );
  };

  const getTenantStatusBadge = (status) => {
    const statusMap = {
      active: { label: "Actif", className: "bg-green-100 text-green-800" },
      inactive: { label: "Inactif", className: "bg-gray-100 text-gray-800" },
      expired: { label: "Expiré", className: "bg-red-100 text-red-800" },
      pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
    };
    const s = statusMap[status] || statusMap.inactive;
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const countActive = services.filter((s) => s.is_active).length;
  const countInactive = services.filter((s) => !s.is_active).length;
  const countTotal = services.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            Services Globaux
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous les services des salons de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total services</p>
                <p className="text-2xl font-bold">{countTotal}</p>
              </div>
              <Scissors className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Salons</p>
                <p className="text-2xl font-bold">{tenants.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Services actifs</p>
                <p className="text-2xl font-bold text-green-700">{countActive}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Services inactifs</p>
                <p className="text-2xl font-bold text-gray-700">{countInactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un service ou un salon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterTenant} onValueChange={setFilterTenant}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Tous les salons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les salons</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                Tous ({countTotal})
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Actifs ({countActive})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="gap-2">
                <XCircle className="h-3 w-3 text-gray-400" />
                Inactifs ({countInactive})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Table des services */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Salon</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>
                    <Clock className="h-3 w-3 inline mr-1" />
                    Durée
                  </TableHead>
                  <TableHead>
                    <DollarSign className="h-3 w-3 inline mr-1" />
                    Prix
                  </TableHead>
                  <TableHead>Statut salon</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="9" className="text-center py-12 text-muted-foreground">
                      <Scissors className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Aucun service trouvé</p>
                      <p className="text-sm">
                        {searchTerm || filterTenant !== "all" || filterStatus !== "all"
                          ? "Essayez de modifier vos filtres"
                          : "Aucun service n'a encore été créé par les salons"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {service.image_url ? (
                            <img
                              src={service.image_url}
                              alt={service.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="text-xl">{service.icon_emoji || "✂️"}</span>
                          )}
                          <div>
                            <p className="font-medium">{service.name}</p>
                            {service.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{service.tenants?.name || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {service.categories?.name ? (
                          <Badge variant="outline" className="capitalize">
                            {service.categories.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non catégorisé</span>
                        )}
                      </TableCell>
                      <TableCell>{service.duration} min</TableCell>
                      <TableCell className="font-semibold">
                        {service.price?.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell>
                        {getTenantStatusBadge(service.tenants?.subscription_status)}
                      </TableCell>
                      <TableCell>{getStatusBadge(service.is_active)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* ✅ BOUTON ÉDITER */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(service)}
                            className="h-8 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            title="Modifier"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Modifier
                          </Button>

                          {/* ✅ BOUTON ACTIVER/DÉSACTIVER */}
                          {service.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(service, false)}
                              className="h-8 px-2 text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700"
                              title="Désactiver"
                            >
                              <EyeOff className="h-3 w-3 mr-1" />
                              Désactiver
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(service, true)}
                              className="h-8 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                              title="Activer"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Activer
                            </Button>
                          )}

                          {/* ✅ BOUTON SUPPRIMER */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(service)}
                            className="h-8 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Supprimer
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

      {/* ============================================ */}
      {/* DIALOG D'ÉDITION */}
      {/* ============================================ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Modifier le service
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations du service "{selectedService?.name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom du service *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Nom du service"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Description du service..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-duration">Durée (minutes) *</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min="1"
                  value={editFormData.duration}
                  onChange={(e) => setEditFormData({ ...editFormData, duration: e.target.value })}
                  placeholder="30"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Prix (FCFA) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="100"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                  placeholder="5000"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="edit-is_active"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="edit-is_active" className="cursor-pointer">
                Service actif (visible dans le store)
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG DE CHANGEMENT DE STATUT */}
      {/* ============================================ */}
      <AlertDialog open={isToggleDialogOpen} onOpenChange={setIsToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "activate" ? "Activer le service" : "Désactiver le service"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir{" "}
              <strong>
                {actionType === "activate" ? "activer" : "désactiver"}
              </strong>{" "}
              le service{" "}
              <span className="text-foreground font-semibold">
                {selectedService?.name}
              </span>{" "}
              du salon{" "}
              <span className="text-foreground font-semibold">
                {selectedService?.tenants?.name}
              </span>
              ?
              <br />
              <span className="text-muted-foreground text-sm">
                {actionType === "activate"
                  ? "Le service sera visible dans le store du salon."
                  : "Le service sera masqué dans le store du salon."}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              disabled={submitting}
              className={
                actionType === "activate"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }
            >
              {submitting ? "Traitement..." : actionType === "activate" ? "Activer" : "Désactiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* DIALOG DE SUPPRESSION */}
      {/* ============================================ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le service{" "}
              <span className="text-foreground font-semibold">
                {selectedService?.name}
              </span>{" "}
              du salon{" "}
              <span className="text-foreground font-semibold">
                {selectedService?.tenants?.name}
              </span>
              ?
              <br />
              <span className="text-destructive font-semibold">
                Cette action est irréversible.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}