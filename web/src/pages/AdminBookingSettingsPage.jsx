import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from '@/lib/supabase';
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
import { Switch } from "@/components/ui/switch.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Globe, Save, Clock, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function AdminBookingSettingsPage() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    booking_buffer_minutes: 15,
    booking_advance_days: 30,
    online_payment_required: false,
    allow_online_booking: true,
    booking_start_hour: 9,
    booking_end_hour: 18,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          booking_buffer_minutes: data.booking_buffer_minutes || 15,
          booking_advance_days: data.booking_advance_days || 30,
          online_payment_required: data.online_payment_required || false,
          allow_online_booking: data.allow_online_booking !== false,
          booking_start_hour: data.booking_start_hour || 9,
          booking_end_hour: data.booking_end_hour || 18,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { error } = await supabase.from("tenant_settings").upsert({
        tenant_id: tenantId,
        booking_buffer_minutes: settings.booking_buffer_minutes,
        booking_advance_days: settings.booking_advance_days,
        online_payment_required: settings.online_payment_required,
        allow_online_booking: settings.allow_online_booking,
        booking_start_hour: settings.booking_start_hour,
        booking_end_hour: settings.booking_end_hour,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("Paramètres sauvegardés");
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
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Réservation en ligne</h1>
          <p className="text-muted-foreground mt-1">
            Paramètres de réservation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration de la réservation</CardTitle>
            <CardDescription>
              Personnalisez les options de réservation en ligne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">
                  Activer la réservation en ligne
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permettre aux clients de réserver en ligne
                </p>
              </div>
              <Switch
                checked={settings.allow_online_booking}
                onCheckedChange={(c) =>
                  setSettings({ ...settings, allow_online_booking: c })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Heure de début (min)</Label>
                <Input
                  type="number"
                  value={settings.booking_start_hour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      booking_start_hour: parseInt(e.target.value),
                    })
                  }
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Heure à laquelle les rendez-vous commencent
                </p>
              </div>
              <div className="space-y-2">
                <Label>Heure de fin (max)</Label>
                <Input
                  type="number"
                  value={settings.booking_end_hour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      booking_end_hour: parseInt(e.target.value),
                    })
                  }
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Heure à laquelle les rendez-vous se terminent
                </p>
              </div>
              <div className="space-y-2">
                <Label>Temps de battement (minutes)</Label>
                <Input
                  type="number"
                  value={settings.booking_buffer_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      booking_buffer_minutes: parseInt(e.target.value),
                    })
                  }
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Temps libre après chaque rendez-vous
                </p>
              </div>
              <div className="space-y-2">
                <Label>Réservation anticipée (jours)</Label>
                <Input
                  type="number"
                  value={settings.booking_advance_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      booking_advance_days: parseInt(e.target.value),
                    })
                  }
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Jours maximum à l'avance
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">
                  Paiement en ligne obligatoire
                </Label>
                <p className="text-sm text-muted-foreground">
                  Forcer le paiement à la réservation
                </p>
              </div>
              <Switch
                checked={settings.online_payment_required}
                onCheckedChange={(c) =>
                  setSettings({ ...settings, online_payment_required: c })
                }
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Enregistrer les paramètres"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
