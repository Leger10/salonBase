// /src/components/PublicHeader.jsx - Ajout du bouton Promotions
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import {
  Scissors,
  Menu,
  X,
  Calendar,
  User,
  LogOut,
  Tv,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Tag,
} from "lucide-react";
import { useActiveTenant } from "@/contexts/ActiveTenantContext";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext.jsx";
import { useTenant } from "@/contexts/TenantContext.jsx";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const [tenantLogo, setTenantLogo] = useState(null);
  const [tenantName, setTenantName] = useState(null);
  const [tenantColor, setTenantColor] = useState(null);
  const [tenantSlug, setTenantSlug] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const location = useLocation();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const {
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    isDark,
    isLight,
    isSystem,
  } = useTheme();
  const { tenantSettings } = useTenant();

  const activeContext = useActiveTenant();
  const platformConfig = usePlatformConfig();

  const { activeTenant, isShowcase } = activeContext || {
    activeTenant: null,
    isShowcase: false,
  };

  const userRole = currentUser?.profile?.role || currentUser?.role;
  const userTenantId = currentUser?.profile?.tenant_id || currentUser?.tenant_id;
  const isAdmin = isAuthenticated && (userRole === "admin" || userRole === "employee");
  const isSuperAdmin = isAuthenticated && userRole === "super_admin";

  // ✅ Récupérer les infos du tenant
  useEffect(() => {
    const fetchTenantInfo = async () => {
      if (isShowcase && activeTenant) {
        setTenantLogo(activeTenant.logo_url);
        setTenantName(activeTenant.name);
        setTenantColor(activeTenant.primary_color || platformConfig.primaryColor);
        setTenantSlug(activeTenant.slug);
        setTenantId(activeTenant.id);
        setIsTenantAdmin(true);
        updateSEO(activeTenant.name, activeTenant.description, activeTenant.primary_color);
        return;
      }

      if (isAdmin && userTenantId) {
        try {
          const { data, error } = await supabase
            .from("tenants")
            .select("logo_url, name, primary_color, slug, description, id")
            .eq("id", userTenantId)
            .single();

          if (!error && data) {
            setTenantLogo(data.logo_url);
            setTenantName(data.name);
            setTenantColor(data.primary_color || platformConfig.primaryColor);
            setTenantSlug(data.slug);
            setTenantId(data.id);
            setIsTenantAdmin(true);
            updateSEO(data.name, data.description, data.primary_color);
            return;
          }
        } catch (error) {
          console.error("Error fetching tenant:", error);
        }
      }

      if (isSuperAdmin) {
        setTenantLogo(platformConfig.logoUrl);
        setTenantName(platformConfig.platformName || "BeautyFlow");
        setTenantColor(platformConfig.primaryColor);
        setTenantSlug(null);
        setTenantId(null);
        setIsTenantAdmin(false);
        updateSEO(platformConfig.platformName, platformConfig.platformDescription, platformConfig.primaryColor);
        return;
      }

      if (tenantSettings?.name) {
        setTenantLogo(tenantSettings.logo_url);
        setTenantName(tenantSettings.name);
        setTenantColor(tenantSettings.primary_color || platformConfig.primaryColor);
        setTenantSlug(tenantSettings.slug);
        setTenantId(tenantSettings.id);
        setIsTenantAdmin(isAdmin);
        updateSEO(tenantSettings.name, tenantSettings.description, tenantSettings.primary_color);
        return;
      }

      setTenantLogo(platformConfig.logoUrl);
      setTenantName(platformConfig.platformName || "BeautyFlow");
      setTenantColor(platformConfig.primaryColor);
      setTenantSlug(null);
      setTenantId(null);
      setIsTenantAdmin(false);
      updateSEO(platformConfig.platformName, platformConfig.platformDescription, platformConfig.primaryColor);
    };

    fetchTenantInfo();
  }, [isShowcase, activeTenant, isAdmin, userTenantId, isSuperAdmin, currentUser, platformConfig, tenantSettings]);

  const updateSEO = (name, description, color) => {
    if (name) {
      document.title = `${name} - BeautyFlow`;
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && description) {
      metaDescription.content = description;
    } else if (metaDescription) {
      metaDescription.content = `Découvrez ${name || "BeautyFlow"}, votre salon de beauté. Prenez rendez-vous en ligne.`;
    }

    const metaTheme = document.querySelector("meta[name='theme-color']");
    if (metaTheme && color) {
      metaTheme.content = color;
    }
  };

  const getTenantLink = (path) => {
    const slug = tenantSlug || activeTenant?.slug;
    if (slug) {
      if (path === "/") {
        return `/showcase/${slug}`;
      }
      return `/showcase/${slug}${path}`;
    }
    return path;
  };

  const getBookingLink = () => {
    const slug = tenantSlug || activeTenant?.slug;
    if (slug) {
      return `/booking/tenant/${slug}`;
    }
    return "/booking";
  };

  // ✅ Navigation avec liens dynamiques incluant Promotions
  const navLinks = [
    { name: "Accueil", path: "" },
    { name: "Services", path: "/services" },
    { name: "À Propos", path: "/about" },
    { name: "Promotions", path: "/promotions" }, // ✅ Ajout des promotions
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path) => {
    const currentPath = location.pathname;
    const slug = tenantSlug || activeTenant?.slug;
    
    if (slug) {
      const tenantPath = `/showcase/${slug}${path}`;
      return currentPath === tenantPath;
    }
    return currentPath === path;
  };

  const displayName = tenantName || platformConfig.platformName || "BeautyFlow";
  const displayLogo = tenantLogo || platformConfig.logoUrl;
  const displayColor = tenantColor || platformConfig.primaryColor || "#ec4899";

  const handleLogout = () => {
    logout();
  };

  const ThemeIcon = () => {
    if (isLight) return <Sun className="h-4 w-4" />;
    if (isDark) return <Moon className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const homeLink = tenantSlug || activeTenant?.slug 
    ? `/showcase/${tenantSlug || activeTenant?.slug}` 
    : "/";

  const hasTenant = !!(tenantSlug || activeTenant?.slug);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to={homeLink} className="flex items-center gap-2 shrink-0">
          {displayLogo ? (
            <img
              src={displayLogo}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover border-2"
              style={{ borderColor: displayColor }}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Scissors className="h-4 w-4 text-white" />
            </div>
          )}
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: displayColor }}
          >
            {displayName}
          </span>
        </Link>

        {/* Navigation Desktop */}
        <div className="hidden lg:flex lg:items-center lg:gap-6">
          {navLinks.map((link) => {
            const linkTo = hasTenant ? getTenantLink(link.path) : link.path;
            const isLinkActive = isActive(link.path);
            
            return (
              <Link
                key={link.path}
                to={linkTo}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isLinkActive ? "text-primary" : "text-muted-foreground"
                }`}
                style={{ color: isLinkActive ? displayColor : undefined }}
              >
                {link.name === "Promotions" ? (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Promotions
                  </span>
                ) : (
                  link.name
                )}
              </Link>
            );
          })}

          {/* Menu déroulant Écran public */}
          <DropdownMenu open={publicMenuOpen} onOpenChange={setPublicMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 text-sm font-medium ${
                  location.pathname === "/public-display" ||
                  location.pathname === "/gallery" ||
                  location.pathname.includes("/gallery")
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                style={{ 
                  color: (location.pathname === "/public-display" || 
                          location.pathname === "/gallery" ||
                          location.pathname.includes("/gallery")) 
                    ? displayColor 
                    : undefined 
                }}
              >
                <Tv className="h-4 w-4" />
                <span>Public</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${publicMenuOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44 p-1">
              <DropdownMenuItem asChild>
                <Link
                  to="/public-display"
                  className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 hover:bg-muted rounded-md"
                  onClick={() => setPublicMenuOpen(false)}
                >
                  <Tv className="h-4 w-4 text-emerald-500" />
                  <span>Écran public</span>
                  <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                    LIVE
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to={hasTenant ? getTenantLink("/gallery") : "/gallery"}
                  className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 hover:bg-muted rounded-md"
                  onClick={() => setPublicMenuOpen(false)}
                >
                  <span>🖼️</span>
                  <span>Galerie</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bouton de thème */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                aria-label="Changer le thème"
              >
                <ThemeIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={setLightTheme}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <span>Clair</span>
                </div>
                {isLight && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={setDarkTheme}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>Sombre</span>
                </div>
                {isDark && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={setSystemTheme}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span>Système</span>
                </div>
                {isSystem && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Boutons droite */}
          <div className="flex items-center gap-2 ml-2">
            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost" size="sm" className="h-8 px-3">
                  <Link
                    to={
                      userRole === "super_admin"
                        ? "/super-admin/dashboard"
                        : userRole === "admin"
                        ? "/admin/dashboard"
                        : "/employee/dashboard"
                    }
                  >
                    <User className="h-4 w-4 mr-1" />
                    <span className="text-xs">Dashboard</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="h-8 px-3">
                  <Link to="/auth/login">Connexion</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-8 px-4 text-white"
                  style={{ backgroundColor: displayColor }}
                >
                  <Link to="/auth/signup">Inscription</Link>
                </Button>
              </>
            )}
          </div>

          {/* Bouton Réserver */}
          <Button
            asChild
            size="sm"
            className="h-8 px-4 text-white shadow-sm hover:shadow-md transition-all"
            style={{ backgroundColor: displayColor }}
          >
            <Link to={getBookingLink()}>
              <Calendar className="h-4 w-4 mr-1.5" />
              Réserver
            </Link>
          </Button>
        </div>

        {/* Menu mobile toggle */}
        <button
          className="lg:hidden p-2 -mr-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </nav>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-background px-4 py-4">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const linkTo = hasTenant ? getTenantLink(link.path) : link.path;
              const isLinkActive = isActive(link.path);
              
              return (
                <Link
                  key={link.path}
                  to={linkTo}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isLinkActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  style={{ color: isLinkActive ? displayColor : undefined }}
                >
                  {link.name === "Promotions" ? (
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Promotions
                    </span>
                  ) : (
                    link.name
                  )}
                </Link>
              );
            })}

            {/* Écran public - Mobile */}
            <div className="border border-emerald-200 rounded-lg overflow-hidden mt-1">
              <div className="bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 flex items-center gap-2">
                <Tv className="h-4 w-4" />
                <span>Écran public</span>
              </div>
              <div className="bg-white divide-y divide-gray-100">
                <Link
                  to="/public-display"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50"
                >
                  <Tv className="h-4 w-4" />
                  Voir l'écran
                  <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full ml-auto">
                    LIVE
                  </span>
                </Link>
                <Link
                  to={hasTenant ? getTenantLink("/gallery") : "/gallery"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <span>🖼️</span>
                  Galerie
                </Link>
              </div>
            </div>

            {/* Thème dans le menu mobile */}
            <div className="border-t pt-3 mt-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="text-sm text-muted-foreground">Thème :</span>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    variant={isLight ? "default" : "outline"}
                    onClick={setLightTheme}
                    className="h-7 px-2.5 text-xs"
                  >
                    <Sun className="h-3 w-3 mr-1" /> Clair
                  </Button>
                  <Button
                    size="sm"
                    variant={isDark ? "default" : "outline"}
                    onClick={setDarkTheme}
                    className="h-7 px-2.5 text-xs"
                  >
                    <Moon className="h-3 w-3 mr-1" /> Sombre
                  </Button>
                  <Button
                    size="sm"
                    variant={isSystem ? "default" : "outline"}
                    onClick={setSystemTheme}
                    className="h-7 px-2.5 text-xs"
                  >
                    <Monitor className="h-3 w-3 mr-1" /> Système
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-3 mt-1 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={
                      userRole === "super_admin"
                        ? "/super-admin/dashboard"
                        : userRole === "admin"
                        ? "/admin/dashboard"
                        : "/employee/dashboard"
                    }
                    className="block rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted"
                  >
                    <User className="h-4 w-4 inline mr-2" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left rounded-lg px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 inline mr-2" />
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="block rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/auth/signup"
                    className="block rounded-lg px-4 py-2.5 text-sm text-white text-center"
                    style={{ backgroundColor: displayColor }}
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>

            {/* Bouton Réserver */}
            <Button
              asChild
              className="w-full mt-2 text-white"
              style={{ backgroundColor: displayColor }}
            >
              <Link
                to={getBookingLink()}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Réserver
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}