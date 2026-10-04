// /src/pages/admin/AdminServiceManagement.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import {
  Plus,
  Edit,
  Trash2,
  Filter,
  Clock,
  DollarSign,
  RefreshCw,
  Scissors,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Grid,
  List,
  Search,
  Upload,
  X,
  FolderPlus,
  FolderOpen,
  Folder,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import ServiceCard from "@/components/admin/ServiceCard.jsx";

// Composant ServiceForm extrait pour meilleure maintenabilité
const ServiceForm = React.memo(({ 
  formData, 
  setFormData, 
  imagePreview, 
  fileInputRef, 
  handleImageUpload, 
  handleRemoveImage, 
  categories, 
  submitting, 
  uploadingImage, 
  submitLabel, 
  onSubmit,
  setIsCategoryDialogOpen,
  setCategoryFormData,
  isAddDialogOpen,
  isEditDialogOpen,
  setIsAddDialogOpen,
  setIsEditDialogOpen
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom du service *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Coupe homme"
          className="bg-background"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description du service..."
          rows={3}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="category">Catégorie</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7 px-2 text-muted-foreground hover:text-primary"
            onClick={() => {
              setCategoryFormData({ name: "", type: "service" });
              setIsCategoryDialogOpen(true);
            }}
          >
            <Plus className="h-3 w-3" />
            Nouvelle catégorie
          </Button>
        </div>
        <Select
          value={formData.category_id || "none"}
          onValueChange={(value) => setFormData({ 
            ...formData, 
            category_id: value === "none" ? "" : value 
          })}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Sélectionner une catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sans catégorie</SelectItem>
            {categories && categories.length > 0 ? (
              categories
                .filter(cat => cat.id && cat.id.trim() !== '')
                .map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))
            ) : (
              <SelectItem value="no-categories" disabled>
                Aucune catégorie disponible
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            💡 Aucune catégorie trouvée. Cliquez sur "Nouvelle catégorie" pour en créer une.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon_emoji">Icône (emoji)</Label>
        <Input
          id="icon_emoji"
          value={formData.icon_emoji}
          onChange={(e) => setFormData({ ...formData, icon_emoji: e.target.value })}
          placeholder="✂️"
          maxLength={2}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="salon_type">Type de salon</Label>
        <Input
          id="salon_type"
          value={formData.salon_type}
          onChange={(e) => setFormData({ ...formData, salon_type: e.target.value })}
          placeholder="coiffure, beaute, bien-etre"
          className="bg-background"
        />
      </div>

      {/* Upload d'image */}
      <div className="space-y-2">
        <Label>Image du service</Label>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors ${
                imagePreview ? 'border-primary' : 'border-muted-foreground/20'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingImage ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="h-32 w-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Cliquez pour uploader une image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG jusqu'à 2MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'image');
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Durée (minutes) *</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="30"
            className="bg-background"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Prix (FCFA) *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="100"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="5000"
            className="bg-background"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active" className="cursor-pointer">
          Service actif (visible dans le store)
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          if (isAddDialogOpen) setIsAddDialogOpen(false);
          if (isEditDialogOpen) setIsEditDialogOpen(false);
        }}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting || uploadingImage}>
          {submitting ? "Enregistrement..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
});

ServiceForm.displayName = 'ServiceForm';

