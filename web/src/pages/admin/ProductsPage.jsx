// /src/pages/admin/ProductsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog.jsx";
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
import { toast } from "sonner";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertTriangle,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Video,
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
  FileUp,
  Filter,
  ChevronDown,
  ChevronUp,
  DollarSign,
  PieChart,
  ShoppingBag,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.jsx";

// Catégories standard
const STANDARD_CATEGORIES = [
  { value: "Hair Care", label: "Soins Cheveux", icon: "💇" },
  { value: "Skincare", label: "Soins Visage", icon: "🧴" },
  { value: "Makeup", label: "Maquillage", icon: "💄" },
  { value: "Accessories", label: "Accessoires", icon: "💍" },
  { value: "Nail Care", label: "Soins Ongles", icon: "💅" },
  { value: "Body Care", label: "Soins Corps", icon: "🧖" },
];

const UNITS = [
  { value: "piece", label: "Pièce" },
  { value: "pack", label: "Pack" },
  { value: "kg", label: "Kg" },
  { value: "gram", label: "Gramme" },
  { value: "liter", label: "Litre" },
  { value: "ml", label: "Millilitre" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCategoryStats, setShowCategoryStats] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  
  // États pour les catégories personnalisées
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Hair Care",
    selling_price: "",
    purchase_price: "",
    stock_quantity: "",
    reference: "",
    unit: "piece",
    image_url: "",
  });

  // États pour la suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Récupérer les catégories personnalisées existantes
  const fetchCustomCategories = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("tenant_id", tenantId);

      if (error) throw error;

      const allCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
      const custom = allCategories.filter(cat => 
        !STANDARD_CATEGORIES.some(sc => sc.value === cat)
      );
      
      setCustomCategories(custom);
    } catch (error) {
      console.error("Error fetching custom categories:", error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) throw error;
      
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchProducts();
      fetchCustomCategories();
    }
  }, [currentUser]);

  // Upload du fichier vers Supabase Storage
  const uploadFile = async (file) => {
    const isVideo = file.type.startsWith('video/');
    const extension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `products/${fileName}`;

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();

      if (bucketsError) {
        console.error("Error listing buckets:", bucketsError);
        throw new Error("Impossible d'accéder au stockage");
      }

      const bucketExists = buckets?.some(b => b.id === 'products');
      
      if (!bucketExists) {
        const { error: createError } = await supabase
          .storage
          .createBucket('products', { public: true });

        if (createError) {
          console.error("Error creating bucket:", createError);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        if (uploadError.message?.includes('Bucket not found')) {
          const { error: createError } = await supabase
            .storage
            .createBucket('products', { public: true });
          
          if (createError) {
            throw new Error("Impossible de créer le bucket de stockage");
          }
          
          const { error: retryError } = await supabase.storage
            .from("products")
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });
          
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      toast.error("Veuillez sélectionner une image ou une vidéo");
      return;
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Le fichier est trop volumineux (max ${isVideo ? '50MB' : '5MB'})`);
      return;
    }

    setSelectedFile(file);
    setFileType(isVideo ? 'video' : 'image');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fonction pour ajouter une catégorie personnalisée
  const handleAddCustomCategory = () => {
    if (!customCategory.trim()) {
      toast.error("Veuillez saisir un nom de catégorie");
      return;
    }

    // Vérifier si la catégorie existe déjà
    const exists = STANDARD_CATEGORIES.some(c => c.value === customCategory.trim()) ||
                   customCategories.includes(customCategory.trim());
    
    if (exists) {
      toast.warning("Cette catégorie existe déjà");
      return;
    }

    setCustomCategories(prev => [...prev, customCategory.trim()]);
    setFormData({ ...formData, category: customCategory.trim() });
    setCustomCategory("");
    setShowCustomCategory(false);
    toast.success(`Catégorie "${customCategory.trim()}" ajoutée avec succès`);
  };

  const handleCategoryChange = (value) => {
    if (value === "custom") {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: "" });
    } else if (value === "existing-custom") {
      // Déjà géré par le select
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Veuillez entrer un nom de produit");
      return;
    }
    if (!formData.selling_price) {
      toast.error("Veuillez entrer un prix de vente");
      return;
    }
    if (!formData.stock_quantity) {
      toast.error("Veuillez entrer une quantité en stock");
      return;
    }

    // ✅ Si on est en mode catégorie personnalisée
    let finalCategory = formData.category;
    if (showCustomCategory) {
      if (!customCategory.trim()) {
        toast.error("Veuillez saisir un nom de catégorie personnalisée");
        return;
      }
      finalCategory = customCategory.trim();
    }

    // ✅ Vérifier si la catégorie est valide
    if (!finalCategory) {
      toast.error("Veuillez sélectionner ou créer une catégorie");
      return;
    }

    setUploading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      let imageUrl = formData.image_url;

      if (selectedFile) {
        imageUrl = await uploadFile(selectedFile);
      }

      const payload = {
        tenant_id: tenantId,
        name: formData.name.trim(),
        description: formData.description || null,
        category: finalCategory,
        selling_price: parseFloat(formData.selling_price) || 0,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
        reference: formData.reference || null,
        unit: formData.unit || "piece",
        image_url: imageUrl || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Produit mis à jour avec succès");
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from("products").insert([payload]);

        if (error) throw error;
        toast.success("Produit ajouté avec succès");
        
        // ✅ Ajouter la nouvelle catégorie à la liste des catégories personnalisées
        if (showCustomCategory && customCategory.trim()) {
          setCustomCategories(prev => [...prev, customCategory.trim()]);
        }
      }

      setModalOpen(false);
      resetForm();
      fetchProducts();
      fetchCustomCategories();
    } catch (err) {
      console.error("Error saving product:", err);
      toast.error(err.message || "Erreur de sauvegarde");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "Hair Care",
      selling_price: "",
      purchase_price: "",
      stock_quantity: "",
      reference: "",
      unit: "piece",
      image_url: "",
    });
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    setEditingId(null);
    setCustomCategory("");
    setShowCustomCategory(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);

      if (error) throw error;
      
      toast.success(`"${productToDelete.name}" a été supprimé`);
      fetchProducts();
      fetchCustomCategories();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error(err.message || "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigateToEdit = (productId) => {
    navigate(`/admin/products/${productId}/edit`);
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('products')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        if (error.code === '42703') {
          toast.warning("La fonctionnalité d'activation/désactivation n'est pas disponible. Veuillez contacter l'administrateur.");
          return;
        }
        throw error;
      }
      
      toast.success(
        newStatus 
          ? '✅ Produit activé (sera affiché sur l\'écran public)' 
          : '⛔ Produit désactivé (ne sera plus affiché sur l\'écran public)'
      );
      fetchProducts();
    } catch (err) {
      console.error('Error toggling product:', err);
      toast.error('Erreur lors du changement de statut');
    }
  };

  const isVideoFile = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Filtrer les produits
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.reference?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (!showInactive && p.is_active === false) return false;
    
    return true;
  });

  // Statistiques par catégorie
  const getCategoryStats = () => {
    const stats = {};
    products.forEach(p => {
      const cat = p.category || "Other";
      if (!stats[cat]) {
        stats[cat] = {
          count: 0,
          totalStock: 0,
          totalValue: 0,
          active: 0,
          inactive: 0,
          outOfStock: 0,
        };
      }
      stats[cat].count++;
      stats[cat].totalStock += p.stock_quantity || 0;
      stats[cat].totalValue += (p.selling_price || 0) * (p.stock_quantity || 0);
      if (p.is_active !== false) stats[cat].active++;
      else stats[cat].inactive++;
      if ((p.stock_quantity || 0) <= 0) stats[cat].outOfStock++;
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  // Statistiques globales
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active !== false).length;
  const inactiveProducts = products.filter(p => p.is_active === false).length;
  const outOfStock = products.filter(p => (p.stock_quantity || 0) <= 0).length;
  const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) < 5).length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
  const totalValue = products.reduce(
    (sum, p) => sum + (p.selling_price || 0) * (p.stock_quantity || 0),
    0,
  );

  const getStockStatus = (quantity) => {
    if (quantity <= 0)
      return { label: "Rupture", color: "bg-red-100 text-red-800" };
    if (quantity < 5)
      return { label: "Stock bas", color: "bg-yellow-100 text-yellow-800" };
    return { label: "En stock", color: "bg-green-100 text-green-800" };
  };

  const renderFilePreview = () => {
    if (!filePreview) {
      if (formData.image_url && !editingId) {
        if (isVideoFile(formData.image_url)) {
          return (
            <video
              src={formData.image_url}
              className="w-full h-48 object-cover rounded-lg"
              controls
            />
          );
        }
        return (
          <img
            src={formData.image_url}
            alt="Aperçu"
            className="w-full h-48 object-cover rounded-lg"
          />
        );
      }
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <FileUp className="h-12 w-12 mb-2 opacity-30" />
          <p className="text-sm">Aucun fichier sélectionné</p>
          <p className="text-xs">PNG, JPG, WEBP, MP4, WEBM, MOV</p>
        </div>
      );
    }

    if (fileType === 'video') {
      return (
        <video
          src={filePreview}
          className="w-full h-48 object-cover rounded-lg"
          controls
        />
      );
    }

    return (
      <img
        src={filePreview}
        alt="Aperçu"
        className="w-full h-48 object-cover rounded-lg"
      />
    );
  };

  // Obtenir toutes les catégories pour le sélecteur
  const getAllCategories = () => {
    return [
      ...STANDARD_CATEGORIES,
      ...customCategories.map(cat => ({ 
        value: cat, 
        label: cat, 
        icon: "🏷️",
        isCustom: true 
      }))
    ];
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Produits & Stock
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre inventaire et vos ventes.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/public-display')}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Écran public
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Nouveau Produit
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {activeProducts} actifs
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
                    {inactiveProducts} inactifs
                  </Badge>
                </div>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock total</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {totalStock}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {outOfStock} en rupture
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    {lowStock} stock bas
                  </Badge>
                </div>
              </div>
              <Layers className="h-8 w-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valeur du stock</p>
                <p className="text-2xl font-bold text-purple-700">
                  {totalValue.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Valeur totale en inventaire
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Catégories</p>
                <p className="text-2xl font-bold text-amber-700">
                  {Object.keys(categoryStats).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {customCategories.length} personnalisées
                </p>
              </div>
              <PieChart className="h-8 w-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques par catégorie */}
      <Collapsible open={showCategoryStats} onOpenChange={setShowCategoryStats}>
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Statistiques par catégorie
                  <Badge variant="secondary" className="text-xs">
                    {Object.keys(categoryStats).length} catégories
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {showCategoryStats ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Object.entries(categoryStats).map(([category, stats]) => {
                  const catInfo = STANDARD_CATEGORIES.find(c => c.value === category);
                  const isCustom = !catInfo;
                  const icon = catInfo?.icon || "🏷️";
                  const label = catInfo?.label || category;
                  
                  return (
                    <Card key={category} className={`border ${isCustom ? 'bg-purple-50/30 hover:bg-purple-50/50' : 'bg-muted/20 hover:bg-muted/30'} transition-colors`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate flex items-center gap-1">
                              {label}
                              {isCustom && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-purple-100 text-purple-700 border-purple-200">
                                  Perso
                                </Badge>
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{stats.count} produits</span>
                              <span>•</span>
                              <span>{stats.totalStock} unités</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-green-500" />
                            <span className="text-green-600">{stats.active}</span>
                            {stats.inactive > 0 && (
                              <>
                                <span className="text-muted-foreground">/</span>
                                <EyeOff className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-500">{stats.inactive}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-purple-500" />
                            <span className="font-medium text-purple-600">
                              {stats.totalValue.toLocaleString()} FCFA
                            </span>
                          </div>
                          {stats.outOfStock > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {stats.outOfStock} rupture
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tableau avec filtres */}
      <Card className="dashboard-card border-none shadow-md">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Inventaire
            <Badge variant="secondary" className="ml-2">
              {filteredProducts.length} produits
            </Badge>
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-9 bg-background">
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {STANDARD_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
                {customCategories.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
                      ─ Personnalisées ─
                    </div>
                    {customCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        🏷️ {cat}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            <Button
              variant={showInactive ? "default" : "outline"}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
              className="gap-2 h-9"
            >
              {showInactive ? (
                <>
                  <Eye className="h-4 w-4" />
                  Tous
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Masquer inactifs
                </>
              )}
            </Button>

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Aucun produit trouvé
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par ajouter votre premier produit
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setModalOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter un produit
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Aucun produit ne correspond
              </p>
              <p className="text-sm text-muted-foreground">
                {showInactive 
                  ? 'Essayez de modifier votre recherche ou vos filtres' 
                  : 'Essayez d\'afficher les produits inactifs'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Produit</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Prix vente</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Statut stock</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Visibilité</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => {
                    const stockStatus = getStockStatus(p.stock_quantity);
                    const isActive = p.is_active !== false && p.is_active !== undefined;
                    const isVideo = isVideoFile(p.image_url);
                    const catInfo = STANDARD_CATEGORIES.find(c => c.value === p.category);
                    const isCustom = !catInfo;
                    
                    return (
                      <TableRow 
                        key={p.id}
                        className={!isActive ? 'opacity-60 bg-gray-50/50' : ''}
                      >
                        <TableCell className="font-medium pl-6">
                          <div className="flex items-center gap-3">
                            {p.image_url ? (
                              isVideo ? (
                                <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                  <video
                                    src={p.image_url}
                                    className="h-full w-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Video className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <img 
                                  src={p.image_url} 
                                  alt={p.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className={!isActive ? 'text-gray-400' : ''}>
                                {p.name}
                                {!isActive && (
                                  <span className="ml-2 text-xs text-gray-400 font-normal">
                                    (inactif)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {p.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {p.reference || "-"}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {catInfo?.icon ? <span>{catInfo.icon}</span> : <span>🏷️</span>}
                            {catInfo?.label || p.category}
                            {isCustom && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 bg-purple-100 text-purple-700 border-purple-200">
                                Perso
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {p.selling_price?.toLocaleString()} FCFA
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {p.stock_quantity}
                            {p.stock_quantity < 5 &&
                              p.stock_quantity > 0 && (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={stockStatus.color}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={isVideo ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-blue-100 text-blue-800 border-blue-200"}>
                            {isVideo ? (
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Vidéo
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Image
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={isActive 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-gray-100 text-gray-500 border-gray-200"
                            }
                          >
                            {isActive ? (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Actif
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <EyeOff className="h-3 w-3" />
                                Inactif
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant={isActive ? "outline" : "default"}
                              size="sm"
                              className={isActive 
                                ? "border-green-500 text-green-600 hover:bg-green-50" 
                                : "bg-gray-500 text-white hover:bg-gray-600"
                              }
                              onClick={() => handleToggleActive(p.id, isActive)}
                              title={isActive ? "Désactiver (cacher sur l'écran)" : "Activer (afficher sur l'écran)"}
                            >
                              {isActive ? (
                                <>
                                  <PowerOff className="h-3 w-3 mr-1" />
                                  Désactiver
                                </>
                              ) : (
                                <>
                                  <Power className="h-3 w-3 mr-1" />
                                  Activer
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleNavigateToEdit(p.id)}
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(p)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le produit 
              <span className="font-semibold text-foreground block mt-1">
                "{productToDelete?.name}"
              </span>
              ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {productToDelete && (
              <div className="bg-muted/30 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Référence:</span>
                  <span>{productToDelete.reference || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Catégorie:</span>
                  <span>{productToDelete.category || "Non définie"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock:</span>
                  <span>{productToDelete.stock_quantity || 0} unités</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix:</span>
                  <span>{productToDelete.selling_price?.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal d'ajout/modification avec catégories personnalisées */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        setModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? "Modifier le produit" : "Nouveau produit"}
              {customCategories.length > 0 && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {customCategories.length} catégories perso
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nom du produit *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-background"
                  placeholder="ex: Shampoing nourrissant"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="bg-background"
                  placeholder="Description détaillée du produit..."
                />
              </div>

              {/* ✅ Sélecteur de catégorie avec option personnalisée */}
              <div className="space-y-2 col-span-2">
                <Label>Catégorie</Label>
                <Select
                  value={showCustomCategory ? "custom" : formData.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Catégories standard */}
                    {STANDARD_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                    
                    {/* Séparateur si des catégories personnalisées existent */}
                    {customCategories.length > 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
                        ─ Catégories personnalisées ─
                      </div>
                    )}
                    
                    {/* Catégories personnalisées */}
                    {customCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-2">
                          <span>🏷️</span>
                          {cat}
                        </span>
                      </SelectItem>
                    ))}
                    
                    {/* Option "Ajouter une catégorie" */}
                    <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
                      <SelectItem value="custom" className="text-primary font-medium">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          ✨ Ajouter une catégorie personnalisée
                        </span>
                      </SelectItem>
                    </div>
                  </SelectContent>
                </Select>

                {/* ✅ Champ pour la catégorie personnalisée */}
                {showCustomCategory && (
                  <div className="mt-2 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                    <Label className="text-sm font-medium">Nouvelle catégorie</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        placeholder="ex: Produits Bio, Luxe, Naturel..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="flex-1 bg-background"
                        autoFocus
                      />
                      <Button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowCustomCategory(false);
                          setCustomCategory("");
                          setFormData({ ...formData, category: "Hair Care" });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      💡 Cette catégorie sera disponible pour tous vos produits
                    </p>
                  </div>
                )}

                {/* Affichage de la catégorie actuelle */}
                {formData.category && !showCustomCategory && (
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {STANDARD_CATEGORIES.find(c => c.value === formData.category)?.icon || "🏷️"}
                      {" "}
                      {STANDARD_CATEGORIES.find(c => c.value === formData.category)?.label || formData.category}
                    </Badge>
                    {customCategories.includes(formData.category) && (
                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                        Personnalisée
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Référence</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="SKU-001"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Prix de vente (FCFA) *</Label>
                <Input
                  type="number"
                  step="100"
                  required
                  value={formData.selling_price}
                  onChange={(e) =>
                    setFormData({ ...formData, selling_price: e.target.value })
                  }
                  className="bg-background"
                  placeholder="5000"
                />
              </div>

              <div className="space-y-2">
                <Label>Prix d'achat (FCFA)</Label>
                <Input
                  type="number"
                  step="100"
                  value={formData.purchase_price}
                  onChange={(e) =>
                    setFormData({ ...formData, purchase_price: e.target.value })
                  }
                  className="bg-background"
                  placeholder="4000"
                />
              </div>

              <div className="space-y-2">
                <Label>Quantité en stock *</Label>
                <Input
                  type="number"
                  required
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_quantity: e.target.value })
                  }
                  className="bg-background"
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload de fichier */}
              <div className="space-y-2 col-span-2">
                <Label>Image ou Vidéo</Label>
                <div className="border-2 border-dashed rounded-lg p-4 transition-all hover:border-primary/50">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer block"
                  >
                    <div className="relative">
                      <div className="min-h-[120px] flex items-center justify-center">
                        {uploading ? (
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <p className="text-sm text-muted-foreground mt-2">
                              Upload en cours...
                            </p>
                          </div>
                        ) : (
                          renderFilePreview()
                        )}
                      </div>

                      {!uploading && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => document.getElementById('file-upload').click()}
                          >
                            <Upload className="h-4 w-4" />
                            {selectedFile ? 'Changer le fichier' : 'Choisir un fichier'}
                          </Button>
                          {selectedFile && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              onClick={removeSelectedFile}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}

                      {selectedFile && !uploading && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats supportés: Images (PNG, JPG, WEBP) ou Vidéos (MP4, WEBM, MOV)
                </p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setModalOpen(false);
                }}
                disabled={uploading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={uploading} className="gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    {editingId ? "Mettre à jour" : "Ajouter"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}