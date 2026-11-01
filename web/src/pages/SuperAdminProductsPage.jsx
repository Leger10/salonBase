// /src/pages/SuperAdminProductsPage.jsx
//
// Catalogue global des produits de tous les etablissements. Permet au super
// administrateur de rechercher, filtrer, activer/desactiver ou supprimer un
// produit (moderation), sans se substituer a la gestion quotidienne du salon.
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card.jsx";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
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
  Package,
  Search,
  RefreshCw,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const currency = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

export default function SuperAdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [productsResult, tenantsResult] = await Promise.all([
        supabase
          .from("products")
          .select(`
            *,
            tenants:tenant_id (
              id,
              name,
              slug,
              subscription_status
            ),
            categories:category_id (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false }),
        supabase.from("tenants").select("id, name").order("name", { ascending: true }),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (tenantsResult.error) throw tenantsResult.error;

      setProducts(productsResult.data ?? []);
      setTenants(tenantsResult.data ?? []);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
      toast.error(error.message || "Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tenantName = (product) =>
    product.tenants?.name ||
    tenants.find((tenant) => tenant.id === product.tenant_id)?.name ||
    "Établissement inconnu";

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (tenantFilter !== "all" && product.tenant_id !== tenantFilter) return false;
      if (statusFilter === "active" && !product.is_active) return false;
      if (statusFilter === "inactive" && product.is_active) return false;
      if (statusFilter === "out" && Number(product.stock_quantity) > 0) return false;
      if (!term) return true;
      return (
        String(product.name ?? "").toLowerCase().includes(term) ||
        String(product.reference ?? "").toLowerCase().includes(term) ||
        String(product.category ?? product.categories?.name ?? "").toLowerCase().includes(term) ||
        tenantName(product).toLowerCase().includes(term)
      );
    });
  }, [products, search, tenantFilter, statusFilter, tenants]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.is_active).length;
    const out = products.filter((product) => Number(product.stock_quantity) <= 0).length;
    const stockValue = products.reduce(
      (sum, product) =>
        sum + Number(product.stock_quantity || 0) * Number(product.selling_price || 0),
      0
    );
    return { total: products.length, active, inactive: products.length - active, out, stockValue };
  }, [products]);

  const toggleProduct = async (product) => {
    const nextValue = !product.is_active;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: nextValue, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      if (error) throw error;
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, is_active: nextValue } : item))
      );
      toast.success(nextValue ? "Produit activé" : "Produit désactivé");
    } catch (error) {
      console.error("Erreur changement statut produit:", error);
      toast.error("Impossible de modifier le produit");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", selectedProduct.id);
      if (error) throw error;
      setProducts((prev) => prev.filter((item) => item.id !== selectedProduct.id));
      toast.success("Produit supprimé");
      setDeleteOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Erreur suppression produit:", error);
      toast.error("Impossible de supprimer le produit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Produits globaux
          </h1>
          <p className="text-muted-foreground mt-1">
            Catalogue de tous les établissements de la plateforme
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchData({ silent: true })} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Produits</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Actifs</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Rupture de stock</p>
            <p className="text-2xl font-bold text-amber-600">{stats.out}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Valeur du stock</p>
            <p className="text-2xl font-bold">{currency(stats.stockValue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit, une référence, un salon..."
                className="pl-9"
              />
            </div>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Établissement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les établissements</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
                <SelectItem value="out">En rupture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      Aucun produit trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const stock = Number(product.stock_quantity || 0);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover border"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name || "Sans nom"}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.reference || product.unit || "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {tenantName(product)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.categories?.name || product.category || "-"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {currency(product.selling_price)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-sm font-medium ${
                              stock <= 0
                                ? "text-red-600"
                                : stock <= Number(product.min_stock_alert || 0)
                                  ? "text-amber-600"
                                  : ""
                            }`}
                          >
                            {stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.is_active ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" /> Actif
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">
                              <XCircle className="h-3 w-3 mr-1" /> Inactif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={product.is_active ? "Désactiver" : "Activer"}
                              disabled={submitting}
                              onClick={() => toggleProduct(product)}
                            >
                              {product.is_active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              onClick={() => {
                                setSelectedProduct(product);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Supprimer ce produit ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le produit « {selectedProduct?.name} » sera définitivement supprimé du catalogue
              de {selectedProduct ? tenantName(selectedProduct) : "l'établissement"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteProduct();
              }}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
