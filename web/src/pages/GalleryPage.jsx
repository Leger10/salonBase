// /src/pages/GalleryPage.jsx - Version avec code promo
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams, useParams } from "react-router-dom";
import PublicHeader from "@/components/PublicHeader.jsx";
import PublicFooter from "@/components/PublicFooter.jsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  DollarSign,
  ShoppingBag,
  Search,
  Filter,
  SlidersHorizontal,
  XCircle,
  Sparkles,
  ShoppingCart,
  Store,
  Building2,
  Plus,
  Minus,
  Trash2,
  Send,
  Wallet,
  User,
  Phone,
  MapPin,
  Star,
  Crown,
  Shield,
  Grid,
  List,
  Eye,
  AlertCircle,
  RefreshCcw,
  ArrowRight,
  Clock,
  Receipt,
  Printer,
  History,
  Mail,
  Tag,
  Percent,
  Gift,
  TicketPercent,
  CheckCircle as CheckCircleIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveTenant } from "@/contexts/ActiveTenantContext";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.jsx";
import { Slider } from "@/components/ui/slider.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet.jsx";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.jsx";
import { toast } from "sonner";

// ============================================
// ✅ CATÉGORIES AVEC LABELS FRANÇAIS
// ============================================
const CATEGORY_MAPPING = {
  "Hair Care": { label: "Soins Cheveux", icon: "💇" },
  Skincare: { label: "Soins Visage", icon: "🧴" },
  Makeup: { label: "Maquillage", icon: "💄" },
  Accessories: { label: "Accessoires", icon: "💍" },
  "Nail Care": { label: "Soins Ongles", icon: "💅" },
  "Body Care": { label: "Soins Corps", icon: "🧖" },
  Other: { label: "Autre", icon: "📦" },
};

const getCategoryLabel = (value) => {
  if (!value) return "Non défini";
  return CATEGORY_MAPPING[value]?.label || value;
};

const getCategoryIcon = (value) => {
  if (!value) return "📦";
  return CATEGORY_MAPPING[value]?.icon || "📦";
};

// ============================================
// COMPOSANT SALON CARD
// ============================================
const SalonCard = ({ tenant, isSelected, onSelect, isUserTenant }) => {
  const initial = tenant.name?.charAt(0) || "S";
  const color = tenant.primary_color || "#2563eb";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
        isSelected
          ? "border-primary shadow-lg shadow-primary/20 bg-primary/5"
          : "border-transparent hover:border-primary/30 hover:shadow-md bg-card"
      }`}
      onClick={() => onSelect(tenant)}
    >
      <div className="p-4 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            backgroundColor: tenant.logo_url ? "transparent" : `${color}20`,
          }}
        >
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl font-bold" style={{ color }}>
              {initial}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate">{tenant.name}</h3>
            {tenant.subscription_plan === "premium" && (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
            {isSelected && (
              <Badge className="bg-primary text-white border-0 text-xs">
                Sélectionné
              </Badge>
            )}
            {isUserTenant && (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-primary/50 text-primary"
              >
                <Shield className="h-3 w-3" />
                Votre salon
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {tenant.city && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {tenant.city}
              </span>
            )}
            <span>•</span>
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{tenant.rating || "4.5"}</span>
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// COMPOSANT PRODUIT CARD
// ============================================
const ProductCard = ({ product, onClick, onAddToCart, isInCart, tenantName }) => {
  const categoryLabel = getCategoryLabel(product.category);
  const categoryIcon = getCategoryIcon(product.category);
  const [imageError, setImageError] = useState(false);
  const hasImage = product.image_url && !imageError;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-52 md:h-60 overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10">
        {hasImage ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
            <span className="text-7xl md:text-8xl mb-2">
              {categoryIcon || "📦"}
            </span>
            <span className="text-xs text-muted-foreground">Aucune image</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl px-3.5 py-2 shadow-lg border border-white/20">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold text-base md:text-lg">
              {product.price.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-xl px-3 py-1.5 text-white text-xs md:text-sm border border-white/10">
            <ShoppingBag className="h-3.5 w-3.5" />
            Stock: {product.stock_quantity || 0}
          </div>
        </div>

        <div className="absolute top-4 left-4">
          <Badge
            variant="secondary"
            className="bg-black/50 backdrop-blur-sm text-white border-white/20 text-xs"
          >
            {categoryIcon} {categoryLabel}
          </Badge>
        </div>

        {tenantName && (
          <div className="absolute bottom-16 left-4">
            <Badge className="bg-primary/80 text-white border-0 text-[10px] backdrop-blur-sm">
              <Store className="h-3 w-3 mr-1" />
              {tenantName}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg md:text-xl font-bold leading-tight truncate">
              {product.name}
            </h3>
            {product.category && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {getCategoryLabel(product.category)}
              </span>
            )}
          </div>
          {isInCart && (
            <Badge className="bg-emerald-500 text-white text-xs">
              Dans le panier
            </Badge>
          )}
        </div>

        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <Button
          size="sm"
          variant={isInCart ? "default" : "secondary"}
          className={`w-full gap-2 ${
            isInCart
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-primary hover:bg-primary/90 text-white"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.();
          }}
        >
          <ShoppingBag className="h-4 w-4" />
          {isInCart ? "Dans le panier" : "Ajouter au panier"}
        </Button>
      </div>
    </motion.div>
  );
};

