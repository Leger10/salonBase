// /src/components/PublicFooter.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Scissors,
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin,
  Clock,
  Youtube,
  Linkedin,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useActiveTenant } from "@/contexts/ActiveTenantContext";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, currentUser } = useAuth();

  const activeContext = useActiveTenant();
  const platformConfig = usePlatformConfig();

  const { activeTenant, isShowcase } = activeContext || {
    activeTenant: null,
    isShowcase: false,
    getShowcaseLink: (path) => path,
  };

  const userRole = currentUser?.profile?.role || currentUser?.role;
  const isAdmin =
    isAuthenticated && (userRole === "admin" || userRole === "employee");

  const [tenantData, setTenantData] = useState(null);
  const [footerSettings, setFooterSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Récupérer les infos du tenant et les settings du footer
  useEffect(() => {
    const fetchFooterData = async () => {
      setLoading(true);
      try {
        // 1. Priorité au tenant actif (showcase)
        if (isShowcase && activeTenant) {
          // Récupérer les settings du tenant pour le footer
          const { data: settingsData, error: settingsError } = await supabase
            .from("tenant_home_settings")
            .select("*")
            .eq("tenant_id", activeTenant.id)
            .maybeSingle();

          if (settingsError && settingsError.code !== "PGRST116") {
            console.error("❌ Erreur settings showcase:", settingsError);
          }

          setTenantData(activeTenant);
          setFooterSettings(settingsData);
          setLoading(false);
          return;
        }

        // 2. Si l'utilisateur est admin/employee, récupérer son tenant
        if (isAdmin && currentUser?.profile?.tenant_id) {
          const tenantId = currentUser.profile.tenant_id;

          // Récupérer les settings du tenant
          const { data: settingsData, error: settingsError } = await supabase
            .from("tenant_home_settings")
            .select("*")
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (settingsError && settingsError.code !== "PGRST116") {
            console.error("❌ Erreur settings:", settingsError);
          }

          // Récupérer les infos du tenant
          const { data: tenant, error: tenantError } = await supabase
            .from("tenants")
            .select(
              "id, name, slug, logo_url, address, phone, email, description, primary_color",
            )
            .eq("id", tenantId)
            .single();

          if (!tenantError && tenant) {
            setTenantData(tenant);
            setFooterSettings(settingsData);
            setLoading(false);
            return;
          }
        }

        // 3. Fallback sur platformConfig
        setTenantData({
          name: platformConfig.platformName || "BeautyFlow",
          address: platformConfig.address || "Ouagadougou, Burkina Faso",
          phone: platformConfig.contactPhone || "+226 54 32 92 99",
          email: platformConfig.contactEmail || "contact@beautyflow.com",
          description:
            platformConfig.platformDescription ||
            "Plateforme de gestion de salons de beauté.",
          logo_url: platformConfig.logoUrl || null,
          primary_color: platformConfig.primaryColor || "#ec4899",
        });
        setFooterSettings(null);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching footer data:", error);
        setLoading(false);
      }
    };

    fetchFooterData();
  }, [isShowcase, activeTenant, isAdmin, currentUser, platformConfig]);

  // ✅ Combiner les données
  const getFooterData = () => {
    const defaultData = {
      name: tenantData?.name || platformConfig.platformName || "BeautyFlow",
      address:
        tenantData?.address ||
        platformConfig.address ||
        "Adresse non renseignée",
      phone:
        tenantData?.phone ||
        platformConfig.contactPhone ||
        "Téléphone non renseigné",
      email:
        tenantData?.email ||
        platformConfig.contactEmail ||
        "Email non renseigné",
      description:
        tenantData?.description ||
        platformConfig.platformDescription ||
        "Votre salon de beauté et bien-être.",
      logo_url: tenantData?.logo_url || platformConfig.logoUrl || null,
      primary_color:
        tenantData?.primary_color || platformConfig.primaryColor || "#ec4899",
    };

    // Si on a des settings, on les utilise en priorité
    if (footerSettings) {
      return {
        name: tenantData?.name || defaultData.name,
        address: footerSettings.footer_address || defaultData.address,
        phone: footerSettings.footer_phone || defaultData.phone,
        email: footerSettings.footer_email || defaultData.email,
        description:
          footerSettings.footer_description || defaultData.description,
        logo_url: tenantData?.logo_url || defaultData.logo_url,
        primary_color:
          footerSettings.hero_background_color || defaultData.primary_color,
        social: {
          facebook: footerSettings.footer_social_facebook || "",
          instagram: footerSettings.footer_social_instagram || "",
          twitter: footerSettings.footer_social_twitter || "",
          linkedin: footerSettings.footer_social_linkedin || "",
          youtube: footerSettings.footer_social_youtube || "",
          tiktok: footerSettings.footer_social_tiktok || "",
        },
        hours: {
          monday: footerSettings.footer_hours_monday || "09:00 - 19:00",
          tuesday: footerSettings.footer_hours_tuesday || "09:00 - 19:00",
          wednesday: footerSettings.footer_hours_wednesday || "09:00 - 19:00",
          thursday: footerSettings.footer_hours_thursday || "09:00 - 19:00",
          friday: footerSettings.footer_hours_friday || "09:00 - 19:00",
          saturday: footerSettings.footer_hours_saturday || "09:00 - 17:00",
          sunday: footerSettings.footer_hours_sunday || "Fermé",
        },
        copyright:
          footerSettings.footer_copyright || tenantData?.name || "BeautyFlow",
        show_social: footerSettings.footer_show_social !== false,
      };
    }

    // Fallback sans settings
    return {
      ...defaultData,
      social: {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        youtube: "",
        tiktok: "",
      },
      hours: {
        monday: "09:00 - 19:00",
        tuesday: "09:00 - 19:00",
        wednesday: "09:00 - 19:00",
        thursday: "09:00 - 19:00",
        friday: "09:00 - 19:00",
        saturday: "09:00 - 17:00",
        sunday: "Fermé",
      },
      copyright: tenantData?.name || "BeautyFlow",
      show_social: true,
    };
  };

  const footerData = getFooterData();

  const getLinkPath = (path) => {
    if (isShowcase && activeTenant) {
      return `/showcase/${activeTenant.slug}${path}`;
    }
    if (isAdmin && tenantData?.slug) {
      return `/showcase/${tenantData.slug}${path}`;
    }
    return path;
  };

  const footerLinks =
    isShowcase || isAdmin
      ? [
          { name: "Services", path: "/services" },
          { name: "Équipe", path: "/team" },
          { name: "Galerie", path: "/gallery" },
          { name: "Contact", path: "/contact" },
        ]
      : [
          { name: "Services", path: "/services" },
          { name: "Tarifs", path: "/pricing" },
          { name: "Équipe", path: "/team" },
          { name: "Galerie", path: "/gallery" },
          { name: "Avis Clients", path: "/reviews" },
          { name: "Réserver", path: "/booking" },
        ];

  // Liste des réseaux sociaux avec leurs icônes
  const socialLinks = [
    { key: "facebook", icon: Facebook, url: footerData.social?.facebook },
    { key: "instagram", icon: Instagram, url: footerData.social?.instagram },
    { key: "twitter", icon: Twitter, url: footerData.social?.twitter },
    { key: "linkedin", icon: Linkedin, url: footerData.social?.linkedin },
    { key: "youtube", icon: Youtube, url: footerData.social?.youtube },
    { key: "tiktok", icon: SiTiktok, url: footerData.social?.tiktok },
  ];

  const days = [
    { key: "monday", label: "Lundi" },
    { key: "tuesday", label: "Mardi" },
    { key: "wednesday", label: "Mercredi" },
    { key: "thursday", label: "Jeudi" },
    { key: "friday", label: "Vendredi" },
    { key: "saturday", label: "Samedi" },
    { key: "sunday", label: "Dimanche" },
  ];

  // Vérifier si les horaires sont personnalisés
  const hasCustomHours = days.some((day) => {
    const hour = footerData.hours?.[day.key];
    return hour && hour !== "09:00 - 19:00" && hour !== "Fermé";
  });

  // Vérifier si des réseaux sociaux sont renseignés
  const hasSocialLinks = socialLinks.some((s) => s.url && s.url.trim() !== "");

  if (loading) {
    return (
      <footer className="border-t bg-muted/30 animate-pulse">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t bg-muted/30 text-muted-foreground">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {footerData.logo_url ? (
                <img
                  src={footerData.logo_url}
                  alt={footerData.name}
                  className="h-10 w-10 rounded-xl object-cover border-2"
                  style={{ borderColor: footerData.primary_color }}
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: footerData.primary_color }}
                >
                  <Scissors className="h-5 w-5" />
                </div>
              )}
              <span className="text-xl font-bold text-foreground">
                {footerData.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{footerData.description}</p>
          </div>

          {/* Liens Rapides */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              Liens Rapides
            </h3>
            <ul className="space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={getLinkPath(link.path)}
                    className="hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              {footerData.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{footerData.address}</span>
                </li>
              )}
              {footerData.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${footerData.phone}`}
                    className="hover:text-primary transition-colors"
                  >
                    {footerData.phone}
                  </a>
                </li>
              )}
              {footerData.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`mailto:${footerData.email}`}
                    className="hover:text-primary transition-colors"
                  >
                    {footerData.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Horaires & Réseaux sociaux */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Horaires</h3>
            <div className="space-y-1 text-sm">
              {days.map((day) => {
                const hour = footerData.hours?.[day.key];
                if (hour) {
                  return (
                    <div key={day.key} className="flex justify-between">
                      <span>{day.label}</span>
                      <span className={hour === "Fermé" ? "text-red-500" : ""}>
                        {hour}
                      </span>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Réseaux sociaux - Utilise les données personnalisées */}
            {footerData.show_social !== false && hasSocialLinks && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Suivez-nous
                </h4>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map(
                    ({ key, icon: Icon, url }) =>
                      url &&
                      url.trim() !== "" && (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label={key}
                        >
                          <Icon className="h-5 w-5" />
                        </a>
                      ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm">
          <p>
            &copy; {currentYear} {footerData.copyright || footerData.name}. Tous
            droits réservés.
          </p>
          <div className="mt-2 flex justify-center gap-4 flex-wrap">
            <Link
              to="/privacy"
              className="hover:text-primary transition-colors"
            >
              Politique de Confidentialité
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Conditions Générales
            </Link>
            <Link
              to="/cookies"
              className="hover:text-primary transition-colors"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
