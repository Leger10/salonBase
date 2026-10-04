// /src/components/Header.jsx - Ajout du bouton Promotions
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useTheme } from "@/contexts/ThemeContext.jsx";
import { useTenant } from "@/contexts/TenantContext.jsx";
import { useActiveTenant } from "@/contexts/ActiveTenantContext";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext";
import { supabase } from '@/lib/supabase';
import { Menu, X, User, LogOut, Scissors, Bell, Sun, Moon, Monitor, AlertTriangle, Tv, ChevronDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import NotificationBell from "@/components/NotificationBell.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";

export default function Header() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { tenantSettings } = useTenant();
  const { setLightTheme, setDarkTheme, setSystemTheme, isDark, isLight, isSystem } = useTheme();
  const { activeTenant, isShowcase } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subscriptionAlert, setSubscriptionAlert] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [tenantSlug, setTenantSlug] = useState(null);
  const [isTenantPage, setIsTenantPage] = useState(false);

  // ✅ Vérifier si on est sur une page tenant
  useEffect(() => {
    const path = location.pathname;
    const isTenantPath = path.startsWith('/showcase/') || path.startsWith('/booking/tenant/');
    setIsTenantPage(isTenantPath);
  }, [location.pathname]);

  // ✅ Récupérer les infos du tenant
  useEffect(() => {
    const fetchTenantInfo = async () => {
      // 1. Priorité au tenant actif (showcase)
      if (isShowcase && activeTenant) {
        setTenantInfo(activeTenant);
        setTenantSlug(activeTenant.slug);
        return;
      }

      // 2. Si l'utilisateur est admin/employee, récupérer son tenant
      if (isAuthenticated && currentUser?.profile?.tenant_id) {
        try {
          const { data, error } = await supabase
            .from('tenants')
            .select('id, name, slug, logo_url, primary_color, address, phone, email')
            .eq('id', currentUser.profile.tenant_id)
            .single();

          if (!error && data) {
            setTenantInfo(data);
            setTenantSlug(data.slug);
            return;
          }
        } catch (error) {
          console.error('Error fetching tenant:', error);
        }
      }

      // 3. Fallback sur tenantSettings
      setTenantInfo(tenantSettings);
      setTenantSlug(tenantSettings?.slug || null);
    };

    fetchTenantInfo();
  }, [isShowcase, activeTenant, isAuthenticated, currentUser, tenantSettings]);

  useEffect(() => {
    if (isAuthenticated && currentUser?.profile?.role === 'admin') {
      checkSubscriptionAlert();
    }
  }, [currentUser, isAuthenticated]);

  const checkSubscriptionAlert = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('subscription_status, subscription_end, external_payment_expiry, subscription_mode')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      let isActive = false;
      
      if (tenant.subscription_status === 'active' && tenant.subscription_end) {
        isActive = new Date(tenant.subscription_end) > new Date();
      }
      
      if (tenant.subscription_mode === 'external' && tenant.external_payment_expiry) {
        isActive = new Date(tenant.external_payment_expiry) > new Date();
      }

      if (tenant.subscription_mode === 'free') {
        isActive = true;
      }

      setSubscriptionAlert(!isActive);
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  // ✅ Générer les liens publics avec le tenant si nécessaire
  const getPublicLink = (path) => {
    if (isTenantPage || isShowcase) {
      const slug = tenantSlug || activeTenant?.slug;
      if (slug) {
        if (path === "/") {
          return `/showcase/${slug}`;
        }
        return `/showcase/${slug}${path}`;
      }
    }
    if (isAuthenticated && tenantSlug) {
      if (path === "/") {
        return `/showcase/${tenantSlug}`;
      }
      return `/showcase/${tenantSlug}${path}`;
    }
    return path;
  };

  const publicLinks = [
    { to: "/", label: "Accueil" },
    { to: "/services", label: "Services" },
    { to: "/about", label: "À Propos" },
    { to: "/promotions", label: "Promotions" }, // ✅ Ajout du lien vers les promotions
    { to: "/contact", label: "Contact" },
  ];

  const getRoleLabel = (role) => {
    const roleLabels = {
      super_admin: "Super Admin",
      admin: "Admin",
      employee: "Employé",
      client: "Client",
    };
    return roleLabels[role] || role;
  };

  const getDashboardPath = (role) => {
    if (role === "super_admin") return "/super-admin/dashboard";
    if (role === "admin") return "/admin/dashboard";
    if (role === "employee") return "/employee/dashboard";
    return "/client/dashboard";
  };

  // ✅ Fonction pour obtenir le lien de réservation du tenant
  const getBookingLink = () => {
    if (isShowcase && activeTenant) {
      return `/booking/tenant/${activeTenant.slug}`;
    }
    if (isTenantPage && tenantSlug) {
      return `/booking/tenant/${tenantSlug}`;
    }
    if (isAuthenticated && currentUser?.profile?.tenant_id && tenantSlug) {
      return `/booking/tenant/${tenantSlug}`;
    }
    if (tenantSlug) {
      return `/booking/tenant/${tenantSlug}`;
    }
    return "/services";
  };

  const displayName = currentUser?.profile?.full_name || 
                       currentUser?.full_name || 
                       currentUser?.email;

  const userRole = currentUser?.profile?.role || currentUser?.role;
  
  const primaryColor = tenantInfo?.primary_color || 
                        tenantSettings?.primary_color || 
                        platformConfig?.primaryColor || 
                        '#ec4899';

  const displayLogo = tenantInfo?.logo_url || 
                       tenantSettings?.logo_url || 
                       platformConfig?.logoUrl || 
                       null;

  const displayNameTenant = tenantInfo?.name || 
                             tenantSettings?.name || 
                             platformConfig?.platformName || 
                             'BeautyFlow';

  const ThemeIcon = () => {
    if (isLight) return <Sun className="h-4 w-4" />;
    if (isDark) return <Moon className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const handleBookingClick = () => {
    navigate(getBookingLink());
    setMobileMenuOpen(false);
  };

  const getHomeLink = () => {
    if (isShowcase && activeTenant?.slug) {
      return `/showcase/${activeTenant.slug}`;
    }
    if (isTenantPage && tenantSlug) {
      return `/showcase/${tenantSlug}`;
    }
    if (tenantSlug) {
      return `/showcase/${tenantSlug}`;
    }
    return "/";
  };

  // ✅ Vérifier si on doit afficher le bouton Promotions
  const showPromotionsButton = () => {
    // Toujours afficher en mode showcase ou tenant page
    if (isTenantPage || isShowcase) return true;
    // Afficher si l'utilisateur est authentifié et a un tenant
    if (isAuthenticated && (userRole === 'admin' || userRole === 'employee')) return true;
    // Afficher sur la page d'accueil générale
    return true;
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
        {/* Logo */}
        <Link to={getHomeLink()} className="flex items-center gap-2 group">
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt={displayNameTenant} 
              className="h-10 w-10 rounded-full object-cover border-2"
              style={{ borderColor: primaryColor }}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent transition-transform group-hover:scale-105">
              <Scissors className="h-5 w-5 text-white" />
            </div>
          )}
          <span 
            className="text-xl font-bold tracking-tight text-foreground"
            style={{ color: (isTenantPage || isShowcase) ? primaryColor : undefined }}
          >
            {(isTenantPage || isShowcase) ? displayNameTenant : 'BeautyFlow'}
          </span>
        </Link>

        {/* Liens publics - Desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {publicLinks.map((link) => {
            const linkTo = getPublicLink(link.to);
            const isLinkActive = isActive(link.to) || location.pathname === linkTo;
            
            return (
              <Link
                key={link.to}
                to={linkTo}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isLinkActive ? "text-primary" : "text-foreground/70"
                }`}
                style={{ color: isLinkActive ? primaryColor : undefined }}
              >
                {link.label === "Promotions" ? (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Promotions
                  </span>
                ) : (
                  link.label
                )}
              </Link>
            );
          })}
          
          {/* Menu déroulant Écran public + Galerie */}
          <DropdownMenu open={publicMenuOpen} onOpenChange={setPublicMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/public-display' || location.pathname === '/gallery' 
                    ? "text-primary" 
                    : "text-foreground/70"
                }`}
                style={{ 
                  color: (location.pathname === '/public-display' || location.pathname === '/gallery') 
                    ? primaryColor
                    : undefined 
                }}
              >
                <Tv className="h-4 w-4" />
                <span>Écran public</span>
                <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${publicMenuOpen ? 'rotate-180' : ''}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 p-1">
              <DropdownMenuItem asChild>
                <Link 
                  to="/public-display" 
                  className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 hover:bg-muted rounded-md"
                  onClick={() => setPublicMenuOpen(false)}
                >
                  <Tv className="h-4 w-4 text-emerald-500" />
                  <span>Écran public</span>
                  <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full animate-pulse ml-auto">LIVE</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  to={getPublicLink("/gallery")} 
                  className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 hover:bg-muted rounded-md"
                  onClick={() => setPublicMenuOpen(false)}
                >
                  <span>📸</span>
                  <span>Galerie</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bouton Réserver */}
          <button
            onClick={handleBookingClick}
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: primaryColor }}
          >
            Réserver
          </button>
        </div>

        {/* ✅ Actions - Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          {/* Bouton de thème */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground/70 hover:text-foreground hover:bg-muted/50"
                aria-label="Changer le thème"
              >
                <ThemeIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={setLightTheme} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <span>Clair</span>
                </div>
                {isLight && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={setDarkTheme} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>Sombre</span>
                </div>
                {isDark && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={setSystemTheme} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span>Système</span>
                </div>
                {isSystem && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!isAuthenticated ? (
            <>
              <Button variant="ghost" asChild className="text-foreground/70 hover:text-primary">
                <Link to="/auth/login">Se connecter</Link>
              </Button>
              <Button asChild className="shadow-sm text-white" style={{ backgroundColor: primaryColor }}>
                <Link to="/auth/signup">S'inscrire</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <NotificationBell />
              
              {/* Profil utilisateur */}
              <Link
                to={getDashboardPath(userRole)}
                className="flex items-center gap-2 rounded-lg bg-muted/50 hover:bg-muted px-3 py-2 transition-colors border border-transparent hover:border-border relative"
              >
                {isAdmin && subscriptionAlert && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse shadow-md">
                    !
                  </span>
                )}
                <div className="bg-primary/10 p-1.5 rounded-md">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground leading-none">
                    {displayName}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
                      {getRoleLabel(userRole)}
                    </span>
                    {isAdmin && subscriptionAlert && (
                      <span className="text-[8px] text-red-500 font-bold uppercase flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Expiré
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Menu mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-foreground p-2 -mr-2"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <div className="border-t bg-background px-6 py-4 md:hidden shadow-lg absolute w-full left-0">
          <div className="flex flex-col gap-4">
            {publicLinks.map((link) => {
              const linkTo = getPublicLink(link.to);
              const isLinkActive = isActive(link.to) || location.pathname === linkTo;
              
              return (
                <Link
                  key={link.to}
                  to={linkTo}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-base font-medium transition-colors hover:text-primary py-2 ${
                    isLinkActive ? "text-primary" : "text-foreground/80"
                  }`}
                  style={{ color: isLinkActive ? primaryColor : undefined }}
                >
                  {link.label === "Promotions" ? (
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Promotions
                    </span>
                  ) : (
                    link.label
                  )}
                </Link>
              );
            })}
            
            {/* Écran public - Menu mobile */}
            <div className="border border-emerald-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 flex items-center gap-2 border-b border-emerald-200">
                <Tv className="h-4 w-4" />
                <span>Écran public</span>
                <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full animate-pulse ml-auto">LIVE</span>
              </div>
              <div className="bg-white divide-y divide-gray-100">
                <Link
                  to="/public-display"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <Tv className="h-4 w-4" />
                  Voir l'écran public
                </Link>
                <Link
                  to={getPublicLink("/gallery")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>📸</span>
                  Galerie
                </Link>
              </div>
            </div>

            {/* Bouton Réserver */}
            <button
              onClick={handleBookingClick}
              className="text-base font-medium py-2 text-left"
              style={{ color: primaryColor }}
            >
              Réserver
            </button>
            
            <div className="h-px bg-border my-2"></div>
            
            {/* Thème dans le menu mobile */}
            <div className="flex items-center gap-2 py-2">
              <span className="text-sm text-muted-foreground">Thème :</span>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant={isLight ? "default" : "outline"} 
                  onClick={() => { setLightTheme(); setMobileMenuOpen(false); }} 
                  className="h-8 px-3 text-xs"
                >
                  <Sun className="h-3 w-3 mr-1" /> Clair
                </Button>
                <Button 
                  size="sm" 
                  variant={isDark ? "default" : "outline"} 
                  onClick={() => { setDarkTheme(); setMobileMenuOpen(false); }} 
                  className="h-8 px-3 text-xs"
                >
                  <Moon className="h-3 w-3 mr-1" /> Sombre
                </Button>
                <Button 
                  size="sm" 
                  variant={isSystem ? "default" : "outline"} 
                  onClick={() => { setSystemTheme(); setMobileMenuOpen(false); }} 
                  className="h-8 px-3 text-xs"
                >
                  <Monitor className="h-3 w-3 mr-1" /> Système
                </Button>
              </div>
            </div>
            
            <div className="h-px bg-border my-2"></div>
            
            {!isAuthenticated ? (
              <>
                <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-foreground/80 transition-colors hover:text-primary py-2">
                  Se connecter
                </Link>
                <Link to="/auth/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-3 text-center text-base font-semibold text-white transition-all hover:opacity-90 mt-2 shadow-sm" style={{ backgroundColor: primaryColor }}>
                  S'inscrire
                </Link>
              </>
            ) : (
              <>
                <Link to={getDashboardPath(userRole)} onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-foreground/80 transition-colors hover:text-primary py-2">
                  Mon Tableau de bord
                </Link>
                {isAdmin && subscriptionAlert && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-700 font-medium">Abonnement expiré !</span>
                  </div>
                )}
                <button onClick={handleLogout} className="flex items-center gap-2 text-base font-medium text-destructive transition-colors py-2">
                  <LogOut className="h-5 w-5" /> Déconnexion
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}