// ============================================
// COMPOSANT REÇU DE COMMANDE
// ============================================
// ============================================
// COMPOSANT REÇU DE COMMANDE AVEC INFOS SALON
// ============================================
const OrderReceipt = ({ order, onClose, tenantInfo }) => {
  if (!order) return null;

  const total = order.transaction_lines?.reduce(
    (sum, line) => sum + (line.total_price || 0), 
    0
  ) || order.amount || 0;

  // Récupérer les informations du salon
  const salonName = tenantInfo?.name || order.tenant_name || "BeautyFlow";
  const salonAddress = tenantInfo?.address || "";
  const salonPhone = tenantInfo?.phone || "";
  const salonEmail = tenantInfo?.email || "";
  const salonLogo = tenantInfo?.logo_url || "";
  const primaryColor = tenantInfo?.primary_color || "#ec4899";

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Reçu de commande
          </DialogTitle>
          <DialogDescription>N° {order.receipt_number}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ✅ En-tête avec logo et infos du salon */}
          <div className="text-center border-b pb-4">
            {salonLogo && (
              <img 
                src={salonLogo} 
                alt={salonName} 
                className="h-16 w-16 rounded-full object-cover mx-auto mb-2 border-2" 
                style={{ borderColor: primaryColor }}
              />
            )}
            <h3 className="font-bold text-lg" style={{ color: primaryColor }}>
              {salonName}
            </h3>
            {salonAddress && (
              <p className="text-sm text-muted-foreground">{salonAddress}</p>
            )}
            {salonPhone && (
              <p className="text-sm text-muted-foreground">📞 {salonPhone}</p>
            )}
            {salonEmail && (
              <p className="text-sm text-muted-foreground">✉️ {salonEmail}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          {/* ✅ Informations client */}
          <div className="bg-muted/20 p-3 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{order.customer_name || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Téléphone</span>
              <span className="font-medium">{order.customer_phone || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                {order.status === "paid" ? "✅ Payé" : "⏳ En attente"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Méthode</span>
              <span className="font-medium">
                {order.payment_method === "cash" ? "Espèces" : 
                 order.payment_method === "card" ? "Carte" : 
                 order.payment_method === "mobile" ? "Mobile Money" : 
                 order.payment_method || "N/A"}
              </span>
            </div>
            {order.discount_code && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span className="text-muted-foreground">Code promo</span>
                <span className="font-medium">{order.discount_code}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span className="text-muted-foreground">Réduction</span>
                <span className="font-medium">-{order.discount_amount.toLocaleString()} FCFA</span>
              </div>
            )}
          </div>

          {/* ✅ Lignes de commande */}
          <div className="border rounded-lg divide-y">
            {order.transaction_lines?.map((line, index) => (
              <div key={index} className="p-3 flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium">{line.products?.name || "Produit"}</p>
                  <p className="text-sm text-muted-foreground">
                    {line.quantity} × {(line.products?.selling_price || line.unit_price || 0).toLocaleString()} FCFA
                  </p>
                </div>
                <span className="font-bold">
                  {(line.total_price || 0).toLocaleString()} FCFA
                </span>
              </div>
            ))}
          </div>

          {/* ✅ Total */}
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">
                {(order.total_after_discount || order.amount || total).toLocaleString()} FCFA
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>Sous-total</span>
                <span>{order.amount?.toLocaleString()} FCFA</span>
              </div>
            )}
          </div>

          {/* ✅ Pied de page */}
          <div className="border-t pt-2 text-center text-xs text-muted-foreground">
            <p>Merci de votre confiance !</p>
            <p className="mt-1">
              Reçu généré le {new Date().toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Ce document fait foi de commande
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fermer
            </Button>
            <Button className="flex-1 gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
// ============================================
// COMPOSANT HISTORIQUE DES COMMANDES
// ============================================


const OrderHistoryDialog = ({ open, onOpenChange, orders, onViewReceipt, tenantInfo }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Mes commandes
          </DialogTitle>
          <DialogDescription>
            {orders.length} commande(s) trouvée(s)
          </DialogDescription>
        </DialogHeader>

        {orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucune commande trouvée</p>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas encore passé de commande
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const total = order.transaction_lines?.reduce(
                (sum, line) => sum + (line.total_price || 0), 
                0
              ) || order.amount || 0;
              
              return (
                <div 
                  key={order.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => onViewReceipt(order)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{order.receipt_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} à {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                      <p className="text-sm">
                        {order.transaction_lines?.length || 0} article(s)
                      </p>
                      {order.discount_code && (
                        <Badge className="mt-1 bg-green-100 text-green-800 text-[10px]">
                          Code: {order.discount_code}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                        {order.status === "paid" ? "✅ Payé" : "⏳ En attente"}
                      </Badge>
                      <p className="font-bold text-primary mt-1">
                        {(order.total_after_discount || total).toLocaleString()} FCFA
                      </p>
                      {order.discount_amount > 0 && (
                        <p className="text-xs text-green-600">
                          -{order.discount_amount.toLocaleString()} FCFA
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// COMPOSANT PRODUITS ALTERNATIFS
// ============================================
const AlternativeProductsSection = ({ alternatives, searchTerm, onSelectTenant }) => {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-foreground dark:text-white">
          Produits similaires dans d'autres salons
        </h3>
        <Badge variant="secondary" className="ml-2 dark:bg-gray-700 dark:text-gray-200">
          {alternatives.reduce((acc, group) => acc + group.products.length, 0)} résultats
        </Badge>
        <span className="text-xs text-muted-foreground ml-2">
          pour "{searchTerm}"
        </span>
      </div>

      <div className="space-y-4">
        {alternatives.map((group) => (
          <div 
            key={group.tenant.id} 
            className="border rounded-xl p-4 bg-blue-50/30 dark:bg-blue-950/30 hover:shadow-md transition-all dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  backgroundColor: group.tenant.logo_url ? "transparent" : `${group.tenant.primary_color || '#2563eb'}20`,
                }}
              >
                {group.tenant.logo_url ? (
                  <img src={group.tenant.logo_url} alt={group.tenant.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-lg font-bold" style={{ color: group.tenant.primary_color || '#2563eb' }}>
                    {group.tenant.name?.charAt(0) || "S"}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground dark:text-white">{group.tenant.name}</span>
                  {group.tenant.city && (
                    <span className="text-xs text-muted-foreground dark:text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {group.tenant.city}
                    </span>
                  )}
                  {group.tenant.subscription_plan === "premium" && (
                    <Crown className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <button
                  className="text-xs text-primary dark:text-blue-400 hover:underline flex items-center gap-1"
                  onClick={() => onSelectTenant(group.tenant)}
                >
                  <Building2 className="h-3 w-3" /> Voir ce salon
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.products.slice(0, 3).map((product, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-blue-100 dark:border-gray-700"
                  onClick={() => onSelectTenant(group.tenant, product.name)}
                >
                  <div className="flex items-center gap-2">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                        <span className="text-2xl">{getCategoryIcon(product.category)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground dark:text-white">{product.name}</p>
                      <p className="text-xs text-primary dark:text-blue-400 font-bold">
                        {product.price?.toLocaleString() || 0} FCFA
                      </p>
                      {product.source_type === 'service' ? (
                        <Badge variant="outline" className="text-[10px] mt-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                          Service
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] mt-0.5 dark:border-gray-600 dark:text-gray-300">
                          {getCategoryLabel(product.category)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {group.products.length > 3 && (
                <div className="flex items-center justify-center bg-muted/20 dark:bg-gray-800 rounded-lg p-2 col-span-1">
                  <span className="text-xs text-muted-foreground dark:text-gray-400">
                    +{group.products.length - 3} autre(s)
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function GalleryPage() {
  const { slug } = useParams();
  const { currentUser, isAuthenticated } = useAuth();
  const { activeTenant, isShowcase, tenantId: activeTenantId } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  const [searchParams] = useSearchParams();
  const selectedTenantSlug = searchParams.get("salon");

  // États pour les salons
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantSearchTerm, setTenantSearchTerm] = useState("");

  // États pour l'utilisateur
  const [userTenantId, setUserTenantId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isTenantUser, setIsTenantUser] = useState(false);

  // États pour les produits
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasTenants, setHasTenants] = useState(false);

  // États pour les filtres des produits
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [sortBy, setSortBy] = useState("default");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [viewMode, setViewMode] = useState("grid");

  // ============================================
  // ✅ ÉTATS POUR LE PANIER AVEC CODE PROMO
  // ============================================
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState(null);
  const [showPromoInput, setShowPromoInput] = useState(false);

  // ✅ Calcul du sous-total
  const getSubTotal = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  // ✅ Calcul du total avec réduction
  const getTotal = useCallback(() => {
    const subTotal = getSubTotal();
    if (!appliedPromo || discountAmount === 0) return subTotal;
    
    if (discountType === 'percentage') {
      return subTotal - (subTotal * (discountAmount / 100));
    } else if (discountType === 'fixed') {
      return Math.max(0, subTotal - discountAmount);
    }
    return subTotal;
  }, [getSubTotal, appliedPromo, discountAmount, discountType]);

  // ✅ Calcul du montant de la réduction
  const getDiscountAmountValue = useCallback(() => {
    const subTotal = getSubTotal();
    if (!appliedPromo || discountAmount === 0) return 0;
    
    if (discountType === 'percentage') {
      return subTotal * (discountAmount / 100);
    } else if (discountType === 'fixed') {
      return Math.min(discountAmount, subTotal);
    }
    return 0;
  }, [getSubTotal, appliedPromo, discountAmount, discountType]);

  // ✅ Vérifier et appliquer le code promo AVEC INCRÉMENTATION
const handleApplyPromo = async () => {
  if (!promoCode.trim()) {
    setPromoError('Veuillez entrer un code promo');
    return;
  }

  const tenantId = isShowcaseMode ? activeTenant?.id : selectedTenant?.id;
  if (!tenantId) {
    toast.error('Salon non trouvé');
    return;
  }

  setIsCheckingPromo(true);
  setPromoError('');

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', promoCode.toUpperCase().trim())
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        setPromoError('Code promo invalide ou expiré');
      } else {
        throw error;
      }
      return;
    }

    if (!data) {
      setPromoError('Code promo invalide ou expiré');
      return;
    }

    // ✅ Vérifier la limite d'utilisation
    if (data.max_uses && data.used_count >= data.max_uses) {
      setPromoError('Ce code promo a atteint sa limite d\'utilisation');
      return;
    }

    const subTotal = getSubTotal();
    if (data.min_purchase && subTotal < data.min_purchase) {
      setPromoError(`Montant minimum requis: ${data.min_purchase.toLocaleString()} FCFA`);
      return;
    }

    // ✅ INCRÉMENTER LE COMPTEUR D'UTILISATIONS
    const { error: updateError } = await supabase
      .from('promotions')
      .update({ 
        used_count: (data.used_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('❌ Erreur lors de l\'incrémentation:', updateError);
      setPromoError('Erreur lors de l\'application du code');
      return;
    }

    // ✅ Appliquer le code promo
    setAppliedPromo(data);
    setDiscountAmount(data.value);
    setDiscountType(data.type);
    
    const discountText = data.type === 'percentage' 
      ? `${data.value}%` 
      : `${data.value.toLocaleString()} FCFA`;
    
    toast.success(`🎉 Code promo "${data.code}" appliqué ! Réduction de ${discountText}`);
    setPromoCode('');
    setPromoError('');
    setShowPromoInput(false);

  } catch (error) {
    console.error('Error applying promo:', error);
    setPromoError('Erreur lors de l\'application du code');
  } finally {
    setIsCheckingPromo(false);
  }
};
  // ✅ Supprimer le code promo appliqué
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setDiscountType(null);
    setPromoCode('');
    setPromoError('');
    toast.info('Code promo supprimé');
  };

  // ✅ Réinitialiser le code promo quand le panier change
  useEffect(() => {
    if (appliedPromo) {
      const subTotal = getSubTotal();
      if (appliedPromo.min_purchase && subTotal < appliedPromo.min_purchase) {
        handleRemovePromo();
        toast.warning('Le montant minimum n\'est plus atteint, code promo supprimé');
      }
    }
  }, [cart]);

  // États pour la modale d'agrandissement
  const [selectedProduct, setSelectedProduct] = useState(null);

  // États pour l'historique des commandes
  const [orderHistory, setOrderHistory] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // États pour la recherche alternative
  const [alternativeProducts, setAlternativeProducts] = useState([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [searchingAlternatives, setSearchingAlternatives] = useState(false);

  // ✅ Déterminer si on est en mode showcase ou général
  const isShowcaseMode = isShowcase && slug;
  const currentTenant = isShowcaseMode ? activeTenant : selectedTenant;
  const currentTenantId = isShowcaseMode ? activeTenant?.id : selectedTenant?.id;

  // ✅ Déterminer le rôle et le tenant de l'utilisateur
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const role = currentUser?.profile?.role || currentUser?.role;
      const tenantId = currentUser?.profile?.tenant_id;

      setUserRole(role);
      setUserTenantId(tenantId);

      if (role === "super_admin") {
        setIsTenantUser(false);
        setUserTenantId(null);
      } else {
        const hasTenant = tenantId && ["admin", "employee", "client"].includes(role);
        setIsTenantUser(hasTenant);
      }
    } else {
      setIsTenantUser(false);
      setUserTenantId(null);
      setUserRole(null);
    }
  }, [currentUser, isAuthenticated]);

  // ✅ Récupérer les salons ou utiliser le tenant actif
  useEffect(() => {
    if (isShowcaseMode && activeTenant) {
      setSelectedTenant(activeTenant);
      fetchProductsForTenant(activeTenant.id);
      setHasTenants(true);
      setTenants([activeTenant]);
    } else {
      fetchTenants();
    }
  }, [isShowcase, activeTenant, slug]);

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("tenants")
        .select(
          `
          id, 
          name, 
          slug, 
          description, 
          address, 
          phone, 
          email, 
          logo_url, 
          cover_image, 
          primary_color, 
          secondary_color, 
          subscription_plan, 
          subscription_status, 
          created_at,
          show_on_home,
          rating,
          city
        `
        )
        .eq("subscription_status", "active");

      if (isTenantUser && userTenantId) {
        query = query.eq("id", userTenantId);
      } else {
        query = query.eq("show_on_home", true);
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error("❌ Erreur lors de la récupération des salons:", error);
        throw error;
      }

      setTenants(data || []);
      setHasTenants(data && data.length > 0);

      if (data && data.length > 0) {
        if (selectedTenantSlug) {
          const tenant = data.find((t) => t.slug === selectedTenantSlug);
          if (tenant) {
            setSelectedTenant(tenant);
            await fetchProductsForTenant(tenant.id);
          } else {
            setSelectedTenant(data[0]);
            await fetchProductsForTenant(data[0].id);
          }
        } else {
          setSelectedTenant(data[0]);
          await fetchProductsForTenant(data[0].id);
        }
      } else {
        setProducts([]);
        setSelectedTenant(null);
      }
    } catch (err) {
      console.error("❌ Error fetching tenants:", err);
      setError("Impossible de charger les salons. Veuillez réessayer plus tard.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Récupérer les produits d'un tenant (UNIQUEMENT les produits de ce tenant)
  const fetchProductsForTenant = async (tenantId) => {
    if (!tenantId) return;

    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (productsError) {
        console.error("❌ Erreur lors de la récupération des produits:", productsError);
        await fetchServicesAsProducts(tenantId);
        return;
      }

      if (productsData && productsData.length > 0) {
        const formattedProducts = productsData.map((product) => ({
          id: product.id,
          name: product.name || "Produit sans nom",
          description: product.description || "",
          price: product.selling_price || product.price || 0,
          category: product.category || "Other",
          image_url: product.image_url,
          stock_quantity: product.stock_quantity || 0,
          is_active: product.is_active !== undefined ? product.is_active : true,
          product: product,
          source: "products",
        }));

        setProducts(formattedProducts);

        if (formattedProducts.length > 0) {
          const prices = formattedProducts.map((p) => p.price);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setMinPrice(min);
          setMaxPrice(max);
          setPriceRange([min, max]);
        }
        return;
      }

      await fetchServicesAsProducts(tenantId);
    } catch (err) {
      console.error("❌ Error fetching products:", err);
      await fetchServicesAsProducts(tenantId);
    }
  };

  // ✅ Récupérer les services comme produits (UNIQUEMENT les services du tenant)
  const fetchServicesAsProducts = async (tenantId) => {
    if (!tenantId) return;

    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (servicesError) {
        console.error("❌ Erreur lors de la récupération des services:", servicesError);
        setProducts([]);
        return;
      }

      if (servicesData && servicesData.length > 0) {
        const formattedProducts = servicesData.map((service) => ({
          id: service.id,
          name: service.name || "Service sans nom",
          description: service.description || "",
          price: service.price || 0,
          category: service.category || "Other",
          image_url: service.image_url || service.cover_image,
          stock_quantity: 10,
          is_active: service.is_active !== undefined ? service.is_active : true,
          product: service,
          source: "services",
          duration: service.duration || 30,
        }));

        setProducts(formattedProducts);

        if (formattedProducts.length > 0) {
          const prices = formattedProducts.map((p) => p.price);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setMinPrice(min);
          setMaxPrice(max);
          setPriceRange([min, max]);
        }
        return;
      }

      setProducts([]);
    } catch (err) {
      console.error("❌ Error fetching services:", err);
      setProducts([]);
    }
  };

  // ✅ Changer de salon (uniquement en mode général)
  const handleTenantSelect = async (tenant, searchTermToApply) => {
    if (isShowcaseMode) return;

    setSelectedTenant(tenant);
    setActiveCategory("all");
    setSelectedCategories([]);
    setAlternativeProducts([]);
    setShowAlternatives(false);
    
    if (searchTermToApply) {
      setSearchTerm(searchTermToApply);
    } else {
      setSearchTerm("");
    }
    
    await fetchProductsForTenant(tenant.id);

    const url = new URL(window.location);
    url.searchParams.set("salon", tenant.slug);
    window.history.pushState({}, "", url);
  };

  // ✅ Filtrer les produits
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory !== "all") {
      result = result.filter((p) => p.category === activeCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((p) => {
        const categoryLabel = getCategoryLabel(p.category).toLowerCase();
        return (
          p.name?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          categoryLabel.includes(term)
        );
      });
    }

    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }

    return result;
  }, [
    products,
    activeCategory,
    searchTerm,
    priceRange,
    selectedCategories,
    sortBy,
  ]);

  // ✅ RECHERCHE DE PRODUITS ALTERNATIFS DANS D'AUTRES SALONS
  const searchAlternativeProducts = useCallback(async (searchTermValue, currentTenantId) => {
    if (isShowcaseMode) {
      setAlternativeProducts([]);
      setShowAlternatives(false);
      return;
    }

    if (!searchTermValue || !searchTermValue.trim()) {
      setAlternativeProducts([]);
      setShowAlternatives(false);
      return;
    }

    if (!currentTenantId) {
      setAlternativeProducts([]);
      setShowAlternatives(false);
      return;
    }

    setSearchingAlternatives(true);

    try {
      const searchTermLower = searchTermValue.trim().toLowerCase();
      
      const { data: otherTenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, name, slug, city, logo_url, primary_color, subscription_plan, subscription_status")
        .eq("subscription_status", "active")
        .neq("id", currentTenantId)
        .limit(20);

      if (tenantsError) throw tenantsError;

      if (!otherTenants || otherTenants.length === 0) {
        setAlternativeProducts([]);
        setShowAlternatives(false);
        return;
      }

      const tenantIds = otherTenants.map(t => t.id);
      
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          tenant:tenant_id (
            id,
            name,
            slug,
            city,
            logo_url,
            primary_color
          )
        `)
        .in("tenant_id", tenantIds)
        .ilike("name", `%${searchTermLower}%`)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .limit(10);

      if (productsError) {
        console.error("❌ Erreur recherche produits:", productsError);
      }

      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          tenant:tenant_id (
            id,
            name,
            slug,
            city,
            logo_url,
            primary_color
          )
        `)
        .in("tenant_id", tenantIds)
        .ilike("name", `%${searchTermLower}%`)
        .eq("is_active", true)
        .limit(10);

      if (servicesError) {
        console.error("❌ Erreur recherche services:", servicesError);
      }

      let allResults = [];
      
      if (productsData && productsData.length > 0) {
        allResults = allResults.concat(productsData);
      }
      
      if (servicesData && servicesData.length > 0) {
        allResults = allResults.concat(servicesData);
      }

      if (allResults.length === 0) {
        setAlternativeProducts([]);
        setShowAlternatives(false);
        return;
      }
      
      const groupedByTenant = {};
      allResults.forEach(item => {
        const tenantId = item.tenant_id;
        if (!groupedByTenant[tenantId]) {
          const tenantInfo = otherTenants.find(t => t.id === tenantId);
          groupedByTenant[tenantId] = {
            tenant: tenantInfo || item.tenant || { id: tenantId, name: "Salon inconnu" },
            products: []
          };
        }
        const isService = item.duration !== undefined || item.cover_image !== undefined;
        groupedByTenant[tenantId].products.push({
          ...item,
          source_type: isService ? 'service' : 'product',
          price: item.selling_price || item.price || 0,
          category: item.category || "Other"
        });
      });

      const result = Object.values(groupedByTenant);
      setAlternativeProducts(result);
      setShowAlternatives(result.length > 0);
      
    } catch (error) {
      console.error("❌ Erreur recherche alternative:", error);
      setAlternativeProducts([]);
      setShowAlternatives(false);
    } finally {
      setSearchingAlternatives(false);
    }
  }, [isShowcaseMode]);

  // ✅ useEffect pour la recherche alternative
  useEffect(() => {
    if (isShowcaseMode) {
      setAlternativeProducts([]);
      setShowAlternatives(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() && selectedTenant) {
        searchAlternativeProducts(searchTerm, selectedTenant.id);
      } else {
        setAlternativeProducts([]);
        setShowAlternatives(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedTenant, isShowcaseMode, searchAlternativeProducts]);

  // ✅ Fonctions pour le panier
  const getCartTotal = useCallback(() => {
    return getTotal();
  }, [getTotal]);

  const getCartCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleAddToCart = (product) => {
    if (product.stock_quantity !== undefined && product.stock_quantity <= 0) {
      toast.error(`${product.name} est en rupture de stock`);
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      if (product.stock_quantity !== undefined && existingItem.quantity >= product.stock_quantity) {
        toast.error(`Stock insuffisant pour ${product.name}`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price || 0,
          image_url: product.image_url,
          quantity: 1,
          product_id: product.id,
          stock_quantity: product.stock_quantity,
          category: product.category,
          source: product.source || "unknown",
          duration: product.duration || 0,
        },
      ]);
    }
    toast.success(`${product.name} ajouté au panier`);
    setCartOpen(true);
  };

  const updateCartQuantity = (id, delta) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          if (item.stock_quantity && newQuantity > item.stock_quantity) {
            toast.error(`Stock insuffisant`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.info("Produit retiré du panier");
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    handleRemovePromo();
  };

  //// Dans GalleryPage.jsx, remplacer la fonction fetchClientOrders

const fetchClientOrders = async (phone, tenantId) => {
  try {
    const { data: orders, error } = await supabase
      .from("transactions")
      .select(`
        *,
        transaction_lines (
          *,
          products (
            id,
            name,
            selling_price,
            image_url,
            description,
            category
          )
        )
      `)
      .eq("customer_phone", phone)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return orders || [];
  } catch (error) {
    console.error("❌ Erreur:", error);
    return [];
  }
};
  // ✅ Fonction pour récupérer une commande spécifique
// Dans GalleryPage.jsx, remplacer la fonction fetchOrderByReceipt

const fetchOrderByReceipt = async (receiptNumber, tenantId) => {
  try {
    const { data: order, error } = await supabase
      .from("transactions")
      .select(`
        *,
        transaction_lines (
          *,
          products (
            id,
            name,
            selling_price,
            image_url,
            description,
            category
          )
        )
      `)
      .eq("receipt_number", receiptNumber)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) throw error;
    return order;
  } catch (error) {
    console.error("❌ Erreur:", error);
    return null;
  }
};
  // ✅ Fonction pour afficher l'historique des commandes
  const handleViewOrderHistory = async () => {
    if (!customerPhone.trim()) {
      toast.error("Veuillez entrer votre numéro de téléphone");
      return;
    }

    if (!selectedTenant) {
      toast.error("Veuillez sélectionner un salon");
      return;
    }

    setLoadingOrders(true);
    try {
      const orders = await fetchClientOrders(customerPhone.trim(), selectedTenant.id);
      setOrderHistory(orders);
      setShowOrderHistory(true);
      
      if (!orders || orders.length === 0) {
        toast.info("Aucune commande trouvée pour ce numéro");
      }
    } catch (error) {
      console.error("❌ Erreur:", error);
      toast.error("Erreur lors de la récupération des commandes");
    } finally {
      setLoadingOrders(false);
    }
  };

  // ✅ Fonction pour afficher un reçu
  const handleViewReceipt = async (order) => {
    if (order && order.receipt_number) {
      const fullOrder = await fetchOrderByReceipt(order.receipt_number, selectedTenant?.id);
      if (fullOrder) {
        setSelectedReceipt(fullOrder);
      } else {
        setSelectedReceipt(order);
      }
    }
  };

  // ✅ Valider la commande avec code promo
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Votre panier est vide");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }

    if (!customerPhone.trim()) {
      toast.error("Veuillez entrer votre numéro de téléphone");
      return;
    }

    const subTotal = getSubTotal();
    const discountAmountValue = getDiscountAmountValue();
    const total = getTotal();

    setSubmitting(true);

    try {
      const tenantId = isShowcaseMode ? activeTenant?.id : selectedTenant?.id;
      
      const { data: lastTx } = await supabase
        .from("transactions")
        .select("receipt_number")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1);

      let lastNumber = 0;
      if (lastTx && lastTx.length > 0 && lastTx[0].receipt_number) {
        const match = lastTx[0].receipt_number.match(/RCP-(\d+)/);
        if (match) {
          lastNumber = parseInt(match[1], 10);
        }
      }
      const receiptNumber = `RCP-${String(lastNumber + 1).padStart(4, "0")}`;

      const transactionData = {
        tenant_id: tenantId,
        client_id: null,
        amount: subTotal,
        total_after_discount: total,
        discount_amount: discountAmountValue,
        discount_code: appliedPromo?.code || null,
        payment_method: "pending",
        receipt_number: receiptNumber,
        status: "pending",
        transaction_date: new Date().toISOString(),
        transaction_type: "product_sale",
        source: "gallery_order",
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        promos_applied: appliedPromo ? [{
          code: appliedPromo.code,
          type: appliedPromo.type,
          value: appliedPromo.value,
          amount: discountAmountValue
        }] : null
      };

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

      if (txError) throw txError;

     if (appliedPromo) {
  await supabase
    .from("promotions")
    .update({ 
      used_count: (appliedPromo.used_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', appliedPromo.id);
}

      for (const item of cart) {
        await supabase
          .from("transaction_lines")
          .insert({
            transaction_id: txData.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
          });
      }

      let successMessage = `✅ Commande validée ! Total: ${total.toLocaleString()} FCFA`;
      if (appliedPromo) {
        const discountText = discountType === 'percentage' ? `${discountAmount}%` : `${discountAmountValue.toLocaleString()} FCFA`;
        successMessage += ` (Réduction de ${discountText} appliquée)`;
      }

      toast.success(successMessage);

      const fullOrder = await fetchOrderByReceipt(receiptNumber, tenantId);
      
      if (fullOrder) {
        setSelectedReceipt({
          ...fullOrder,
          cart_items: cart,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          applied_promo: appliedPromo,
          discount_amount: discountAmountValue,
        });
      }

      clearCart();
      setCartOpen(false);
      setSelectedProduct(null);

    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Erreur lors de la commande");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm("");
    setActiveCategory("all");
    setSelectedCategories([]);
    setSortBy("default");
    setPriceRange([minPrice, maxPrice]);
    setShowFilters(false);
    setAlternativeProducts([]);
    setShowAlternatives(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (activeCategory !== "all") count++;
    if (selectedCategories.length > 0) count++;
    if (sortBy !== "default") count++;
    if (priceRange[0] > minPrice || priceRange[1] < maxPrice) count++;
    return count;
  };

  const isInCart = (productId) => {
    return cart.some((item) => item.id === productId);
  };
// ✅ Fonction pour incrémenter le compteur d'utilisations d'un code promo
const incrementPromoUsage = async (promoId, currentCount) => {
  try {
    const { error } = await supabase
      .from('promotions')
      .update({ 
        used_count: (currentCount || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', promoId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Erreur incrémentation promo:', error);
    return false;
  }
};
  // ✅ Construction des métadonnées SEO
  const getSeoData = () => {
    if (isShowcaseMode && currentTenant) {
      return {
        title: `Galerie - ${currentTenant.name}`,
        description: currentTenant?.description || `Découvrez la galerie de produits de ${currentTenant.name}.`,
        keywords: `galerie, produits, ${currentTenant.name}`,
        ogTitle: `Galerie - ${currentTenant.name}`,
        ogDescription: `Découvrez la galerie de produits de ${currentTenant.name}`,
        ogImage: products.length > 0 ? products[0].image_url : (currentTenant?.cover_image || currentTenant?.logo_url || "/og-image.jpg"),
        canonicalUrl: `/showcase/${currentTenant?.slug}/gallery`,
      };
    }
    return {
      title: "Galerie - BeautyFlow",
      description: "Découvrez notre galerie de produits et transformations.",
      keywords: "galerie, produits, beautyflow",
      ogTitle: "Galerie BeautyFlow",
      ogDescription: "Découvrez notre galerie de produits",
      ogImage: "/og-image.jpg",
      canonicalUrl: "/gallery",
    };
  };

  const seo = getSeoData();

  // ✅ Statistiques des catégories
  const getCategoryStats = () => {
    const stats = {};
    products.forEach((p) => {
      const cat = p.category || "Other";
      if (!stats[cat]) {
        stats[cat] = {
          count: 0,
          label: getCategoryLabel(cat),
          icon: getCategoryIcon(cat),
        };
      }
      stats[cat].count++;
    });
    return stats;
  };

  const categoryStats = getCategoryStats();
  const sortedCategories = Object.keys(categoryStats).sort((a, b) => {
    const labelA = getCategoryLabel(a);
    const labelB = getCategoryLabel(b);
    return labelA.localeCompare(labelB);
  });

  const filteredTenants = isShowcaseMode 
    ? tenants 
    : tenants.filter((tenant) =>
        tenant.name.toLowerCase().includes(tenantSearchTerm.toLowerCase())
      );

  // ✅ Rendu du mode showcase
  if (isShowcaseMode && currentTenant) {
    return renderShowcaseMode();
  }

  // ✅ Rendu du mode général
  return renderGeneralMode();

  // ============================================
  // MODE SHOWCASE
  // ============================================
  function renderShowcaseMode() {
    const displayName = currentTenant?.name || platformConfig.platformName;

    return (
      <>
        <Helmet>
          <title>{seo.title}</title>
          <meta name="description" content={seo.description} />
          <meta property="og:title" content={seo.ogTitle} />
          <meta property="og:description" content={seo.ogDescription} />
          <meta property="og:image" content={seo.ogImage} />
          <link rel="canonical" href={`https://beautyflow.com${seo.canonicalUrl}`} />
        </Helmet>

        <PublicHeader />

        <main className="min-h-screen bg-background">
          <section className="relative overflow-hidden py-16 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
            <div className="relative z-10 mx-auto max-w-7xl px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                  Galerie - {displayName}
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {currentTenant?.description || "Découvrez la galerie de produits et transformations"}
                </p>
                {currentTenant?.address && (
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {currentTenant.address}
                    </span>
                    {currentTenant?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {currentTenant.phone}
                      </span>
                    )}
                    {currentTenant?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {currentTenant.email}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </section>

          <section className="py-8">
            <div className="mx-auto max-w-7xl px-6">
              {renderProductsSection()}
            </div>
          </section>

          <section className="py-20 bg-muted/30">
            <div className="mx-auto max-w-4xl px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold sm:text-3xl mb-4">
                  Vous ne trouvez pas ce que vous cherchez ?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Contactez-nous pour un service personnalisé adapté à vos besoins.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button asChild size="lg">
                    <Link to={`/showcase/${currentTenant?.slug}/contact`}>Nous contacter</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to={`/showcase/${currentTenant?.slug}`}>
                      Retour au salon <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
        {renderFloatingCart()}
        {renderModals()}
      </>
    );
  }

  // ============================================
  // MODE GÉNÉRAL
  // ============================================
  function renderGeneralMode() {
    return (
      <>
        <Helmet>
          <title>{seo.title}</title>
          <meta name="description" content={seo.description} />
          <meta property="og:title" content={seo.ogTitle} />
          <meta property="og:description" content={seo.ogDescription} />
          <meta property="og:image" content={seo.ogImage} />
          <link rel="canonical" href={`https://beautyflow.com${seo.canonicalUrl}`} />
        </Helmet>

        <PublicHeader />

        <main className="min-h-screen bg-background">
          <section className="relative overflow-hidden py-16 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
            <div className="relative z-10 mx-auto max-w-7xl px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                  Notre Galerie
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Explorez notre galerie de produits et transformations
                </p>
                {isTenantUser && userTenantId && (
                  <Badge className="mt-3 gap-1 bg-primary/10 text-primary border-primary/20">
                    <Shield className="h-3 w-3" /> Vous voyez uniquement votre salon
                  </Badge>
                )}
                {!isAuthenticated && (
                  <Badge className="mt-3 gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <Eye className="h-3 w-3" /> Mode invité - Tous les salons disponibles
                  </Badge>
                )}
                {userRole === "super_admin" && (
                  <Badge className="mt-3 gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Crown className="h-3 w-3" /> Super Admin - Tous les salons disponibles
                  </Badge>
                )}
              </motion.div>
            </div>
          </section>

          <section className="py-8">
            <div className="mx-auto max-w-7xl px-6">
              {error ? (
                <div className="text-center py-16 bg-muted/20 rounded-3xl border max-w-xl mx-auto">
                  <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground mb-4">{error}</p>
                  <Button onClick={fetchTenants} variant="outline" className="gap-2">
                    <RefreshCcw className="h-4 w-4" /> Réessayer
                  </Button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-2xl" />
                  ))}
                </div>
              ) : (
                <>
                  {tenants.length > 0 && !isShowcaseMode && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          {isTenantUser ? "Mon salon" : "Nos salons partenaires"}
                          <Badge variant="secondary" className="ml-2">{tenants.length}</Badge>
                        </h2>
                        {!isTenantUser && (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher un salon..."
                              value={tenantSearchTerm}
                              onChange={(e) => setTenantSearchTerm(e.target.value)}
                              className="pl-10 w-48 md:w-64 h-9 text-sm"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {(isTenantUser ? tenants : filteredTenants).map((tenant) => (
                          <SalonCard
                            key={tenant.id}
                            tenant={tenant}
                            isSelected={selectedTenant?.id === tenant.id}
                            onSelect={handleTenantSelect}
                            isUserTenant={isTenantUser && userTenantId === tenant.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTenant && renderProductsSection()}
                </>
              )}
            </div>
          </section>

          <section className="py-20 bg-muted/30">
            <div className="mx-auto max-w-4xl px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold sm:text-3xl mb-4">
                  Vous ne trouvez pas ce que vous cherchez ?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Contactez-nous pour un service personnalisé adapté à vos besoins.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button asChild size="lg">
                    <Link to="/contact">Nous contacter</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/">
                      Retour à l'accueil <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
        {renderFloatingCart()}
        {renderModals()}
      </>
    );
  }

  // ============================================
  // SECTION PRODUITS (commune aux deux modes) AVEC CODE PROMO
  // ============================================
  function renderProductsSection() {
    const hasProducts = products.length > 0;

    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              {isShowcaseMode ? "Nos produits" : "Produits disponibles"}
              <Badge variant="secondary" className="ml-2">{products.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {selectedTenant?.name}
              {selectedTenant?.address && !isShowcaseMode && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedTenant.address}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48 md:w-64 h-9 text-sm"
              />
            </div>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-9"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-9"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {!isShowcaseMode && (
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtres
                    {getActiveFilterCount() > 0 && (
                      <Badge className="ml-1 bg-primary text-white text-xs">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Filtres avancés</h4>
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs">
                        Réinitialiser
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Trier par</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Par défaut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Par défaut</SelectItem>
                          <SelectItem value="price_asc">Prix croissant</SelectItem>
                          <SelectItem value="price_desc">Prix décroissant</SelectItem>
                          <SelectItem value="name_asc">Nom A-Z</SelectItem>
                          <SelectItem value="name_desc">Nom Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Prix : {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} FCFA
                      </Label>
                      <Slider
                        min={minPrice}
                        max={maxPrice}
                        step={500}
                        value={priceRange}
                        onValueChange={setPriceRange}
                        className="py-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Catégories</Label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {sortedCategories.map((cat) => {
                          const label = getCategoryLabel(cat);
                          const icon = getCategoryIcon(cat);
                          return (
                            <div key={cat} className="flex items-center space-x-2">
                              <Checkbox
                                id={`filter-${cat}`}
                                checked={selectedCategories.includes(cat)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCategories([...selectedCategories, cat]);
                                    setActiveCategory("all");
                                  } else {
                                    setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                                  }
                                }}
                              />
                              <Label htmlFor={`filter-${cat}`} className="text-sm cursor-pointer flex-1">
                                {icon} {label} ({categoryStats[cat]?.count || 0})
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button className="w-full" onClick={() => setShowFilters(false)}>
                      Appliquer les filtres
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Catégories rapides */}
        {sortedCategories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
              className="rounded-full"
            >
              Tous ({products.length})
            </Button>
            {sortedCategories.map((cat) => {
              const count = categoryStats[cat]?.count || 0;
              const icon = getCategoryIcon(cat);
              const label = getCategoryLabel(cat);
              return (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className="rounded-full"
                >
                  {icon} {label} ({count})
                </Button>
              );
            })}
          </div>
        )}

        {/* ✅ Liste des produits */}
        {!hasProducts ? (
          <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">
              {isShowcaseMode 
                ? `Aucun produit disponible pour ce salon.`
                : `Aucun produit disponible pour "${selectedTenant?.name}".`}
            </p>
            {isShowcaseMode && (
              <p className="text-sm text-muted-foreground mt-2">
                Les produits seront bientôt disponibles.
              </p>
            )}
            {!isShowcaseMode && isTenantUser && (
              <p className="text-sm text-muted-foreground mt-2">
                Ajoutez des produits depuis votre espace administrateur.
              </p>
            )}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 rounded-3xl border border-dashed">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">
              Aucun produit ne correspond à votre recherche dans "{selectedTenant?.name}"
            </p>
            <div className="mt-4 space-x-2">
              <Button variant="link" onClick={() => resetFilters()}>Effacer les filtres</Button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <ProductCard
                  product={product}
                  isInCart={isInCart(product.id)}
                  onClick={() => setSelectedProduct(product)}
                  onAddToCart={() => handleAddToCart(product)}
                  tenantName={isShowcaseMode ? null : selectedTenant?.name}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/10 to-secondary/10">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">{getCategoryIcon(product.category)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{product.name}</h3>
                    {product.category && (
                      <Badge variant="outline" className="text-xs">
                        {getCategoryIcon(product.category)} {getCategoryLabel(product.category)}
                      </Badge>
                    )}
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                    )}
                    {product.source === "services" && product.duration > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {product.duration} min
                      </p>
                    )}
                    {product.source === "services" && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Service
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-primary">{product.price.toLocaleString()} FCFA</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <ShoppingBag className="h-3 w-3" /> Stock: {product.stock_quantity || 0}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isInCart(product.id) ? "default" : "secondary"}
                    className={isInCart(product.id) ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-white"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                    {isInCart(product.id) ? "Dans le panier" : "Ajouter"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🔥 SECTION RECHERCHE ALTERNATIVE */}
        {!isShowcaseMode && searchTerm.trim() && selectedTenant && (
          <>
            {searchingAlternatives && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Recherche dans d'autres salons...</span>
              </div>
            )}

            {!searchingAlternatives && showAlternatives && alternativeProducts.length > 0 && (
              <AlternativeProductsSection 
                alternatives={alternativeProducts}
                searchTerm={searchTerm}
                onSelectTenant={handleTenantSelect}
              />
            )}

            {!searchingAlternatives && filteredProducts.length === 0 && !showAlternatives && (
              <div className="text-center py-12 bg-muted/10 dark:bg-gray-800/30 rounded-3xl border border-dashed dark:border-gray-700 mt-6">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/30 dark:text-gray-600 mb-4" />
                <p className="text-lg text-muted-foreground dark:text-gray-300">
                  Aucun produit ne correspond à votre recherche
                </p>
                <p className="text-sm text-muted-foreground dark:text-gray-400 mt-2">
                  Essayez avec d'autres mots-clés
                </p>
                <Button variant="link" className="dark:text-blue-400" onClick={() => resetFilters()}>
                  Effacer les filtres
                </Button>
              </div>
            )}

            {!searchingAlternatives && filteredProducts.length > 0 && !showAlternatives && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  ✅ {filteredProducts.length} produit(s) trouvé(s) dans "{selectedTenant?.name}"
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ============================================
  // COMPOSANTS COMMUNS - PANIER AVEC CODE PROMO
  // ============================================
  function renderFloatingCart() {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg gap-2 bg-primary hover:bg-primary/90 text-white"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="h-5 w-5" />
          {getCartCount() > 0 && (
            <Badge className="bg-white text-primary -ml-1 px-2 py-0.5">{getCartCount()}</Badge>
          )}
        </Button>
      </div>
    );
  }

  function renderModals() {
    const tenantId = isShowcaseMode ? activeTenant?.id : selectedTenant?.id;

    return (
      <>
        {/* Modal produit */}
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {selectedProduct && (
              <div className="relative">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-auto max-h-[85vh] object-contain" />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <span className="text-8xl">{getCategoryIcon(selectedProduct.category)}</span>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/80 text-white border-0">
                        {getCategoryIcon(selectedProduct.category)} {getCategoryLabel(selectedProduct.category)}
                      </Badge>
                      <Badge className="bg-emerald-500/80 text-white border-0">
                        {selectedProduct.price.toLocaleString()} FCFA
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                    {selectedProduct.description && (
                      <p className="text-white/80 text-sm max-w-lg">{selectedProduct.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <Badge className="bg-black/50 text-white border-white/20">
                        <ShoppingBag className="h-3 w-3 mr-1" /> Stock: {selectedProduct.stock_quantity || 0}
                      </Badge>
                      <Button
                        className="bg-primary hover:bg-primary/80 text-white"
                        onClick={() => {
                          handleAddToCart(selectedProduct);
                          setSelectedProduct(null);
                        }}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        {isInCart(selectedProduct.id) ? "Déjà dans le panier" : "Ajouter au panier"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ✅ Panier AVEC CODE PROMO */}
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetContent className="w-full sm:max-w-lg flex flex-col">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Votre commande
                <Badge variant="secondary" className="ml-2">
                  {cart.length} articles
                </Badge>
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto py-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
                  <p className="text-muted-foreground">Votre panier est vide</p>
                  <p className="text-sm text-muted-foreground">
                    Parcourez notre galerie et ajoutez des produits
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted/10 rounded-xl p-3 border border-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Détail de votre commande</span>
                      <Badge variant="outline" className="text-xs">
                        {cart.length} article(s)
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-muted/10 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.quantity}×</span>
                            <span className="truncate max-w-[120px]">{item.name}</span>
                            {item.duration > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {item.duration} min
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-primary">
                            {(item.price * item.quantity).toLocaleString()} FCFA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ✅ SECTION CODE PROMO */}
                  <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-800/30">
                    {appliedPromo ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-green-700 dark:text-green-400">
                              Code "{appliedPromo.code}" appliqué
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {discountType === 'percentage' 
                                ? `${discountAmount}% de réduction` 
                                : `${discountAmount.toLocaleString()} FCFA de réduction`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemovePromo}
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-sm font-medium">Code promo</span>
                          <span className="text-xs text-muted-foreground">(si vous en avez un)</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => setShowPromoInput(!showPromoInput)}
                          >
                            {showPromoInput ? 'Masquer' : 'Ajouter'}
                          </Button>
                        </div>
                        {showPromoInput && (
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Ex: ETE2026"
                                value={promoCode}
                                onChange={(e) => {
                                  setPromoCode(e.target.value.toUpperCase());
                                  setPromoError('');
                                }}
                                className="pl-9 h-10 bg-background uppercase"
                                disabled={isCheckingPromo}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleApplyPromo}
                              disabled={!promoCode.trim() || isCheckingPromo}
                              className="h-10 px-4 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                            >
                              {isCheckingPromo ? (
                                <span className="flex items-center gap-1">
                                  <span className="h-4 w-4 animate-spin border-2 border-amber-500 border-t-transparent rounded-full" />
                                </span>
                              ) : (
                                'Appliquer'
                              )}
                            </Button>
                          </div>
                        )}
                        {promoError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {promoError}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          💡 Entrez votre code promo pour bénéficier d'une réduction
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ✅ Liste des produits avec actions */}
                  <AnimatePresence>
                    {cart.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border"
                      >
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-sm text-primary font-bold">
                            {item.price.toLocaleString()} FCFA
                          </p>
                          {item.stock_quantity !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Stock: {item.stock_quantity}
                            </p>
                          )}
                          {item.duration > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {item.duration} min
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 rounded-md"
                            onClick={() => updateCartQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3 text-primary" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 rounded-md"
                            onClick={() => updateCartQuantity(item.id, 1)}
                            disabled={item.stock_quantity !== undefined && item.quantity >= item.stock_quantity}
                          >
                            <Plus className="h-3 w-3 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={clearCart}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Vider le panier
                    </Button>
                  )}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-4 bg-gradient-to-b from-background to-muted/5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">Vos coordonnées</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Votre nom complet *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="pl-9 h-11 bg-background"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="Votre numéro de téléphone *"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="pl-9 h-11 bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* ✅ Total avec réduction */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sous-total</span>
                      <span className="font-medium">{getSubTotal().toLocaleString()} FCFA</span>
                    </div>
                    
                    {appliedPromo && discountAmount > 0 && (
                      <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                        <span className="text-sm flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Réduction ({discountType === 'percentage' ? `${discountAmount}%` : `${discountAmount.toLocaleString()} FCFA`})
                        </span>
                        <span className="font-medium">-{getDiscountAmountValue().toLocaleString()} FCFA</span>
                      </div>
                    )}

                    <div className="border-t border-primary/10 pt-2 flex items-center justify-between">
                      <span className="text-base font-bold">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        {getTotal().toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Receipt className="h-3 w-3" />
                    <span>{cart.length} article(s) dans le panier</span>
                    {appliedPromo && (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircleIcon className="h-3 w-3" />
                        Code promo appliqué
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <span className="text-blue-700">ℹ️ Le paiement sera effectué à la caisse du salon</span>
                  </div>
                </div>

                <SheetFooter className="flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setCartOpen(false)}
                    className="w-full h-11"
                    disabled={submitting}
                  >
                    Continuer les achats
                  </Button>
                  <Button
                    className="w-full gap-2 h-11 bg-primary hover:bg-primary/90 text-white text-base"
                    onClick={handleSubmitOrder}
                    disabled={
                      cart.length === 0 || 
                      submitting || 
                      !customerName.trim() ||
                      !customerPhone.trim()
                    }
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    {submitting ? 'Commande en cours...' : 'Valider ma commande'}
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Historique des commandes */}
        <OrderHistoryDialog
          open={showOrderHistory}
          onOpenChange={setShowOrderHistory}
          orders={orderHistory}
          onViewReceipt={handleViewReceipt}
        />

       {/* Reçu de commande */}
<OrderReceipt 
  order={selectedReceipt} 
  onClose={() => setSelectedReceipt(null)}
  tenantInfo={currentTenant || selectedTenant} // ✅ Passer les infos du salon
/>
      </>
    );
  }
}