import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/layouts/DashboardLayout.jsx";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import {
  Store,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  Share2,
  Bell,
  Settings,
  Save,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
} from "lucide-react";

export default function SalonSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const tenantId = currentUser?.profile?.tenant_id;
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (error) throw error;

        setSettings({
          id: data.id,
          name: data.name || "",
          slug: data.slug || "",
          logo: data.logo || "",
          primary_color: data.primary_color || "#ec4899",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          description: data.description || "",
          subscription_plan: data.subscription_plan || "starter",
          subscription_status: data.subscription_status || "inactive",
          social_media: {
            facebook: data.facebook_url || "",
            instagram: data.instagram_url || "",
            tiktok: data.tiktok_url || "",
            linkedin: data.linkedin_url || "",
          },
          opening_hours: data.opening_hours || {
            monday: { open: "09:00", close: "18:00", closed: false },
            tuesday: { open: "09:00", close: "18:00", closed: false },
            wednesday: { open: "09:00", close: "18:00", closed: false },
            thursday: { open: "09:00", close: "18:00", closed: false },
            friday: { open: "09:00", close: "18:00", closed: false },
            saturday: { open: "09:00", close: "17:00", closed: false },
            sunday: { open: "00:00", close: "00:00", closed: true },
          },
          cancellation_policy:
            data.cancellation_policy ||
            "Les annulations doivent être faites au moins 24h à l'avance.",
          refund_policy:
            data.refund_policy ||
            "Les remboursements sont effectués sous 7 jours ouvrés.",
          language: data.language || "fr",
          timezone: data.timezone || "Europe/Paris",
        });
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Erreur lors du chargement des paramètres");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [currentUser]);

  const handleChange = (field, value, category = null) => {
    setSettings((prev) => {
      if (category) {
        return { ...prev, [category]: { ...prev[category], [field]: value } };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSave = async () => {
    if (!settings?.id) return;
    setSaving(true);

    try {
      const updateData = {
        name: settings.name,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        description: settings.description,
        facebook_url: settings.social_media?.facebook,
        instagram_url: settings.social_media?.instagram,
        tiktok_url: settings.social_media?.tiktok,
        linkedin_url: settings.social_media?.linkedin,
        opening_hours: settings.opening_hours,
        cancellation_policy: settings.cancellation_policy,
        refund_policy: settings.refund_policy,
        language: settings.language,
        timezone: settings.timezone,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("tenants")
        .update(updateData)
        .eq("id", settings.id);

      if (error) throw error;

      toast.success("Paramètres sauvegardés avec succès");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">
          Aucun paramètre trouvé.
        </div>
      </DashboardLayout>
    );
  }

  const daysOfWeek = [
    { key: "monday", label: "Lundi" },
    { key: "tuesday", label: "Mardi" },
    { key: "wednesday", label: "Mercredi" },
    { key: "thursday", label: "Jeudi" },
    { key: "friday", label: "Vendredi" },
    { key: "saturday", label: "Samedi" },
    { key: "sunday", label: "Dimanche" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Paramètres du Salon
            </h1>
            <p className="text-muted-foreground mt-1">
              Configurez les informations et préférences de votre établissement.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="px-8 gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </div>

        <Tabs defaultValue="infos" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto bg-card border rounded-xl p-1 gap-1 mb-6">
            <TabsTrigger
              value="infos"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Store className="w-4 h-4 mr-2" /> Infos
            </TabsTrigger>
            <TabsTrigger
              value="horaires"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Clock className="w-4 h-4 mr-2" /> Horaires
            </TabsTrigger>
            <TabsTrigger
              value="politiques"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ShieldCheck className="w-4 h-4 mr-2" /> Politiques
            </TabsTrigger>
            <TabsTrigger
              value="galerie"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ImageIcon className="w-4 h-4 mr-2" /> Galerie
            </TabsTrigger>
            <TabsTrigger
              value="social"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Share2 className="w-4 h-4 mr-2" /> Réseaux
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Bell className="w-4 h-4 mr-2" /> Notifications
            </TabsTrigger>
            <TabsTrigger
              value="systeme"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="w-4 h-4 mr-2" /> Système
            </TabsTrigger>
          </TabsList>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Informations Générales */}
            <TabsContent value="infos" className="m-0">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Informations Générales</CardTitle>
                  <CardDescription>
                    Les détails publics de votre salon.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Nom du Salon *</Label>
                      <Input
                        value={settings.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email de Contact</Label>
                      <Input
                        type="email"
                        value={settings.email || ""}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={settings.description || ""}
                        onChange={(e) =>
                          handleChange("description", e.target.value)
                        }
                        rows={3}
                        className="bg-background"
                        placeholder="Décrivez votre salon, vos spécialités, votre équipe..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input
                        value={settings.phone || ""}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Adresse</Label>
                      <Input
                        value={settings.address || ""}
                        onChange={(e) =>
                          handleChange("address", e.target.value)
                        }
                        className="bg-background"
                        placeholder="Adresse complète du salon"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Horaires */}
            <TabsContent value="horaires" className="m-0">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Horaires d'ouverture</CardTitle>
                  <CardDescription>
                    Définissez les horaires de votre salon.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {daysOfWeek.map((day) => (
                    <div
                      key={day.key}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-28 font-medium">{day.label}</div>
                      <div className="flex-1 flex items-center gap-3">
                        <Switch
                          checked={!settings.opening_hours?.[day.key]?.closed}
                          onCheckedChange={(checked) => {
                            const newHours = { ...settings.opening_hours };
                            newHours[day.key] = {
                              ...newHours[day.key],
                              closed: !checked,
                            };
                            handleChange("opening_hours", newHours);
                          }}
                        />
                        {!settings.opening_hours?.[day.key]?.closed ? (
                          <>
                            <Input
                              type="time"
                              value={
                                settings.opening_hours?.[day.key]?.open ||
                                "09:00"
                              }
                              onChange={(e) => {
                                const newHours = { ...settings.opening_hours };
                                newHours[day.key] = {
                                  ...newHours[day.key],
                                  open: e.target.value,
                                };
                                handleChange("opening_hours", newHours);
                              }}
                              className="w-32 bg-background"
                            />
                            <span>à</span>
                            <Input
                              type="time"
                              value={
                                settings.opening_hours?.[day.key]?.close ||
                                "18:00"
                              }
                              onChange={(e) => {
                                const newHours = { ...settings.opening_hours };
                                newHours[day.key] = {
                                  ...newHours[day.key],
                                  close: e.target.value,
                                };
                                handleChange("opening_hours", newHours);
                              }}
                              className="w-32 bg-background"
                            />
                          </>
                        ) : (
                          <span className="text-muted-foreground">Fermé</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Politiques */}
            <TabsContent value="politiques" className="m-0">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Politiques du Salon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Politique d'annulation</Label>
                    <Textarea
                      value={settings.cancellation_policy || ""}
                      onChange={(e) =>
                        handleChange("cancellation_policy", e.target.value)
                      }
                      rows={4}
                      className="bg-background"
                      placeholder="Ex: Les annulations doivent être faites 24h à l'avance..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Politique de remboursement</Label>
                    <Textarea
                      value={settings.refund_policy || ""}
                      onChange={(e) =>
                        handleChange("refund_policy", e.target.value)
                      }
                      rows={4}
                      className="bg-background"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Réseaux Sociaux */}
            <TabsContent value="social" className="m-0">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Réseaux Sociaux</CardTitle>
                  <CardDescription>
                    Connectez vos profils sociaux.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                    </Label>
                    <Input
                      value={settings.social_media?.facebook || ""}
                      onChange={(e) =>
                        handleChange("facebook", e.target.value, "social_media")
                      }
                      placeholder="https://facebook.com/votre-page"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-600" /> Instagram
                    </Label>
                    <Input
                      value={settings.social_media?.instagram || ""}
                      onChange={(e) =>
                        handleChange(
                          "instagram",
                          e.target.value,
                          "social_media",
                        )
                      }
                      placeholder="https://instagram.com/votre-compte"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
                    </Label>
                    <Input
                      value={settings.social_media?.linkedin || ""}
                      onChange={(e) =>
                        handleChange("linkedin", e.target.value, "social_media")
                      }
                      placeholder="https://linkedin.com/company/votre-salon"
                      className="bg-background"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Paramètres Système */}
            <TabsContent value="systeme" className="m-0">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Paramètres Système</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 max-w-xl">
                  <div className="space-y-2">
                    <Label>Langue par défaut</Label>
                    <Select
                      value={settings.language || "fr"}
                      onValueChange={(v) => handleChange("language", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuseau horaire</Label>
                    <Select
                      value={settings.timezone || "Europe/Paris"}
                      onValueChange={(v) => handleChange("timezone", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Paris">
                          Europe/Paris (UTC+1/2)
                        </SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Galerie (placeholder) */}
            <TabsContent value="galerie" className="m-0">
              <Card className="border-none shadow-md text-center py-16">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <CardTitle className="text-xl">
                  Galerie (En construction)
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  La gestion avancée des médias arrivera bientôt.
                </p>
              </Card>
            </TabsContent>

            {/* Notifications (placeholder) */}
            <TabsContent value="notifications" className="m-0">
              <Card className="border-none shadow-md text-center py-16">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <CardTitle className="text-xl">
                  Notifications (En construction)
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  La configuration des notifications arrivera bientôt.
                </p>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