export default function AdminServiceManagement() {
  const { currentUser } = useAuth();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    duration: "",
    price: "",
    icon_emoji: "✂️",
    salon_type: "",
    image_url: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [tenantSlug, setTenantSlug] = useState(null);

  // États pour la gestion des catégories
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    type: "service",
  });
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Validation du formulaire
  const validateForm = useCallback((data) => {
    const errors = {};
    
    if (!data.name.trim()) {
      errors.name = "Le nom du service est requis";
    } else if (data.name.length < 2) {
      errors.name = "Le nom doit contenir au moins 2 caractères";
    }
    
    if (!data.duration || parseInt(data.duration) < 1) {
      errors.duration = "La durée doit être d'au moins 1 minute";
    }
    
    if (!data.price || parseFloat(data.price) < 0) {
      errors.price = "Le prix doit être un nombre positif";
    }
    
    if (parseFloat(data.price) > 999999) {
      errors.price = "Le prix ne peut pas dépasser 999,999 FCFA";
    }
    
    return errors;
  }, []);

  // Récupérer le tenant slug
  const fetchTenantSlug = useCallback(async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      if (data) {
        setTenantSlug(data.slug);
      }
    } catch (error) {
      console.error("Failed to fetch tenant slug:", error);
    }
  }, [currentUser]);

  // Récupérer les services
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      console.log('🏢 Tenant ID pour les services:', tenantId);
      
      if (!tenantId) {
        setServices([]);
        setFilteredServices([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("services")
        .select(`
          *,
          categories!category_id (
            id,
            name,
            type
          )
        `)
        .eq("tenant_id", tenantId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (filterCategory !== "all") {
        query = query.eq("category_id", filterCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur lors de la récupération des services:', error);
        throw error;
      }

      console.log('📋 Services récupérés:', data);
      console.log('📊 Nombre de services:', data?.length || 0);

      setServices(data || []);
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast.error("Échec du chargement des services");
    } finally {
      setLoading(false);
    }
  }, [currentUser, filterCategory]);

  // Récupérer les catégories
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      console.log('🏢 Tenant ID pour les catégories:', tenantId);
      
      if (!tenantId) {
        console.log('⚠️ Pas de tenant ID, impossible de récupérer les catégories');
        setCategories([]);
        setLoadingCategories(false);
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("type", "service")
        .order("name", { ascending: true });

      if (error) {
        console.error('❌ Erreur lors de la récupération des catégories:', error);
        throw error;
      }

      console.log('📂 Catégories récupérées:', data);
      console.log('📊 Nombre de catégories:', data?.length || 0);

      setCategories(data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [currentUser]);

  // Appliquer les filtres avec useMemo
  const filteredServicesMemo = useMemo(() => {
    let filtered = [...services];

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeTab === "active") {
      filtered = filtered.filter((s) => s.is_active === true);
    } else if (activeTab === "inactive") {
      filtered = filtered.filter((s) => s.is_active === false);
    }

    return filtered;
  }, [services, searchTerm, activeTab]);

  // Mettre à jour filteredServices quand filteredServicesMemo change
  useEffect(() => {
    setFilteredServices(filteredServicesMemo);
  }, [filteredServicesMemo]);

  useEffect(() => {
    console.log('🔄 useEffect - Chargement des données');
    fetchTenantSlug();
    fetchServices();
    fetchCategories();
  }, [fetchTenantSlug, fetchServices, fetchCategories]);

  // ============================================
  // GESTION DES CATÉGORIES
  // ============================================

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      toast.error("Veuillez saisir un nom de catégorie");
      return;
    }

    setSubmittingCategory(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) throw new Error("Tenant non trouvé");

      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("name", categoryFormData.name.trim())
        .eq("type", "service")
        .maybeSingle();

      if (existing) {
        toast.error("Une catégorie avec ce nom existe déjà");
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .insert({
          tenant_id: tenantId,
          name: categoryFormData.name.trim(),
          type: "service",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Catégorie "${data.name}" créée avec succès`);
      setIsCategoryDialogOpen(false);
      setCategoryFormData({ name: "", type: "service" });
      await fetchCategories();
    } catch (error) {
      console.error("Failed to add category:", error);
      toast.error(error.message || "Échec de la création de la catégorie");
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      toast.error("Veuillez saisir un nom de catégorie");
      return;
    }

    setSubmittingCategory(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) throw new Error("Tenant non trouvé");

      const { error } = await supabase
        .from("categories")
        .update({
          name: categoryFormData.name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCategory.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast.success(`Catégorie mise à jour avec succès`);
      setIsEditCategoryDialogOpen(false);
      setSelectedCategory(null);
      setCategoryFormData({ name: "", type: "service" });
      await fetchCategories();
    } catch (error) {
      console.error("Failed to update category:", error);
      toast.error(error.message || "Échec de la mise à jour de la catégorie");
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    setSubmittingCategory(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) throw new Error("Tenant non trouvé");

      const { count, error: countError } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("category_id", selectedCategory.id)
        .eq("tenant_id", tenantId);

      if (countError) throw countError;

      if (count > 0) {
        toast.error(`Impossible de supprimer cette catégorie. ${count} service(s) l'utilisent.`);
        setIsDeleteCategoryDialogOpen(false);
        setSelectedCategory(null);
        return;
      }

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", selectedCategory.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast.success("Catégorie supprimée avec succès");
      setIsDeleteCategoryDialogOpen(false);
      setSelectedCategory(null);
      await fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error(error.message || "Échec de la suppression de la catégorie");
    } finally {
      setSubmittingCategory(false);
    }
  };

  const openEditCategoryDialog = (category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
      type: category.type || "service",
    });
    setIsEditCategoryDialogOpen(true);
  };

  const openDeleteCategoryDialog = (category) => {
    setSelectedCategory(category);
    setIsDeleteCategoryDialogOpen(true);
  };

  // ============================================
  // UPLOAD D'IMAGE
  // ============================================

  const handleImageUpload = useCallback(async (file, type = 'image') => {
    if (!file) return;

    // Vérification du type de fichier
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format d\'image non supporté. Utilisez JPG, PNG, WEBP ou GIF.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2MB');
      return;
    }

    setUploadingImage(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) throw new Error('Tenant non trouvé');

      const fileExt = file.name.split('.').pop();
      const fileName = `service_${Date.now()}.${fileExt}`;
      const filePath = `tenants/${tenantId}/services/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (type === 'image') {
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
        setImagePreview(publicUrl);
      }

      toast.success('Image téléchargée avec succès');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
      setImagePreview(null);
      setFormData(prev => ({ ...prev, image_url: '' }));
    } finally {
      setUploadingImage(false);
    }
  }, [currentUser]);

  const handleRemoveImage = useCallback(() => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      category_id: "",
      duration: "",
      price: "",
      icon_emoji: "✂️",
      salon_type: "",
      image_url: "",
      is_active: true,
    });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setIsAddDialogOpen(true);
  }, [resetForm]);

  const handleEdit = useCallback((service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category_id: service.category_id || "",
      duration: service.duration.toString(),
      price: service.price.toString(),
      icon_emoji: service.icon_emoji || "✂️",
      salon_type: service.salon_type || "",
      image_url: service.image_url || "",
      is_active: service.is_active,
    });
    setImagePreview(service.image_url || null);
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleToggleStatus = useCallback(async (service) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({
          is_active: !service.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", service.id);

      if (error) throw error;

      toast.success(
        `Service ${!service.is_active ? "activé" : "désactivé"} avec succès`
      );
      fetchServices();
    } catch (error) {
      console.error("Failed to toggle service status:", error);
      toast.error("Échec du changement de statut");
    }
  }, [fetchServices]);

  const handleSubmitAdd = useCallback(async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) throw new Error("Tenant non trouvé");

      const { error } = await supabase.from("services").insert({
        tenant_id: tenantId,
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id || null,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        icon_emoji: formData.icon_emoji || "✂️",
        salon_type: formData.salon_type || null,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        display_order: services.length + 1,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Service ajouté avec succès");
      setIsAddDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error("Failed to add service:", error);
      toast.error(error.message || "Échec de l'ajout du service");
    } finally {
      setSubmitting(false);
    }
  }, [formData, currentUser, services.length, resetForm, fetchServices, validateForm]);

  const handleSubmitEdit = useCallback(async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id || null,
          duration: parseInt(formData.duration),
          price: parseFloat(formData.price),
          icon_emoji: formData.icon_emoji || "✂️",
          salon_type: formData.salon_type || null,
          image_url: formData.image_url || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedService.id);

      if (error) throw error;

      toast.success("Service mis à jour avec succès");
      setIsEditDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error("Failed to update service:", error);
      toast.error(error.message || "Échec de la mise à jour du service");
    } finally {
      setSubmitting(false);
    }
  }, [formData, selectedService, resetForm, fetchServices, validateForm]);

  const handleConfirmDelete = useCallback(async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", selectedService.id);

      if (error) throw error;

      toast.success("Service supprimé avec succès");
      setIsDeleteDialogOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast.error(error.message || "Échec de la suppression du service");
    } finally {
      setSubmitting(false);
    }
  }, [selectedService, fetchServices]);

  const countActive = services.filter((s) => s.is_active).length;
  const countInactive = services.filter((s) => !s.is_active).length;

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            Gestion des services
          </h1>
          <div className="text-muted-foreground mt-1">
            Gérez les services disponibles pour votre salon.
            <span className="ml-2 text-sm inline-flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {countActive} actifs
              </Badge>
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                <XCircle className="h-3 w-3 mr-1" />
                {countInactive} inactifs
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Folder className="h-3 w-3 mr-1" />
                {categories.length} catégories
              </Badge>
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            {showCategoryManager ? "Masquer catégories" : "Gérer les catégories"}
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter un service
          </Button>
        </div>
      </div>

      {/* Gestionnaire de catégories */}
      {showCategoryManager && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                Gestion des catégories
              </CardTitle>
              <Button 
                size="sm" 
                className="gap-1"
                onClick={() => {
                  setCategoryFormData({ name: "", type: "service" });
                  setIsCategoryDialogOpen(true);
                }}
              >
                <Plus className="h-3 w-3" />
                Nouvelle catégorie
              </Button>
            </div>
            <CardDescription>
              Les catégories permettent d'organiser vos services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCategories ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune catégorie créée</p>
                <p className="text-sm">Cliquez sur "Nouvelle catégorie" pour en créer une</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">Type: {cat.type || 'service'}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditCategoryDialog(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteCategoryDialog(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtres et recherche */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories && categories.length > 0 ? (
                    categories
                      .filter(cat => cat.id && cat.id.trim() !== '')
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-categories" disabled>
                      Aucune catégorie
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchServices} title="Actualiser">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                Tous ({services.length})
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

      {/* Liste des services */}
      {loading ? (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Scissors className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchTerm || activeTab !== 'all'
                ? "Aucun service ne correspond à vos critères"
                : "Aucun service disponible"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || activeTab !== 'all'
                ? "Essayez de modifier vos filtres"
                : "Commencez par ajouter votre premier service"}
            </p>
            {!searchTerm && activeTab === 'all' && (
              <Button variant="link" onClick={handleAdd} className="mt-2">
                Ajouter un service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>
                      <Clock className="h-3 w-3 inline mr-1" />
                      Durée
                    </TableHead>
                    <TableHead>
                      <DollarSign className="h-3 w-3 inline mr-1" />
                      Prix
                    </TableHead>
                    <TableHead>Visibilité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {service.image_url ? (
                            <img
                              src={service.image_url}
                              alt={service.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="text-xl">{service.icon_emoji || '✂️'}</span>
                          )}
                          {service.name}
                        </div>
                        {service.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {service.description}
                          </div>
                        )}
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
                        {service.price.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell>
                        {service.is_active ? (
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <Eye className="h-3 w-3" />
                            Visible
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 gap-1">
                            <EyeOff className="h-3 w-3" />
                            Masqué
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(service)}
                            className="h-8 w-8 p-0"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={service.is_active ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleToggleStatus(service)}
                            className={`h-8 px-2 text-xs ${
                              service.is_active
                                ? "border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                          >
                            {service.is_active ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Masquer
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Afficher
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(service)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="relative group">
              <ServiceCard 
                service={service} 
                showActions={false}
                tenantSlug={tenantSlug}
              />
              
              <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg hover:shadow-xl transition-all border border-gray-200/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleEdit(service);
                  }}
                  title="Modifier"
                >
                  <Edit className="h-4 w-4 text-gray-700" />
                </Button>
                <Button
                  variant={service.is_active ? "secondary" : "default"}
                  size="sm"
                  className={`h-9 w-9 p-0 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg hover:shadow-xl transition-all border border-gray-200/50 ${
                    !service.is_active ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleToggleStatus(service);
                  }}
                  title={service.is_active ? "Masquer" : "Afficher"}
                >
                  {service.is_active ? (
                    <EyeOff className="h-4 w-4 text-gray-700" />
                  ) : (
                    <Eye className="h-4 w-4 text-white" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-red-500 hover:text-white shadow-lg hover:shadow-xl transition-all border border-gray-200/50 text-red-500 hover:border-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDelete(service);
                  }}
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="absolute bottom-4 left-4 z-10">
                {service.is_active ? (
                  <Badge className="bg-green-500/95 text-white border-none text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                    <Eye className="h-3 w-3 mr-1.5" />
                    Visible
                  </Badge>
                ) : (
                  <Badge className="bg-gray-600/95 text-white border-none text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                    <EyeOff className="h-3 w-3 mr-1.5" />
                    Masqué
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog d'ajout de service */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Ajouter un service
              </span>
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau service pour votre salon. Il sera visible dans votre store une fois activé.
            </DialogDescription>
          </DialogHeader>
          <ServiceForm
            formData={formData}
            setFormData={setFormData}
            imagePreview={imagePreview}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            handleRemoveImage={handleRemoveImage}
            categories={categories}
            submitting={submitting}
            uploadingImage={uploadingImage}
            submitLabel="Ajouter"
            onSubmit={handleSubmitAdd}
            setIsCategoryDialogOpen={setIsCategoryDialogOpen}
            setCategoryFormData={setCategoryFormData}
            isAddDialogOpen={isAddDialogOpen}
            setIsAddDialogOpen={setIsAddDialogOpen}
            isEditDialogOpen={false}
            setIsEditDialogOpen={() => {}}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition de service */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Modifier le service
              </span>
            </DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du service.
            </DialogDescription>
          </DialogHeader>
          <ServiceForm
            formData={formData}
            setFormData={setFormData}
            imagePreview={imagePreview}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            handleRemoveImage={handleRemoveImage}
            categories={categories}
            submitting={submitting}
            uploadingImage={uploadingImage}
            submitLabel="Enregistrer"
            onSubmit={handleSubmitEdit}
            setIsCategoryDialogOpen={setIsCategoryDialogOpen}
            setCategoryFormData={setCategoryFormData}
            isAddDialogOpen={false}
            setIsAddDialogOpen={() => {}}
            isEditDialogOpen={isEditDialogOpen}
            setIsEditDialogOpen={setIsEditDialogOpen}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression du service */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le service{" "}
              <strong className="text-foreground">{selectedService?.name}</strong> ?
              <br />
              <span className="text-destructive">Cette action est irréversible.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* DIALOGS POUR LA GESTION DES CATÉGORIES */}
      {/* ============================================ */}

      {/* Dialog d'ajout de catégorie */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" />
                Nouvelle catégorie
              </span>
            </DialogTitle>
            <DialogDescription>
              Créez une nouvelle catégorie pour organiser vos services.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nom de la catégorie *</Label>
              <Input
                id="cat-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="Ex: Coiffure"
                className="bg-background"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submittingCategory}>
                {submittingCategory ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition de catégorie */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Modifier la catégorie
              </span>
            </DialogTitle>
            <DialogDescription>
              Mettez à jour le nom de la catégorie.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-name">Nom de la catégorie *</Label>
              <Input
                id="edit-cat-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="Ex: Coiffure"
                className="bg-background"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submittingCategory}>
                {submittingCategory ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression de catégorie */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la catégorie{" "}
              <strong className="text-foreground">{selectedCategory?.name}</strong> ?
              <br />
              <span className="text-muted-foreground text-sm">
                Cette action est irréversible. Les services utilisant cette catégorie ne pourront pas être supprimés.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingCategory}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={submittingCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submittingCategory ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}