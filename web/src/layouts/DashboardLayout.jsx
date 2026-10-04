// /src/layouts/DashboardLayout.jsx - Version corrigée
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet.jsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.jsx";
import {
  LayoutDashboard,
  Settings,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  Scissors,
  MessageSquare,
  Award,
  Tag,
  Gift,
  Package,
  Receipt,
  Clock,
  Ticket,
  Bell,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  XCircle,
  User,
  Building2,
  Shield,
  ShieldCheck,
  Activity,
  Headphones,
  Wrench,
  Globe,
  DollarSign,
  Star,
  Sparkles,
  ArrowRight,
  Crown,
  Eye,
  Mail,
  Phone,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Coffee,
  Crown as CrownIcon,
  UserPlus,
  UserMinus,
  FileText,
  Link as LinkIcon,
  Smartphone,
  CalendarPlus,
  History,
  Home,
  CalendarDays,
  FileText as FileTextIcon,
  AlertTriangle,
  BellRing,
  CircleAlert,
  LogIn,
  ShoppingBag,
  Store,
} from "lucide-react";
// ✅ CORRECTION : Utiliser le bon chemin d'import
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell.jsx";
import TicketQueue from "@/components/client/TicketQueue.jsx";

// ============================================
// VISITOR FEATURES - POUR LES NON-AUTHENTIFIÉS
// ============================================
function VisitorFeaturesSidebar({ location, tenantId }) {
  const visitorFeatures = [
    { id: "visitor-home", title: "Accueil", icon: Home, path: "/", alert: false },
    { id: "visitor-services", title: "Nos Services", icon: Scissors, path: "/services", alert: false },
    { id: "visitor-tenants", title: "Nos Salons", icon: Store, path: "/tenants", alert: false },
    { id: "visitor-booking", title: "Réserver", icon: CalendarPlus, path: "/booking", alert: false },
    { id: "visitor-gift-cards", title: "Cartes Cadeaux", icon: Gift, path: "/gift-cards", alert: false },
    { id: "visitor-contact", title: "Contact", icon: Mail, path: "/contact", alert: false },
    { id: "visitor-login", title: "Se connecter", icon: LogIn, path: "/login", alert: false },
  ];

  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    if (tenantId) {
      fetchTenantInfo();
    }
  }, [tenantId]);

  const fetchTenantInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("id", tenantId)
        .single();
      if (!error) setTenant(data);
    } catch (error) {
      console.error("Error fetching tenant:", error);
    }
  };

  return (
    <div className="space-y-1">
      {visitorFeatures.map((feature) => {
        const isActive = location.pathname === feature.path || location.pathname.startsWith(feature.path + "/");
        const Icon = feature.icon;

        return (
          <Link
            key={feature.id}
            to={feature.path}
            className={`flex items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="flex-1 truncate">{feature.title}</span>
            {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
          </Link>
        );
      })}

      {/* File d'attente pour les visiteurs */}
      {tenantId && (
        <div className="mt-4 pt-4 border-t">
          <div className="px-2 py-1.5 mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              File d'attente
            </span>
          </div>
          <TicketQueue tenantId={tenantId} />
        </div>
      )}
    </div>
  );
}

// ============================================
// SUPER ADMIN FEATURES AVEC BADGES
// ============================================
function SuperAdminFeaturesSidebar({ searchTerm, onSearchChange, location }) {
  const superAdminFeatures = [
    { id: "sa-home", title: "Accueil", description: "Retourner à la page d'accueil", icon: Home, path: "/", category: "Navigation", alert: false },
    { id: "sa-dashboard", title: "Vue d'ensemble", description: "KPIs et métriques globales", icon: LayoutDashboard, path: "/super-admin/dashboard", category: "Dashboard", alert: false },
    { id: "sa-analytics", title: "Analytique Système", description: "Statistiques et tendances", icon: TrendingUp, path: "/super-admin/analytics", category: "Dashboard", alert: false },
    { id: "sa-tenants", title: "Tous les Salons", description: "Liste et gestion des salons", icon: Building2, path: "/super-admin/tenants", category: "Salons", alert: false },
    { id: "sa-admins", title: "Administrateurs", description: "Gestion des admins de salons", icon: ShieldCheck, path: "/super-admin/admins", category: "Admins", alert: false },
    { id: "sa-subscriptions", title: "Abonnements", description: "Tous les abonnements", icon: CreditCard, path: "/super-admin/subscriptions", category: "Abonnements", alert: false },
    { id: "sa-subscriptions-plans", title: "Plans d'abonnement", description: "Gérer les plans disponibles", icon: CrownIcon, path: "/super-admin/subscriptions/plans", category: "Abonnements", alert: false },
    { id: "sa-subscriptions-payments", title: "Paiements", description: "Historique des paiements", icon: DollarSign, path: "/super-admin/subscriptions/payments", category: "Abonnements", alert: false },
    { id: "sa-subscriptions-validation", title: "Validation", description: "Valider les demandes en attente", icon: Shield, path: "/super-admin/subscriptions/validation", category: "Abonnements", alert: true, badge: null },
    { id: "sa-users", title: "Tous les Utilisateurs", description: "Base de données utilisateurs", icon: Users, path: "/super-admin/users", category: "Utilisateurs", alert: false },
    { id: "sa-services", title: "Services Globaux", description: "Catalogue de services", icon: Scissors, path: "/super-admin/services", category: "Catalogue", alert: false },
    { id: "sa-products", title: "Produits Globaux", description: "Catalogue de produits", icon: Package, path: "/super-admin/products", category: "Catalogue", alert: false },
    { id: "sa-promotions", title: "Promotions Globales", description: "Campagnes promotionnelles", icon: Gift, path: "/super-admin/promotions", category: "Marketing", alert: false },
    { id: "sa-marketing", title: "Marketing", description: "Campagnes et communications", icon: MessageSquare, path: "/super-admin/marketing", category: "Marketing", alert: false },
    { id: "sa-settings", title: "Paramètres Globaux", description: "Configuration plateforme", icon: Settings, path: "/super-admin/settings", category: "Système", alert: false },
    { id: "sa-logs", title: "Logs Système", description: "Historique des actions", icon: FileText, path: "/super-admin/logs", category: "Support", alert: false },
    { id: "sa-support", title: "Support", description: "Tickets d'assistance", icon: Headphones, path: "/super-admin/support", category: "Support", alert: true, badge: null },
    { id: "sa-notifications", title: "Notifications", description: "Alertes système", icon: Bell, path: "/super-admin/notifications", category: "Support", alert: true, badge: null },
  ];

  const [pendingTenants, setPendingTenants] = useState(0);
  const [supportTickets, setSupportTickets] = useState(0);
  const [pendingSubscriptions, setPendingSubscriptions] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCounts = async () => {
    try {
      const { count: tenantsCount, error: tenantsError } = await supabase
        .from("tenants").select("*", { count: "exact", head: true }).eq("subscription_status", "pending");
      if (!tenantsError) setPendingTenants(tenantsCount || 0);

      try {
        const { count: ticketsCount, error: ticketsError } = await supabase
          .from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open");
        if (!ticketsError) setSupportTickets(ticketsCount || 0);
      } catch (e) { setSupportTickets(0); }

      const { count: subsCount, error: subsError } = await supabase
        .from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "pending");
      if (!subsError) setPendingSubscriptions(subsCount || 0);

      try {
        const { count: notifCount, error: notifError } = await supabase
          .from("notifications").select("*", { count: "exact", head: true }).eq("is_read", false);
        if (!notifError) setUnreadNotifications(notifCount || 0);
      } catch (e) { setUnreadNotifications(0); }
    } catch (error) {
      console.error("Error fetching pending counts:", error);
    }
  };

  const getFilteredFeatures = () => {
    if (!searchTerm || searchTerm.trim() === "") return superAdminFeatures;
    return superAdminFeatures.filter(f =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getGroupedFeatures = () => {
    const filtered = getFilteredFeatures();
    return filtered.reduce((acc, feature) => {
      if (!acc[feature.category]) acc[feature.category] = [];
      acc[feature.category].push(feature);
      return acc;
    }, {});
  };

  const groupedFeatures = getGroupedFeatures();
  const [expandedCategories, setExpandedCategories] = useState(() => {
    const initial = {};
    Object.keys(groupedFeatures).forEach((cat) => { initial[cat] = true; });
    return initial;
  });

  useEffect(() => {
    const newExpanded = {};
    Object.keys(groupedFeatures).forEach((cat) => { newExpanded[cat] = true; });
    setExpandedCategories(newExpanded);
  }, [searchTerm]);

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher une fonction..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-xs md:text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </button>
        )}
      </div>

      {Object.keys(groupedFeatures).length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-xs md:text-sm">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucune fonctionnalité trouvée</p>
        </div>
      ) : (
        Object.entries(groupedFeatures).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full px-2 py-1 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <span className="text-[8px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {category}
              </span>
              {expandedCategories[category] ? 
                <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" /> : 
                <ChevronRight className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
              }
            </button>
            {expandedCategories[category] && (
              <div className="grid grid-cols-1 gap-1">
                {items.map((feature) => {
                  const Icon = feature.icon;
                  const isActive = location.pathname === feature.path;
                  let badge = feature.badge;
                  if (feature.id === "sa-tenants-pending") badge = pendingTenants > 0 ? pendingTenants : null;
                  if (feature.id === "sa-support") badge = supportTickets > 0 ? supportTickets : null;
                  if (feature.id === "sa-subscriptions-validation") badge = pendingSubscriptions > 0 ? pendingSubscriptions : null;
                  if (feature.id === "sa-notifications") badge = unreadNotifications > 0 ? unreadNotifications : null;
                  const hasAlert = badge || (feature.alert && badge !== null);

                  return (
                    <Link
                      key={feature.id}
                      to={feature.path}
                      className={`group relative flex items-center gap-2 md:gap-2.5 p-1.5 md:p-2 rounded-lg border transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : hasAlert
                          ? "border-orange-300 bg-orange-50/30 hover:bg-orange-50/50"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      {badge && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-red-500 text-[8px] md:text-[10px] font-bold text-white animate-pulse shadow-md">
                          {badge}
                        </span>
                      )}
                      <div className={`p-0.5 md:p-1 rounded-lg bg-gradient-to-br ${
                        isActive
                          ? "from-primary to-primary/70"
                          : hasAlert
                          ? "from-orange-400 to-orange-500"
                          : "from-gray-400 to-gray-500"
                      } text-white shadow-sm group-hover:scale-110 transition-transform flex-shrink-0`}>
                        <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] md:text-xs font-medium line-clamp-1 flex items-center gap-1">
                          <span className="truncate">{feature.title}</span>
                          {hasAlert && !badge && <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3 text-orange-500 flex-shrink-0" />}
                        </p>
                        <p className="text-[8px] md:text-[10px] text-muted-foreground line-clamp-1">{feature.description}</p>
                      </div>
                      {isActive && <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// ADMIN FEATURES AVEC BADGES ET SERVICES
// ============================================
function AdminFeaturesSidebar({ searchTerm, onSearchChange, location }) {
  const adminFeatures = [
    { id: "admin-home", title: "Accueil", description: "Retourner à la page d'accueil", icon: Home, path: "/", category: "Navigation", alert: false },
    { id: "dashboard", title: "Tableau de bord", description: "Vue d'ensemble", icon: LayoutDashboard, path: "/admin/dashboard", category: "Général", alert: false },
    { id: "appointments", title: "Rendez-vous", description: "Gestion des rendez-vous", icon: Calendar, path: "/admin/appointments", category: "Gestion", alert: false },
    { id: "tickets", title: "File d'attente", description: "Gestion de la file", icon: Ticket, path: "/admin/tickets", category: "Gestion", alert: true, badge: 0 },
    { id: "clients", title: "Clients", description: "Base de données clients", icon: Users, path: "/admin/clients", category: "Gestion", alert: false },
    { id: "team", title: "Équipe", description: "Gestion du personnel", icon: User, path: "/admin/team", category: "Gestion", alert: false },
    { id: "services", title: "Services", description: "Gestion des services et prestations", icon: Scissors, path: "/admin/services", category: "Catalogue", alert: false },
    { id: "products", title: "Produits", description: "Gestion des produits", icon: Package, path: "/admin/products", category: "Catalogue", alert: false },
    { id: "cashier", title: "Caisse", description: "Gestion des encaissements", icon: Receipt, path: "/admin/cashier", category: "Finances", alert: false },
    { id: "payments", title: "Paiements", description: "Historique des paiements", icon: CreditCard, path: "/admin/payments", category: "Finances", alert: false },
    { id: "loyalty", title: "Fidélité", description: "Programme de fidélité", icon: Award, path: "/admin/loyalty", category: "Marketing", alert: false },
    { id: "promotions", title: "Promotions", description: "Gestion des promotions", icon: Tag, path: "/admin/promotions", category: "Marketing", alert: false },
    { id: "gift-cards", title: "Cartes cadeaux", description: "Gestion des cartes", icon: Gift, path: "/admin/gift-cards", category: "Marketing", alert: false },
    { id: "marketing", title: "Marketing", description: "Campagnes marketing", icon: MessageSquare, path: "/admin/marketing", category: "Marketing", alert: false },
    { id: "plannings", title: "Plannings", description: "Gestion des plannings", icon: Clock, path: "/admin/plannings", category: "Gestion", alert: false },
    { id: "analytics", title: "Analytique", description: "Statistiques et rapports", icon: BarChart3, path: "/admin/analytics", category: "Analytique", alert: false },
    { id: "branches", title: "Établissements", description: "Gestion des succursales", icon: Building2, path: "/admin/branches", category: "Configuration", alert: false },
    { id: "equipment", title: "Matériel", description: "Gestion du matériel", icon: Wrench, path: "/admin/products", category: "Configuration", alert: false },
    { id: "booking", title: "Service à domicile", description: "Configuration réservation", icon: Globe, path: "/admin/appointments", category: "Configuration", alert: false },
    { id: "subscription", title: "Abonnement", description: "Gestion de l'abonnement", icon: Crown, path: "/admin/subscription", category: "Configuration", alert: false },
    { id: "settings", title: "Paramètres", description: "Configuration du salon", icon: Settings, path: "/admin/settings", category: "Configuration", alert: false },
    { id: "support", title: "Support", description: "Aide et assistance", icon: Headphones, path: "/admin/support", category: "Support", alert: false },
  ];

  const [pendingTickets, setPendingTickets] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchPendingTickets();
    const interval = setInterval(fetchPendingTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingTickets = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "waiting");
      if (!error) setPendingTickets(count || 0);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const getFilteredFeatures = () => {
    if (!searchTerm || searchTerm.trim() === "") return adminFeatures;
    return adminFeatures.filter(f =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getGroupedFeatures = () => {
    const filtered = getFilteredFeatures();
    return filtered.reduce((acc, feature) => {
      if (!acc[feature.category]) acc[feature.category] = [];
      acc[feature.category].push(feature);
      return acc;
    }, {});
  };

  const groupedFeatures = getGroupedFeatures();
  const [expandedCategories, setExpandedCategories] = useState(() => {
    const initial = {};
    Object.keys(groupedFeatures).forEach((cat) => { initial[cat] = true; });
    return initial;
  });

  useEffect(() => {
    const newExpanded = {};
    Object.keys(groupedFeatures).forEach((cat) => { newExpanded[cat] = true; });
    setExpandedCategories(newExpanded);
  }, [searchTerm]);

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-xs md:text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </button>
        )}
      </div>

      {Object.keys(groupedFeatures).length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-xs md:text-sm">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucune fonctionnalité trouvée</p>
        </div>
      ) : (
        Object.entries(groupedFeatures).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full px-2 py-1 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <span className="text-[8px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {category}
              </span>
              {expandedCategories[category] ? 
                <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" /> : 
                <ChevronRight className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
              }
            </button>
            {expandedCategories[category] && (
              <div className="grid grid-cols-1 gap-1">
                {items.map((feature) => {
                  const Icon = feature.icon;
                  const isActive = location.pathname === feature.path;
                  const badge = feature.id === "tickets" ? pendingTickets : feature.badge;
                  const hasAlert = badge > 0 || feature.alert;

                  return (
                    <Link
                      key={feature.id}
                      to={feature.path}
                      className={`group relative flex items-center gap-2 md:gap-2.5 p-1.5 md:p-2 rounded-lg border transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : hasAlert
                          ? "border-orange-300 bg-orange-50/30 hover:bg-orange-50/50"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-red-500 text-[8px] md:text-[10px] font-bold text-white animate-pulse shadow-md">
                          {badge}
                        </span>
                      )}
                      <div className={`p-0.5 md:p-1 rounded-lg bg-gradient-to-br ${
                        isActive
                          ? "from-primary to-primary/70"
                          : hasAlert
                          ? "from-orange-400 to-orange-500"
                          : "from-gray-400 to-gray-500"
                      } text-white shadow-sm group-hover:scale-110 transition-transform flex-shrink-0`}>
                        <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] md:text-xs font-medium line-clamp-1 flex items-center gap-1">
                          <span className="truncate">{feature.title}</span>
                          {hasAlert && badge === 0 && <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3 text-orange-500 flex-shrink-0" />}
                        </p>
                        <p className="text-[8px] md:text-[10px] text-muted-foreground line-clamp-1">{feature.description}</p>
                      </div>
                      {isActive && <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// EMPLOYEE FEATURES AVEC BADGES
// ============================================
function EmployeeFeaturesSidebar({ location }) {
  const [pendingTickets, setPendingTickets] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCounts = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      const { count: ticketsCount, error: ticketsError } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "waiting");
      if (!ticketsError) setPendingTickets(ticketsCount || 0);

      const { count: appCount, error: appError } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("employee_id", profileId)
        .eq("status", "pending");
      if (!appError) setPendingAppointments(appCount || 0);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const employeeFeatures = [
    { id: "emp-home", title: "Accueil", icon: Home, path: "/", alert: false },
    { id: "emp-dashboard", title: "Tableau de bord", icon: LayoutDashboard, path: "/employee/dashboard", alert: false },
    { id: "emp-tickets", title: "File d'attente", icon: Ticket, path: "/employee/tickets", alert: true, badge: 0 },
    { id: "emp-schedule", title: "Mon Planning", icon: Calendar, path: "/employee/schedule", alert: false },
    { id: "emp-appointments", title: "Mes Rendez-vous", icon: Clock, path: "/employee/appointments", alert: true, badge: 0 },
    { id: "emp-availability", title: "Disponibilités", icon: Clock, path: "/employee/availability", alert: false },
    { id: "emp-reviews", title: "Mes Évaluations", icon: Star, path: "/employee/reviews", alert: false },
    { id: "emp-commissions", title: "Mes Commissions", icon: DollarSign, path: "/employee/commissions", alert: false },
    { id: "emp-profile", title: "Mon Profil", icon: User, path: "/employee/profile", alert: false },
  ];

  return (
    <div className="space-y-1">
      {employeeFeatures.map((feature) => {
        const isActive = location.pathname === feature.path || location.pathname.startsWith(feature.path + "/");
        const Icon = feature.icon;
        let badge = feature.badge;
        if (feature.id === "emp-tickets") badge = pendingTickets;
        if (feature.id === "emp-appointments") badge = pendingAppointments;
        const hasAlert = badge > 0 || feature.alert;

        return (
          <Link
            key={feature.id}
            to={feature.path}
            className={`flex items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : hasAlert
                ? "border border-orange-300 bg-orange-50/30 hover:bg-orange-50/50 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="flex-1 flex items-center gap-1 truncate">
              <span className="truncate">{feature.title}</span>
              {hasAlert && badge === 0 && <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3 text-orange-500 flex-shrink-0" />}
            </span>
            {badge > 0 && (
              <Badge className="bg-red-500 text-white text-[8px] md:text-xs px-1.5 md:px-2 py-0.5 animate-pulse flex-shrink-0">
                {badge}
              </Badge>
            )}
            {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
          </Link>
        );
      })}
    </div>
  );
}

// ============================================
// CLIENT FEATURES AVEC BADGES
// ============================================
function ClientFeaturesSidebar({ location }) {
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCounts = async () => {
    try {
      const profileId = currentUser?.profile?.id;
      const { count: appCount, error: appError } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("client_id", profileId)
        .eq("status", "pending");
      if (!appError) setPendingAppointments(appCount || 0);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const clientFeatures = [
    { id: "client-home", title: "Accueil", icon: Home, path: "/", alert: false },
    { id: "client-dashboard", title: "Tableau de bord", icon: LayoutDashboard, path: "/client/dashboard", alert: false },
    { id: "client-profile", title: "Mon Profil", icon: User, path: "/client/profile", alert: false },
  ];

  return (
    <div className="space-y-1">
      {clientFeatures.map((feature) => {
        const isActive = location.pathname === feature.path || location.pathname.startsWith(feature.path + "/");
        const Icon = feature.icon;
        let badge = feature.badge;
        if (feature.id === "client-appointments") badge = pendingAppointments;
        const hasAlert = badge > 0 || feature.alert;

        return (
          <Link
            key={feature.id}
            to={feature.path}
            className={`flex items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : hasAlert
                ? "border border-orange-300 bg-orange-50/30 hover:bg-orange-50/50 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="flex-1 flex items-center gap-1 truncate">
              <span className="truncate">{feature.title}</span>
              {hasAlert && badge === 0 && <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3 text-orange-500 flex-shrink-0" />}
            </span>
            {badge > 0 && (
              <Badge className="bg-red-500 text-white text-[8px] md:text-xs px-1.5 md:px-2 py-0.5 animate-pulse flex-shrink-0">
                {badge}
              </Badge>
            )}
            {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
          </Link>
        );
      })}
    </div>
  );
}

// ============================================
// DASHBOARD LAYOUT UNIFIÉ - TOUS LES RÔLES
// ============================================
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentUser, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Détection des appareils mobiles
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // 🔥 DÉCLARATION DES RÔLES AVANT LES useEffect
  const userRole = currentUser?.profile?.role || currentUser?.role;
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin";
  const isEmployee = userRole === "employee";
  const isClient = userRole === "client";
  const isVisitor = !isAuthenticated;

  const displayName = currentUser?.profile?.full_name || currentUser?.full_name || "Utilisateur";
  const displayEmail = currentUser?.profile?.email || currentUser?.email || "";
  const [employeeData, setEmployeeData] = useState(null);
  const [globalAlertCount, setGlobalAlertCount] = useState(0);
  const [tenantId, setTenantId] = useState(null);
  const [tenantName, setTenantName] = useState("BeautyFlow"); // État pour le nom du tenant

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Gestion du swipe pour fermer le menu
  useEffect(() => {
    let touchStartX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;
      
      if (swipeDistance > 50 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sidebarOpen, isMobile]);

  // Bloquer le scroll quand le menu est ouvert
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [sidebarOpen, isMobile]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Récupérer le tenant ID pour les visiteurs
  useEffect(() => {
    const fetchTenant = async () => {
      if (!isAuthenticated) {
        const { data } = await supabase
          .from("tenants")
          .select("id")
          .eq("subscription_status", "active")
          .limit(1)
          .single();
        if (data) setTenantId(data.id);
      }
    };
    fetchTenant();
  }, [isAuthenticated]);

  // Récupérer le nom du tenant pour l'admin
  useEffect(() => {
    const fetchTenantName = async () => {
      if (isAdmin && currentUser?.profile?.tenant_id) {
        try {
          const { data, error } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", currentUser.profile.tenant_id)
            .single();
          
          if (!error && data) {
            setTenantName(data.name);
          }
        } catch (error) {
          console.error("Error fetching tenant name:", error);
          setTenantName("BeautyFlow");
        }
      } else if (isSuperAdmin) {
        setTenantName("Super Admin");
      } else if (isEmployee && currentUser?.profile?.tenant_id) {
        // Pour les employés, on récupère aussi le nom du tenant
        try {
          const { data, error } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", currentUser.profile.tenant_id)
            .single();
          
          if (!error && data) {
            setTenantName(data.name);
          }
        } catch (error) {
          console.error("Error fetching tenant name:", error);
          setTenantName("BeautyFlow");
        }
      } else if (isClient) {
        setTenantName("BeautyFlow");
      } else {
        setTenantName("BeautyFlow");
      }
    };

    fetchTenantName();
  }, [currentUser, isAdmin, isSuperAdmin, isEmployee, isClient]);

  useEffect(() => {
    if (userRole === "employee" && currentUser?.profile?.id) {
      fetchEmployeeData();
    }
    fetchGlobalAlerts();
    const interval = setInterval(fetchGlobalAlerts, 30000);
    return () => clearInterval(interval);
  }, [currentUser, userRole]);

  const fetchEmployeeData = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("profile_id", profileId)
        .eq("tenant_id", tenantId)
        .single();
      if (!error) setEmployeeData(data);
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const fetchGlobalAlerts = async () => {
    try {
      let count = 0;
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      if (userRole === "super_admin") {
        const { count: tenantsCount } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true })
          .eq("subscription_status", "pending");
        const { count: subsCount } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        const { count: ticketsCount } = await supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "open");
        const { count: notifCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("is_read", false);
        count = (tenantsCount || 0) + (subsCount || 0) + (ticketsCount || 0) + (notifCount || 0);
      } else if (userRole === "admin") {
        const { count: ticketsCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "waiting");
        count = ticketsCount || 0;
      } else if (userRole === "employee") {
        const { count: ticketsCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "waiting");
        const { count: appCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("employee_id", profileId)
          .eq("status", "pending");
        count = (ticketsCount || 0) + (appCount || 0);
      } else if (userRole === "client") {
        const { count: appCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("client_id", profileId)
          .eq("status", "pending");
        count = appCount || 0;
      }
      setGlobalAlertCount(count);
    } catch (error) {
      console.error("Error fetching global alerts:", error);
    }
  };

  const getNavLinks = () => {
    if (isVisitor) {
      return [
        { name: "Accueil", path: "/", icon: Home },
        { name: "Nos Services", path: "/services", icon: Scissors },
        { name: "Nos Salons", path: "/tenants", icon: Store },
        { name: "Réserver", path: "/booking", icon: CalendarPlus },
        { name: "Se connecter", path: "/login", icon: LogIn },
      ];
    } else if (isSuperAdmin) {
      return [
        { name: "Accueil", path: "/", icon: Home },
        { name: "Dashboard", path: "/super-admin/dashboard", icon: LayoutDashboard },
        { name: "Salons", path: "/super-admin/tenants", icon: Building2 },
        { name: "Administrateurs", path: "/super-admin/admins", icon: ShieldCheck },
        { name: "Abonnements", path: "/super-admin/subscriptions", icon: Crown },
        { name: "Analytique", path: "/super-admin/analytics", icon: BarChart3 },
        { name: "Paramètres", path: "/super-admin/settings", icon: Settings },
      ];
    } else if (isAdmin) {
      return [
        { name: "Accueil", path: "/", icon: Home },
        { name: "Tableau de bord", path: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Rendez-vous", path: "/admin/appointments", icon: Calendar },
        { name: "Clients", path: "/admin/clients", icon: Users },
        { name: "Services", path: "/admin/services", icon: Scissors },
        { name: "Produits", path: "/admin/products", icon: Package },
        { name: "Abonnement", path: "/admin/subscription", icon: Crown },
        { name: "Paramètres", path: "/admin/settings", icon: Settings },
      ];
    } else if (isEmployee) {
      return [
        { name: "Accueil", path: "/", icon: Home },
        { name: "Tableau de bord", path: "/employee/dashboard", icon: LayoutDashboard },
        { name: "File d'attente", path: "/employee/tickets", icon: Ticket },
        { name: "Mon Planning", path: "/employee/schedule", icon: Calendar },
        { name: "Mes Clients", path: "/employee/clients", icon: Users },
        { name: "Mon Profil", path: "/employee/profile", icon: User },
      ];
    } else if (isClient) {
      return [
        { name: "Accueil", path: "/", icon: Home },
        { name: "Tableau de bord", path: "/client/dashboard", icon: LayoutDashboard },
        { name: "Nouveau RDV", path: "/client/book", icon: CalendarPlus },
        { name: "Historique", path: "/client/history", icon: History },
        { name: "Fidélité", path: "/client/loyalty", icon: Award },
        { name: "Mon Profil", path: "/client/profile", icon: User },
      ];
    }
    return [];
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinks = getNavLinks();

  const getFeaturesSidebar = () => {
    if (isVisitor) return <VisitorFeaturesSidebar location={location} tenantId={tenantId} />;
    else if (isSuperAdmin) return <SuperAdminFeaturesSidebar searchTerm={searchTerm} onSearchChange={setSearchTerm} location={location} />;
    else if (isAdmin) return <AdminFeaturesSidebar searchTerm={searchTerm} onSearchChange={setSearchTerm} location={location} />;
    else if (isEmployee) return <EmployeeFeaturesSidebar location={location} />;
    else if (isClient) return <ClientFeaturesSidebar location={location} />;
    return null;
  };

  const getHeaderConfig = () => {
    if (isVisitor) return { icon: Store, label: "BeautyFlow", badge: "👋 Bienvenue" };
    if (isSuperAdmin) return { icon: CrownIcon, label: "Super Admin", badge: null };
    if (isAdmin) return { icon: Scissors, label: tenantName || "BeautyFlow", badge: null };
    if (isEmployee) return { icon: Scissors, label: tenantName || "BeautyFlow", badge: employeeData?.is_cashier ? "🏦 Caisse" : null };
    if (isClient) return { icon: Scissors, label: "BeautyFlow", badge: null };
    return { icon: Scissors, label: "BeautyFlow", badge: null };
  };

  const headerConfig = getHeaderConfig();
  const HeaderIcon = headerConfig.icon;
  const headerLabel = headerConfig.label;

  const SidebarContent = () => (
    <>
      <div className={`flex shrink-0 items-center justify-between border-b px-3 md:px-4 ${
        isMobile ? 'h-14' : 'h-16'
      }`}>
        <Link to={isSuperAdmin ? "/super-admin/dashboard" : "/"} className="flex items-center gap-2 group min-w-0">
          <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent group-hover:scale-110 transition-transform flex-shrink-0">
            <HeaderIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <span className={`font-bold tracking-tight truncate ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            {headerLabel}
          </span>
          {headerConfig.badge && (
            <Badge className="ml-1 md:ml-2 bg-amber-100 text-amber-800 text-[8px] md:text-[10px] whitespace-nowrap flex-shrink-0">
              {headerConfig.badge}
            </Badge>
          )}
          {isSuperAdmin && (
            <Badge className="ml-1 md:ml-2 bg-purple-100 text-purple-800 text-[8px] md:text-[10px] whitespace-nowrap flex-shrink-0">
              ⭐ Admin
            </Badge>
          )}
          {globalAlertCount > 0 && (
            <Badge className="ml-1 md:ml-2 bg-red-500 text-white text-[8px] md:text-[10px] animate-pulse flex-shrink-0">
              {globalAlertCount}
            </Badge>
          )}
        </Link>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className={`text-muted-foreground hover:text-primary transition-colors ${
                    isMobile ? 'h-8 w-8' : 'h-9 w-9'
                  }`}
                  aria-label="Retour à l'accueil"
                >
                  <Home className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Retour à l'accueil</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="icon"
            className={`lg:hidden ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}
            onClick={() => setSidebarOpen(false)}
          >
            <X className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className={`flex-1 px-2 md:px-3 py-3 md:py-4 ${
        isMobile ? 'h-[calc(100vh-120px)]' : 'h-[calc(100vh-140px)]'
      }`}>
        <nav className="space-y-0.5 md:space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + "/");
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => {
                  setSidebarOpen(false);
                  if (isMobile) {
                    setTimeout(() => {
                      document.body.style.overflow = '';
                      document.body.style.position = '';
                      document.body.style.width = '';
                    }, 100);
                  }
                }}
                className={`flex items-center gap-2 md:gap-3 rounded-lg md:rounded-xl px-2 md:px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <link.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 ${isActive ? "text-primary-foreground" : ""}`} />
                <span className="truncate">{link.name}</span>
                {isActive && <Sparkles className={`h-2.5 w-2.5 md:h-3 md:w-3 ml-auto flex-shrink-0 text-primary-foreground/70`} />}
              </Link>
            );
          })}
        </nav>

        {(isSuperAdmin || isAdmin) && (
          <div className="mt-4 md:mt-6">
            <div className="border-t pt-3 md:pt-4">
              <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 mb-2">
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary flex-shrink-0" />
                <span className="text-[8px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {isSuperAdmin ? "Toutes les fonctionnalités" : "Toutes les fonctionnalités"}
                </span>
                {globalAlertCount > 0 && (
                  <Badge className="bg-red-500 text-white text-[7px] md:text-[9px] animate-pulse flex-shrink-0">
                    {globalAlertCount}
                  </Badge>
                )}
              </div>
              {getFeaturesSidebar()}
            </div>
          </div>
        )}

        {/* Pour les visiteurs, afficher les fonctionnalités directement */}
        {isVisitor && (
          <div className="mt-4 md:mt-6">
            <div className="border-t pt-3 md:pt-4">
              <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 mb-2">
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary flex-shrink-0" />
                <span className="text-[8px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Services disponibles
                </span>
              </div>
              {getFeaturesSidebar()}
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-2 md:p-3">
        <div className={`flex items-center gap-2 md:gap-3 rounded-lg md:rounded-xl bg-muted p-2 md:p-2.5 hover:bg-muted/80 transition-colors`}>
          <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-9 w-9'} border border-border flex-shrink-0`}>
            <AvatarImage src={currentUser?.profile?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs md:text-sm">
              {isVisitor ? "👤" : getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {isVisitor ? "Visiteur" : displayName}
            </p>
            <p className={`text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate flex items-center gap-1`}>
              <span className="truncate">{isVisitor ? "Non connecté" : userRole?.replace("_", " ") || "Utilisateur"}</span>
              {globalAlertCount > 0 && <BellRing className={`h-2.5 w-2.5 md:h-3 md:w-3 text-red-500 animate-pulse flex-shrink-0`} />}
            </p>
            {isEmployee && employeeData?.employee_number && (
              <p className="text-[8px] md:text-[10px] text-muted-foreground">#{employeeData.employee_number}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/')}
                    className={`text-muted-foreground hover:text-primary transition-colors ${
                      isMobile ? 'h-7 w-7' : 'h-8 w-8 md:h-9 md:w-9'
                    }`}
                    aria-label="Retour à l'accueil"
                  >
                    <Home className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Accueil</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isVisitor ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate('/login')}
                      className={`text-muted-foreground hover:text-primary transition-colors ${
                        isMobile ? 'h-7 w-7' : 'h-8 w-8 md:h-9 md:w-9'
                      }`}
                    >
                      <LogIn className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Se connecter</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className={`text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${
                        isMobile ? 'h-7 w-7' : 'h-8 w-8 md:h-9 md:w-9'
                      }`}
                    >
                      <LogOut className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Déconnexion</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/40">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => {
            setSidebarOpen(false);
            if (isMobile) {
              setTimeout(() => {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
              }, 100);
            }
          }}
        />
      )}

      <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-col border-r bg-card fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`lg:hidden fixed top-2.5 md:top-3 left-2.5 md:left-3 z-50 bg-background/80 backdrop-blur-sm shadow-sm border ${
              isMobile ? 'h-9 w-9' : 'h-10 w-10'
            }`}
            aria-label="Ouvrir le menu"
          >
            <Menu className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className={`p-0 w-[280px] max-w-[85vw] ${isMobile ? 'pt-0' : ''}`}
          style={{
            height: '100vh',
            overflow: 'hidden',
            touchAction: 'pan-y'
          }}
        >
          <div 
            className="flex flex-col h-full"
            style={{ 
              overflow: 'hidden',
              height: '100vh'
            }}
          >
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col lg:ml-64 xl:ml-72 min-w-0 overflow-hidden">
        <header className={`flex shrink-0 items-center justify-between border-b bg-card px-3 md:px-4 lg:hidden ${
          isMobile ? 'h-12 md:h-14' : 'h-14'
        }`}>
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className={`text-muted-foreground hover:text-primary flex-shrink-0 ${
                isMobile ? 'h-8 w-8' : 'h-9 w-9'
              }`}
              aria-label="Accueil"
            >
              <Home className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </Button>
            <div className={`flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent flex-shrink-0`}>
              <HeaderIcon className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-white`} />
            </div>
            <span className={`font-bold truncate ${isMobile ? 'text-base' : 'text-lg'}`}>
              {headerLabel}
            </span>
            {headerConfig.badge && (
              <Badge className={`ml-1 md:ml-2 bg-amber-100 text-amber-800 text-[8px] md:text-[10px] whitespace-nowrap flex-shrink-0`}>
                {headerConfig.badge}
              </Badge>
            )}
            {globalAlertCount > 0 && (
              <Badge className={`ml-1 md:ml-2 bg-red-500 text-white text-[8px] md:text-[10px] animate-pulse flex-shrink-0`}>
                {globalAlertCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className={isMobile ? 'h-8 w-8' : 'h-9 w-9'}
            >
              <Menu className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </Button>
          </div>
        </header>

        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 lg:p-6"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}