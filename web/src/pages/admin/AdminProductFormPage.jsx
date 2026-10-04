// /src/pages/admin/AdminProductFormPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Plus, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert.jsx";

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

export default function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    is_active: true,
  });

  const isEditMode = !!id;

  // Récupérer les catégories personnalisées existantes
  useEffect(() => {
    fetchCustomCategories();
  }, []);

  const fetchCustomCategories = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      // Récupérer toutes les catégories uniques des produits
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // Filtrer pour ne garder que les catégories personnalisées (non standard)
      const allCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
      const custom = allCategories.filter(cat => 
        !STANDARD_CATEGORIES.some(sc => sc.value === cat)
      );
      
      setCustomCategories(custom);
    } catch (error) {
      console.error("Error fetching custom categories:", error);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        navigate("/admin/products");
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

      if (error) throw error;

      if (data) {
        const isCustomCategory = !STANDARD_CATEGORIES.some(c => c.value === data.category);
        if (isCustomCategory && data.category) {
          setShowCustomCategory(true);
          setCustomCategory(data.category);
        }

        setFormData({
          name: data.name || "",
          description: data.description || "",
          category: data.category || "Hair Care",
          selling_price: data.selling_price?.toString() || "",
          purchase_price: data.purchase_price?.toString() || "",
          stock_quantity: data.stock_quantity?.toString() || "",
          reference: data.reference || "",
          unit: data.unit || "piece",
          image_url: data.image_url || "",
          is_active: data.is_active !== false,
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Erreur lors du chargement du produit");
      navigate("/admin/products");
    } finally {
      setLoading(false);
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

    // ✅ Si on est en mode catégorie personnalisée et qu'on a saisi une valeur
    let finalCategory = formData.category;
    if (showCustomCategory) {
      if (!customCategory.trim()) {
        toast.error("Veuillez saisir un nom de catégorie personnalisée");
        return;
      }
      finalCategory = customCategory.trim();
    }

    setSaving(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
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
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", id);

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

      navigate("/admin/products");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour ajouter une catégorie personnalisée rapide
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
    toast.success(`Catégorie "${customCategory.trim()}" ajoutée`);
  };

  const handleCategoryChange = (value) => {
    if (value === "custom") {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: "" });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Toutes les catégories disponibles (standard + personnalisées)
  const allCategories = [
    ...STANDARD_CATEGORIES,
    ...customCategories.map(cat => ({ 
      value: cat, 
      label: cat, 
      icon: "🏷️" 
    }))
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => navigate("/admin/products")}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux produits
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode ? "Modifier le produit" : "Nouveau produit"}
            {isEditMode && (
              <Badge variant="outline" className="ml-2">
                ID: {id?.slice(0, 8)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nom du produit *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="ex: Shampoing nourrissant"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Description détaillée du produit..."
                />
              </div>

              {/* ✅ Sélecteur de catégorie amélioré */}
              <div className="space-y-2 md:col-span-2">
                <Label>Catégorie</Label>
                <Select
                  value={showCustomCategory ? "custom" : formData.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
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
                        Catégories personnalisées
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
                    
                    {/* Option "Autre" */}
                    <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
                      <SelectItem value="custom">
                        <span className="flex items-center gap-2 text-primary">
                          <Plus className="h-4 w-4" />
                          Ajouter une catégorie personnalisée
                        </span>
                      </SelectItem>
                    </div>
                  </SelectContent>
                </Select>

                {/* ✅ Champ pour la catégorie personnalisée */}
                {showCustomCategory && (
                  <div className="mt-2 p-3 border rounded-lg bg-muted/20">
                    <Label className="text-sm">Nouvelle catégorie</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="ex: Produits Bio, Luxe, etc."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomCategory}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCustomCategory(false);
                          setCustomCategory("");
                          setFormData({ ...formData, category: "Hair Care" });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cette catégorie sera disponible pour tous vos produits
                    </p>
                  </div>
                )}

                {/* Affichage de la catégorie actuelle */}
                {formData.category && !showCustomCategory && (
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      Catégorie actuelle: {
                        STANDARD_CATEGORIES.find(c => c.value === formData.category)?.label || 
                        formData.category
                      }
                    </Badge>
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
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Aperçu"
                      className="h-32 w-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, is_active: v === "active" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Actif</SelectItem>
                    <SelectItem value="inactive">⛔ Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ✅ Alert pour les catégories personnalisées */}
            {customCategories.length > 0 && (
              <Alert className="bg-muted/30 border-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <span className="font-medium">Catégories personnalisées existantes :</span>{" "}
                  {customCategories.map((cat, i) => (
                    <Badge key={i} variant="secondary" className="mx-0.5">
                      {cat}
                    </Badge>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/products")}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditMode ? "Mise à jour..." : "Ajout en cours..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? "Mettre à jour" : "Ajouter"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}