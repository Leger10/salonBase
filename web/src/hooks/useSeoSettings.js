// /src/hooks/useSeoSettings.js
import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';

export function useSeoSettings() {
  const [seoSettings, setSeoSettings] = useState({
    meta_title: "BeautyFlow - Plateforme de gestion de salons de beauté",
    meta_description: "La plateforme complète pour gérer votre salon de beauté, réserver des rendez-vous et fidéliser vos clients.",
    meta_keywords: "beauté, salon, gestion, rendez-vous, fidélité, bien-être",
    og_title: "BeautyFlow",
    og_description: "Plateforme de gestion de salons de beauté",
    og_image: "",
    twitter_card: "summary_large_image",
    twitter_title: "BeautyFlow",
    twitter_description: "Plateforme de gestion de salons de beauté",
    twitter_image: "",
  });
  const [branding, setBranding] = useState({
    logo_url: "",
    favicon_url: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("seo, branding")
        .eq("id", 1)
        .single();

      if (error) throw error;

      if (data) {
        if (data.seo) {
          setSeoSettings(prev => ({ ...prev, ...data.seo }));
        }
        if (data.branding) {
          setBranding(data.branding);
        }
      }
    } catch (error) {
      console.error("Error fetching SEO settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeoMeta = () => ({
    title: seoSettings.meta_title,
    description: seoSettings.meta_description,
    keywords: seoSettings.meta_keywords,
    ogTitle: seoSettings.og_title || seoSettings.meta_title,
    ogDescription: seoSettings.og_description || seoSettings.meta_description,
    ogImage: seoSettings.og_image || branding.logo_url || "/og-image.jpg",
    twitterCard: seoSettings.twitter_card || "summary_large_image",
    twitterTitle: seoSettings.twitter_title || seoSettings.meta_title,
    twitterDescription: seoSettings.twitter_description || seoSettings.meta_description,
    twitterImage: seoSettings.twitter_image || branding.logo_url || "/twitter-image.jpg",
    favicon: branding.favicon_url,
  });

  return { seoSettings, branding, loading, getSeoMeta };
}