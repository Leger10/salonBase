// /src/pages/MarketingPage.jsx
import React, { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Mail,
  MessageSquare,
  Send,
  Users,
  Target,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";

const RECIPIENTS = [
  { value: "all_clients", label: "Tous les clients" },
  { value: "active_clients", label: "Clients actifs (visite récente)" },
  { value: "inactive_clients", label: "Clients inactifs (90 jours)" },
];

const MAX_BCC = 40;

function downloadCsv(filename, rows) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState(null);
  const { currentUser } = useAuth();

  const tenantId = currentUser?.profile?.tenant_id;
  const salonName = currentUser?.profile?.tenant_name || currentUser?.profile?.name || "Votre salon";

  const [form, setForm] = useState({
    title: "",
    subject: "",
    content: "",
    scheduled_date: "",
    recipient_type: "all_clients",
    type: "email",
  });

  const parseContent = (campaign) => {
    try {
      const parsed = JSON.parse(campaign.content || "{}");
      return {
        subject: parsed.subject || campaign.name,
        body: parsed.body || campaign.content || "",
        recipient_type: parsed.recipient_type || "all_clients",
      };
    } catch {
      return {
        subject: campaign.name,
        body: campaign.content || "",
        recipient_type: "all_clients",
      };
    }
  };

  const fetchAll = async () => {
    if (!tenantId) {
      setCampaigns([]);
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [campaignRes, clientsRes] = await Promise.all([
        supabase
          .from("marketing_campaigns")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("id, name, email, phone, total_visits, last_visit, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
      ]);

      if (campaignRes.error) throw campaignRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setCampaigns(campaignRes.data || []);
      setClients(clientsRes.data || []);
    } catch (err) {
      console.error("Error fetching marketing data:", err);
      toast.error("Erreur de chargement des campagnes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [tenantId]);

  const isInactive = (client) => {
    if (!client.last_visit) return true;
    return differenceInCalendarDays(new Date(), new Date(client.last_visit)) > 90;
  };

  const recipientsFor = (type) => {
    if (type === "active_clients")
      return clients.filter((c) => !isInactive(c));
    if (type === "inactive_clients")
      return clients.filter((c) => isInactive(c));
    return clients;
  };

  const emailReady = useMemo(
    () => clients.filter((c) => c.email).length,
    [clients],
  );
  const phoneReady = useMemo(
    () => clients.filter((c) => c.phone).length,
    [clients],
  );
  const sentCount = campaigns.filter((c) => c.sent_at).length;
  const pendingCount = campaigns.length - sentCount;
  const sendRate = campaigns.length
    ? Math.round((sentCount / campaigns.length) * 100)
    : 0;

  const openCompose = (type) => {
    setForm({
      title: "",
      subject: "",
      content: "",
      scheduled_date: "",
      recipient_type: "all_clients",
      type,
    });
    setModalOpen(true);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    if (!tenantId) {
      toast.error("Configuration du salon non trouvée");
      return;
    }

    const immediate = !form.scheduled_date;
    const recipients = recipientsFor(form.recipient_type);

    if (recipients.length === 0) {
      toast.error("Aucun destinataire pour ce filtre");
      return;
    }

    setSending(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.title,
        type: form.type,
        content: JSON.stringify({
          subject: form.subject,
          body: form.content,
          recipient_type: form.recipient_type,
          recipient_count: recipients.length,
        }),
        sent_at: immediate ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("marketing_campaigns")
        .insert([payload]);

      if (error) throw error;

      setModalOpen(false);

      if (immediate) {
        if (form.type === "email") {
          deliverEmail({
            subject: form.subject,
            body: form.content,
            recipients,
          });
          toast.success(
            `Campagne ouverte dans votre messagerie (${recipients.filter((r) => r.email).length} destinataires)`,
          );
        } else {
          exportSms(form.title, recipients);
          toast.success("Campagne SMS créée et liste des numéros exportée");
        }
      } else {
        toast.success("Campagne programmée avec succès");
      }

      setForm({
        title: "",
        subject: "",
        content: "",
        scheduled_date: "",
        recipient_type: "all_clients",
        type: "email",
      });
      fetchAll();
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast.error(err.message || "Erreur lors de la campagne");
    } finally {
      setSending(false);
    }
  };

  const deliverEmail = ({ subject, body, recipients }) => {
    const emails = recipients
      .map((r) => r.email)
      .filter(Boolean)
      .slice(0, MAX_BCC);

    if (emails.length === 0) {
      toast.error("Aucune adresse email parmi les destinataires");
      return;
    }

    const params = new URLSearchParams();
    params.set("subject", subject);
    params.set("body", body);
    params.set("bcc", emails.join(","));

    const link = `mailto:?${params.toString()}`;
    const a = document.createElement("a");
    a.href = link;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (recipients.filter((r) => r.email).length > MAX_BCC) {
      toast.warning(
        `Seuls les ${MAX_BCC} premiers destinataires sont inclus : exportez la liste complète.`,
      );
    }
  };

  const exportSms = (name, recipients) => {
    const rows = [
      ["Nom", "Téléphone", "Message"],
      ...recipients
        .filter((r) => r.phone)
        .map((r) => [r.name, r.phone, form.content || ""]),
    ];
    if (rows.length === 1) {
      toast.error("Aucun numéro de téléphone parmi les destinataires");
      return;
    }
    downloadCsv(`sms-${name || "campagne"}.csv`, rows);
  };

  const handleSendNow = (campaign) => {
    const content = parseContent(campaign);
    const recipients = recipientsFor(content.recipient_type);

    if (campaign.type === "sms") {
      exportSms(campaign.name, recipients);
      toast.success("Liste des numéros exportée");
      return;
    }

    deliverEmail({
      subject: content.subject,
      body: content.body,
      recipients,
    });
  };

  const handleExportRecipients = (campaign) => {
    const content = parseContent(campaign);
    const recipients = recipientsFor(content.recipient_type);
    const rows = [["Nom", "Email", "Téléphone"]];
    recipients.forEach((r) => rows.push([r.name, r.email, r.phone]));
    downloadCsv(`destinataires-${campaign.name}.csv`, rows);
    toast.success("Destinataires exportés");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette campagne ?")) return;
    try {
      const { error } = await supabase
        .from("marketing_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campagne supprimée");
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: fr });
  };

  const getStatusBadge = (campaign) => {
    if (campaign.sent_at)
      return <Badge className="bg-green-100 text-green-800">Envoyée</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Programmée</Badge>;
  };

  const renderCampaignTable = (type) => {
    const list = campaigns.filter((c) => c.type === type);

    if (loading) {
      return (
        <div className="p-6">
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="text-center py-12">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-30" />
          <p className="text-muted-foreground">Aucune campagne</p>
          <Button variant="link" onClick={() => openCompose(type)}>
            Créer votre première campagne
          </Button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="pl-6">Campagne</TableHead>
              <TableHead>Destinataires</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const content = parseContent(c);
              const count = recipientsFor(content.recipient_type).length;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium pl-6">
                    {c.name}
                    <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                      {content.subject}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{count} contacts</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.sent_at ? formatDate(c.sent_at) : formatDate(c.created_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(c)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Aperçu"
                        onClick={() => setPreviewCampaign(c)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={type === "sms" ? "Exporter les numéros" : "Ouvrir la messagerie"}
                        onClick={() => handleSendNow(c)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Exporter les destinataires"
                        onClick={() => handleExportRecipients(c)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Supprimer"
                        className="text-destructive"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const inactiveCount = clients.filter(isInactive).length;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Engagez vos clients avec des campagnes ciblées.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </Button>
          <Button onClick={() => openCompose("email")} className="gap-2">
            <Mail className="w-4 h-4" /> Nouvelle campagne
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Base clients</p>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-xs text-muted-foreground">
                {emailReady} avec email · {phoneReady} avec téléphone
              </p>
            </div>
            <Users className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Campagnes créées</p>
              <p className="text-2xl font-bold">{campaigns.length}</p>
              <p className="text-xs text-muted-foreground">
                {sentCount} envoyées · {pendingCount} programmées
              </p>
            </div>
            <Target className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taux d'envoi</p>
              <p className="text-2xl font-bold">{sendRate}%</p>
              <p className="text-xs text-muted-foreground">
                campagnes effectivement envoyées
              </p>
            </div>
            <Send className="h-8 w-8 text-green-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clients inactifs</p>
              <p className="text-2xl font-bold">{inactiveCount}</p>
              <p className="text-xs text-muted-foreground">
                sans visite depuis 90 jours
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-60" />
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
            Relances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emails" className="m-0">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Historique des campagnes email</CardTitle>
              <CardDescription>
                Les envois s'ouvrent dans votre messagerie avec les destinataires
                pré-remplis (jusqu'à {MAX_BCC} en copie cachée).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">{renderCampaignTable("email")}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="m-0">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Campagnes SMS</CardTitle>
              <CardDescription>
                Créez votre message, exportez la liste des numéros, puis envoyez-le
                depuis votre téléphone.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">{renderCampaignTable("sms")}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="m-0">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Clients à relancer</CardTitle>
              <CardDescription>
                Liste des clients sans visite depuis plus de 90 jours.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : inactiveCount === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                  <p className="text-muted-foreground">
                    Aucun client à relancer, tout le monde passe régulièrement !
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="pl-6">Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Dernière visite</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.filter(isInactive).map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium pl-6">
                            {client.name}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>{client.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.phone}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {client.last_visit
                              ? formatDate(client.last_visit)
                              : "Jamais venu"}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                openCompose("email");
                                setForm({
                                  title: `Relance ${client.name}`,
                                  subject: `On vous a manqué !`,
                                  content: `Bonjour ${client.name},\n\nVotre salon vous propose une offre exclusive pour votre prochaine visite.\n\nÀ très vite !\n${salonName}`,
                                  scheduled_date: "",
                                  recipient_type: "all_clients",
                                  type: "email",
                                });
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" /> Relancer
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
      </Tabs>

      {/* Modal création */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form.type === "sms" ? "Nouvelle campagne SMS" : "Nouvelle campagne email"}
            </DialogTitle>
            <DialogDescription>
              Les destinataires sont calculés selon le filtre choisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la campagne</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Promo Été 2026"
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
                {RECIPIENTS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {recipientsFor(form.recipient_type).length} destinataire(s) ·{" "}
                {recipientsFor(form.recipient_type).filter((r) =>
                  form.type === "sms" ? r.phone : r.email,
                ).length}{" "}
                joignable(s)
              </p>
            </div>

            {form.type === "email" && (
              <div className="space-y-2">
                <Label>Objet de l'email</Label>
                <Input
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Découvrez nos offres exceptionnelles..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{form.type === "sms" ? "Message SMS" : "Contenu de l'email"}</Label>
              <Textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                placeholder={
                  form.type === "sms" ? "Votre message (160 caractères par SMS)..." : "Votre message ici..."
                }
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
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour préparer l'envoi immédiat
              </p>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={sending}>
                <Send className="w-4 h-4 mr-2" />
                {form.scheduled_date ? "Programmer" : "Préparer l'envoi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal aperçu */}
      <Dialog
        open={Boolean(previewCampaign)}
        onOpenChange={() => setPreviewCampaign(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{previewCampaign?.name}</DialogTitle>
            <DialogDescription>
              {previewCampaign?.type === "sms" ? "SMS" : "Email"} ·{" "}
              {previewCampaign?.sent_at
                ? `envoyée le ${formatDate(previewCampaign.sent_at)}`
                : "programmée"}
            </DialogDescription>
          </DialogHeader>
          {previewCampaign && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objet</p>
                <p>{parseContent(previewCampaign).subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                  {parseContent(previewCampaign).body}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewCampaign(null)}>
                  Fermer
                </Button>
                <Button onClick={() => handleSendNow(previewCampaign)}>
                  <Send className="h-4 w-4 mr-2" />
                  {previewCampaign.type === "sms" ? "Exporter" : "Ouvrir la messagerie"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
