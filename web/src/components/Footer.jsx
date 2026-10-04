// /src/components/Footer.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useActiveTenant } from "@/contexts/ActiveTenantContext";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext";
import { useTenant } from "@/contexts/TenantContext.jsx";
import { supabase } from "@/lib/supabase";
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Clock,
  Scissors,
  Youtube,
} from "lucide-react";
// Import TikTok icon
import { SiTiktok } from "react-icons/si";

export default function Footer() {
  const { currentUser } = useAuth();
  const { activeTenant, isShowcase } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  const { tenantSettings } = useTenant();
  const [footerData, setFooterData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFooterData = async () => {
      setLoading(true);
      try {
        const tenantId = currentUser?.profile?.tenant_id;
        const role = currentUser?.profile?.role;

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

          setFooterData({
            name: activeTenant.name || "BeautyFlow",
            address:
              settingsData?.footer_address ||
              activeTenant.address ||
              "Adresse non renseignée",
            phone:
              settingsData?.footer_phone ||
              activeTenant.phone ||
              "Téléphone non renseigné",
            email:
              settingsData?.footer_email ||
              activeTenant.email ||
              "Email non renseigné",
            description:
              settingsData?.footer_description ||
              activeTenant.description ||
              "Votre salon de beauté et bien-être.",
            primary_color:
              settingsData?.hero_background_color ||
              activeTenant.primary_color ||
              "#ec4899",
            logo: activeTenant.logo_url || null,
            social: {
              facebook: settingsData?.footer_social_facebook || "",
              instagram: settingsData?.footer_social_instagram || "",
              twitter: settingsData?.footer_social_twitter || "",
              linkedin: settingsData?.footer_social_linkedin || "",
              youtube: settingsData?.footer_social_youtube || "",
              tiktok: settingsData?.footer_social_tiktok || "",
            },
            hours: {
              monday: settingsData?.footer_hours_monday || "09:00 - 19:00",
              tuesday: settingsData?.footer_hours_tuesday || "09:00 - 19:00",
              wednesday:
                settingsData?.footer_hours_wednesday || "09:00 - 19:00",
              thursday: settingsData?.footer_hours_thursday || "09:00 - 19:00",
              friday: settingsData?.footer_hours_friday || "09:00 - 19:00",
              saturday: settingsData?.footer_hours_saturday || "09:00 - 17:00",
              sunday: settingsData?.footer_hours_sunday || "Fermé",
            },
            copyright:
              settingsData?.footer_copyright ||
              activeTenant.name ||
              "BeautyFlow",
            show_social: settingsData?.footer_show_social !== false,
            isAdmin: false,
          });
          setLoading(false);
          return;
        }

        // 2. Si l'utilisateur est un admin avec un tenant_id
        if (tenantId && role === "admin") {
          // Récupérer les paramètres du salon depuis tenant_home_settings
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
            .select("*")
            .eq("id", tenantId)
            .single();

          if (tenantError) {
            console.error("❌ Erreur tenant:", tenantError);
          }

          // Log pour déboguer
          console.log("📊 Footer Settings Data:", settingsData);
          console.log("📊 Footer Tenant Data:", tenant);

          // Combiner les données (settings prioritaire)
          setFooterData({
            name: tenant?.name || "BeautyFlow",
            address:
              settingsData?.footer_address ||
              tenant?.address ||
              "Adresse non renseignée",
            phone:
              settingsData?.footer_phone ||
              tenant?.phone ||
              "Téléphone non renseigné",
            email:
              settingsData?.footer_email ||
              tenant?.email ||
              "Email non renseigné",
            description:
              settingsData?.footer_description ||
              tenant?.description ||
              "Votre salon de beauté et bien-être.",
            primary_color:
              settingsData?.hero_background_color ||
              tenant?.primary_color ||
              "#ec4899",
            logo: tenant?.logo_url || null,
            social: {
              facebook: settingsData?.footer_social_facebook || "",
              instagram: settingsData?.footer_social_instagram || "",
              twitter: settingsData?.footer_social_twitter || "",
              linkedin: settingsData?.footer_social_linkedin || "",
              youtube: settingsData?.footer_social_youtube || "",
              tiktok: settingsData?.footer_social_tiktok || "",
            },
            hours: {
              monday: settingsData?.footer_hours_monday || "09:00 - 19:00",
              tuesday: settingsData?.footer_hours_tuesday || "09:00 - 19:00",
              wednesday:
                settingsData?.footer_hours_wednesday || "09:00 - 19:00",
              thursday: settingsData?.footer_hours_thursday || "09:00 - 19:00",
              friday: settingsData?.footer_hours_friday || "09:00 - 19:00",
              saturday: settingsData?.footer_hours_saturday || "09:00 - 17:00",
              sunday: settingsData?.footer_hours_sunday || "Fermé",
            },
            copyright:
              settingsData?.footer_copyright || tenant?.name || "BeautyFlow",
            show_social: settingsData?.footer_show_social !== false,
            isAdmin: true,
          });

          setLoading(false);
          return;
        }

        // 3. Utilisateur non connecté ou super admin - Données platform
        const { data: platformData, error: platformError } = await supabase
          .from("platform_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        if (platformError && platformError.code !== "PGRST116") {
          console.error("❌ Erreur platform settings:", platformError);
        }

        const general = platformData?.general || {};
        const branding = platformData?.branding || {};

        setFooterData({
          name:
            general.platform_name ||
            platformConfig.platformName ||
            "BeautyFlow",
          address:
            general.address ||
            platformConfig.address ||
            "Ouagadougou, Burkina Faso",
          phone:
            general.contact_phone ||
            platformConfig.contactPhone ||
            "+226 54 32 92 99",
          email:
            general.contact_email ||
            platformConfig.contactEmail ||
            "contact@beautyflow.com",
          description:
            general.platform_description ||
            platformConfig.platformDescription ||
            "Plateforme de gestion de salons de beauté.",
          primary_color:
            branding.primary_color || platformConfig.primaryColor || "#ec4899",
          logo: branding.logo_url || platformConfig.logoUrl || null,
          social: {
            facebook: platformData?.social?.facebook || "",
            instagram: platformData?.social?.instagram || "",
            twitter: platformData?.social?.twitter || "",
            linkedin: platformData?.social?.linkedin || "",
            youtube: platformData?.social?.youtube || "",
            tiktok: platformData?.social?.tiktok || "",
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
          copyright: general.platform_name || "BeautyFlow",
          show_social: true,
          isAdmin: false,
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching footer data:", error);
        // Valeurs par défaut
        setFooterData({
          name: platformConfig.platformName || "BeautyFlow",
          address: platformConfig.address || "Ouagadougou, Burkina Faso",
          phone: platformConfig.contactPhone || "+226 54 32 92 99",
          email: platformConfig.contactEmail || "contact@beautyflow.com",
          description:
            platformConfig.platformDescription ||
            "Plateforme de gestion de salons de beauté.",
          primary_color: platformConfig.primaryColor || "#ec4899",
          logo: platformConfig.logoUrl || null,
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
          copyright: "BeautyFlow",
          show_social: true,
          isAdmin: false,
        });
        setLoading(false);
      }
    };

    fetchFooterData();
  }, [currentUser, activeTenant, isShowcase, platformConfig, tenantSettings]);

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

  if (!footerData) {
    return null;
  }

  const {
    name,
    address,
    phone,
    email,
    description,
    primary_color,
    logo,
    social,
    hours,
    copyright,
    show_social,
  } = footerData;

  // Liste des réseaux sociaux avec leurs icônes
  const socialLinks = [
    { key: "facebook", icon: Facebook, url: social.facebook },
    { key: "instagram", icon: Instagram, url: social.instagram },
    { key: "twitter", icon: Twitter, url: social.twitter },
    { key: "linkedin", icon: Linkedin, url: social.linkedin },
    { key: "youtube", icon: Youtube, url: social.youtube },
    { key: "tiktok", icon: SiTiktok, url: social.tiktok },
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

  // Filtrer les heures valides
  const hasValidHours = days.some(
    (day) => hours[day.key] && hours[day.key].trim() !== "",
  );

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logo ? (
                <img
                  src={logo}
                  alt={name}
                  className="h-10 w-10 rounded-xl object-cover border-2"
                  style={{ borderColor: primary_color }}
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: primary_color }}
                >
                  <Scissors className="h-5 w-5" />
                </div>
              )}
              <span className="text-xl font-bold text-foreground">{name}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              Liens Rapides
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/services"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Tarifs
                </Link>
              </li>
              <li>
                <Link
                  to="/team"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Notre Équipe
                </Link>
              </li>
              <li>
                <Link
                  to="/gallery"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Galerie
                </Link>
              </li>
              <li>
                <Link
                  to="/booking"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Réserver
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{address}</span>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${phone}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={`mailto:${email}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Horaires & Réseaux sociaux */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Horaires</h3>
            {hasValidHours && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {days.map((day) => {
                  const hour = hours[day.key];
                  return (
                    hour &&
                    hour.trim() !== "" && (
                      <div key={day.key} className="flex justify-between">
                        <span>{day.label}</span>
                        <span>{hour}</span>
                      </div>
                    )
                  );
                })}
              </div>
            )}

            {/* Réseaux sociaux */}
            {show_social &&
              socialLinks.some((s) => s.url && s.url.trim() !== "") && (
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

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {copyright}. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link
                to="/privacy"
                className="hover:text-primary transition-colors"
              >
                Politique de confidentialité
              </Link>
              <Link
                to="/terms"
                className="hover:text-primary transition-colors"
              >
                Conditions d'utilisation
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
      </div>
    </footer>
  );
}
