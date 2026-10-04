// /src/pages/MarketingPage.jsx
import React, { useState, useEffect } from "react";
// ❌ SUPPRIMER CET IMPORT
// import DashboardLayout from "@/layouts/DashboardLayout.jsx";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Mail,
  MessageSquare,
  Send,
  CalendarPlus,
  BarChart,
  Users,
  Target,
  TrendingUp,
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState(false);
  const [clientsCount, setClientsCount] = useState(0);
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    title: "",
    subject: "",
    content: "",
    scheduled_date: "",
    recipient_type: "all_clients",
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Récupérer les campagnes marketing
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Récupérer le nombre de clients
      const { count, error: countError } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      if (!countError) setClientsCount(count || 0);

      setCampaigns(data || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      toast.error("Erreur de chargement des campagnes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchCampaigns();
    }
  }, [currentUser]);

  const handleSendEmail = async (e) => {
    e.preventDefault();

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Configuration du salon non trouvée");
        return;
      }

      const campaignData = {
        tenant_id: tenantId,
        name: form.title,
        type: "email",
        content: JSON.stringify({
          subject: form.subject,
          body: form.content,
          recipient_type: form.recipient_type,
        }),
        sent_at: form.scheduled_date ? null : new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("marketing_campaigns")
        .insert([campaignData]);

      if (error) throw error;

      toast.success(
        form.scheduled_date
          ? "Campagne programmée avec succès"
          : "Campagne envoyée avec succès",
      );
      setEmailModal(false);
      setForm({
        title: "",
        subject: "",
        content: "",
        scheduled_date: "",
        recipient_type: "all_clients",
      });
      fetchCampaigns();
    } catch (err) {
      console.error("Error sending campaign:", err);
      toast.error(err.message || "Erreur lors de l'envoi");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
  };

  const getStatusBadge = (campaign) => {
    if (campaign.sent_at) {
      return <Badge className="bg-green-100 text-green-800">Envoyé</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Programmé</Badge>;
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Engagez vos clients avec des campagnes ciblées.
          </p>
        </div>
        <Button onClick={() => setEmailModal(true)} className="gap-2">
          <Mail className="w-4 h-4" /> Nouvelle Campagne Email
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Base clients</p>
                <p className="text-2xl font-bold">{clientsCount}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Campagnes totales
                </p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Taux d'ouverture moyen
                </p>
                <p className="text-2xl font-bold">64%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="emails" className="w-full">
        <TabsList className="w-full flex justify-start h-auto bg-card border rounded-xl p-1 gap-1 mb-6">
          <TabsTrigger
            value="emails"
            className="flex-1 max-w-[200px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Emails
          </TabsTrigger>
          <TabsTrigger
            value="sms"
            className="flex-1 max-w-[200px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            SMS
          </TabsTrigger>
          <TabsTrigger
            value="automations"
            className="flex-1 max-w-[200px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Automatisations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emails" className="m-0">
          <Card className="dashboard-card border-none shadow-md">
            <CardHeader>
              <CardTitle>Historique des campagnes</CardTitle>
              <CardDescription>
                Liste de vos campagnes emails envoyées et programmées
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                  <p className="text-muted-foreground">Aucune campagne</p>
                  <Button variant="link" onClick={() => setEmailModal(true)}>
                    Créer votre première campagne
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="pl-6">Campagne</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date d'envoi</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead className="text-right pr-6">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium pl-6">
                            {c.name}
                          </TableCell>
                          <TableCell className="capitalize">
                            {c.type}
                          </TableCell>
                          <TableCell>
                            {c.sent_at
                              ? formatDate(c.sent_at)
                              : formatDate(c.created_at)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(c)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="sm">
                              <BarChart className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="m-0">
          <Card className="dashboard-card border-none shadow-md">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h2 className="text-xl font-bold">Campagnes SMS</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Activez un pack SMS dans vos paramètres pour utiliser cette
                fonctionnalité.
              </p>
              <Button variant="outline" className="mt-6">
                Configurer les SMS
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="m-0">
          <Card className="dashboard-card border-none shadow-md">
            <CardContent className="py-12 text-center">
              <CalendarPlus className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h2 className="text-xl font-bold">Automatisations</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Relances, anniversaires et rappels automatiques. Bientôt
                disponible.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Nouvelle Campagne */}
      <Dialog open={emailModal} onOpenChange={setEmailModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une campagne Email</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la campagne</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Promo Été 2026"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Destinataires</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={form.recipient_type}
                onChange={(e) =>
                  setForm({ ...form, recipient_type: e.target.value })
                }
              >
                <option value="all_clients">Tous les clients</option>
                <option value="active_clients">Clients actifs</option>
                <option value="inactive_clients">Clients inactifs</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Environ {clientsCount} clients recevront cet email
              </p>
            </div>

            <div className="space-y-2">
              <Label>Objet de l'email</Label>
              <Input
                required
                value={form.subject}
                onChange={(e) =>
                  setForm({ ...form, subject: e.target.value })
                }
                placeholder="Découvrez nos offres exceptionnelles..."
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Contenu de l'email</Label>
              <Textarea
                required
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                rows={6}
                className="bg-background font-mono text-sm"
                placeholder="Votre message ici..."
              />
            </div>

            <div className="space-y-2">
              <Label>Date d'envoi (optionnel)</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_date}
                onChange={(e) =>
                  setForm({ ...form, scheduled_date: e.target.value })
                }
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour un envoi immédiat
              </p>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailModal(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                <Send className="w-4 h-4 mr-2" />
                {form.scheduled_date ? "Programmer" : "Envoyer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}