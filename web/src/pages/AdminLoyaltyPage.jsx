import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import {
  Award, Search, Star, TrendingUp, Gift, Plus, Minus, Edit, Save,
  Crown, Sparkles, Trash2, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';

const TIERS = [
  { name: "Bronze", minPoints: 0 },
  { name: "Silver", minPoints: 500 },
  { name: "Gold", minPoints: 1000 },
  { name: "Platinum", minPoints: 2500 },
];

function getTierFromPoints(points = 0) {
  if (points >= 2500)
    return { name: "Platinum", icon: "💎", color: "bg-cyan-100 text-cyan-800 border-cyan-300" };
  if (points >= 1000)
    return { name: "Gold", icon: "🥇", color: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  if (points >= 500)
    return { name: "Silver", icon: "🥈", color: "bg-slate-100 text-slate-800 border-slate-300" };
  return { name: "Bronze", icon: "🥉", color: "bg-amber-100 text-amber-800 border-amber-300" };
};

const generateRewardCode = () =>
  "RWRD-" + Math.random().toString(36).slice(2, 8).toUpperCase();

export default function AdminLoyaltyPage() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState(0);

  const [exchangeRate, setExchangeRate] = useState({
    amountPerPoint: 100,
    pointsPerAmount: 1,
  });
  const [settingsId, setSettings] = useState(null);
  const [savingSettings, setSavingRules] = useState(false);

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    points_required: 100,
    is_active: true,
  });

  const tenantId = currentUser?.profile?.tenant_id;

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    fetchLoyaltyData();
    fetchExchangeRate();
    fetchRewards();
  }, [currentUser]);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setClients([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          id,
          name,
          email,
          phone,
          loyalty_points,
          total_visits,
          total_spent,
          created_at,
          profile:profile_id ( id, full_name, email, phone )
        `,
        )
        .eq("tenant_id", tenantId)
        .order("loyalty_points", { ascending: false });

      if (error) throw error;

      const clientsWithTier = (data || []).map((client) => ({
        ...client,
        displayName:
          client.profile?.full_name || client.name || "Client inconnu",
        displayEmail: client.profile?.email || client.email || "",
        displayPhone: client.profile?.phone || client.phone || "",
        tier: getTierFromPoints(client.loyalty_points || 0),
      }));

      setClients(clientsWithTier);
    } catch (error) {
      console.error("Error fetching loyalty data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("loyalty_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .limit(1);

      if (error) throw error;

      const settings = Array.isArray(data) ? data[0] : data;
      if (settings) {
        setExchangeRate({
          pointsPerAmount: settings.points_per_amount ?? 1,
          amountPerPoint: settings.amount_per_point ?? 100,
        });
      }
    } catch (error) {
      console.error("Error fetching loyalty settings:", error);
    }
  };

  const fetchRewards = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("type", "loyalty_bonus")
        .order("value", { ascending: true });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error("Error fetching rewards:", error);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedClient || pointsToAdd === 0) return;

    try {
      const newPoints = (selectedClient.loyalty_points || 0) + pointsToAdd;

      const { error } = await supabase
        .from("clients")
        .update({
          loyalty_points: Math.max(0, newPoints),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast.success(
        `${pointsToAdd > 0 ? "+" : ""}${pointsToAdd} points ${
          pointsToAdd > 0 ? "ajoutés" : "retirés"
        } avec succès`,
      );
      setAdjustModalOpen(false);
      setSelectedClient(null);
      setPointsToAdd(0);
      fetchLoyaltyData();
    } catch (error) {
      console.error("Error adjusting points:", error);
      toast.error("Erreur lors de l'ajustement des points");
    }
  };

  const handleSaveExchangeRate = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      setSaving(true);

      const { data: existing, error: findError } = await supabase
        .from("loyalty_settings")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(1);

      if (findError) throw findError;

      const current = Array.isArray(existing) ? existing[0] : existing;
      const payload = {
        tenant_id: tenantId,
        points_per_amount: Number(exchangeRate.pointsPerAmount) || 0,
        amount_per_point: Number(exchangeRate.amountPerPoint) || 0,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (current?.id) {
        ({ error } = await supabase
          .from("loyalty_settings")
          .update(payload)
          .eq("id", current.id));
      } else {
        ({ error } = await supabase
          .from("loyalty_settings")
          .insert({ ...payload, created_at: new Date().toISOString() }));
      }

      if (error) throw error;

      toast.success("Règles de fidélité mises à jour");
      fetchExchangeRate();
    } catch (error) {
      console.error("Error saving exchange rate:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const openCreateReward = () => {
    setEditingReward(null);
    setRewardForm({ name: "", description: "", points_required: 100, is_active: true });
    setRewardModalOpen(true);
  };

  const openEditReward = (reward) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name || "",
      description: reward.description || "",
      points_required: reward.value || 0,
      is_active: reward.is_active !== false,
    });
    setRewardModalOpen(true);
  };

  const handleSaveReward = async (e) => {
    e.preventDefault();
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Configuration du salon non trouvée");
        return;
      }

      const payload = {
        tenant_id: tenantId,
        code: editingReward?.code || generateRewardCode(),
        name: rewardForm.name,
        description: rewardForm.description || null,
        type: "loyalty_bonus",
        value: Number(rewardForm.points_required) || 0,
        min_purchase: 0,
        max_uses: 0,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
        is_active: rewardForm.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingReward) {
        const { error } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", editingReward.id);
        if (error) throw error;
        toast.success("Récompense mise à jour");
      } else {
        const { error } = await supabase
          .from("promotions")
          .insert({ ...payload, created_at: new Date().toISOString() });

        if (error) throw error;
        toast.success("Récompense créée");
      }

      setRewardModalOpen(false);
      fetchRewards();
    } catch (error) {
      console.error("Error saving reward:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleToggleReward = async (reward) => {
    try {
      const { error } = await supabase
        .from("promotions")
        .update({ is_active: !reward.is_active, updated_at: new Date().toISOString() })
        .eq("id", reward.id);

      if (error) throw error;
      fetchRewards();
    } catch (error) {
      console.error("Error toggling reward:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteReward = async (id) => {
    if (!window.confirm("Supprimer cette récompense ?")) return;
    try {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Récompense supprimée");
      fetchRewards();
    } catch (error) {
      console.error("Error deleting reward:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.displayEmail.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPoints = clients.reduce(
    (sum, client) => sum + (client.loyalty_points || 0),
    0,
  );
  const averagePoints = clients.length ? Math.round(totalPoints / clients.length) : 0;
  const activeClients = clients.filter((c) => (c.loyalty_points || 0) > 0).length;

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Programme de fidélité
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les points, les paliers et les récompenses de vos clients.
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clients fidélisés</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
            <Award className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Points distribués</p>
              <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
            </div>
            <Star className="h-8 w-8 text-yellow-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Moyenne par client</p>
              <p className="text-2xl font-bold">{averagePoints}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Récompenses actives</p>
              <p className="text-2xl font-bold">
                {rewards.filter((r) => r.is_active).length}
              </p>
            </div>
            <Gift className="h-8 w-8 text-purple-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="w-full flex justify-start h-auto bg-card border rounded-xl p-1 gap-1 mb-6">
          <TabsTrigger value="clients" className="flex-1 max-w-[200px]">
            Clients
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex-1 max-w-[200px]">
            Récompenses
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 max-w-[200px]">
            Règles
          </TabsTrigger>
        </TabsList>

        {/* Clients */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle>Fidélité clients</CardTitle>
                <CardDescription>
                  Consultez et ajustez les soldes de points.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Chercher un client..."
                  className="pl-9 bg-muted/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Visites</TableHead>
                      <TableHead>Dépenses</TableHead>
                      <TableHead>Palier</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {client.displayName}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{client.displayEmail}</div>
                          <div className="text-xs text-muted-foreground">
                            {client.displayPhone}
                          </div>
                        </TableCell>
                        <TableCell>{client.total_visits || 0}</TableCell>
                        <TableCell>
                          {Number(client.total_spent || 0).toLocaleString()} FCFA
                        </TableCell>
                        <TableCell>
                          <Badge className={`${client.tier.color} border`}>
                            {client.tier.icon} {client.tier.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-lg">
                          {client.loyalty_points || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setPointsToAdd(0);
                              setAdjustModalOpen(true);
                            }}
                            className="gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Ajuster
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredClients.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Aucun client trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {activeClients} client(s) ont déjà cumulé des points.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Récompenses */}
        <TabsContent value="rewards" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Récompenses disponibles</CardTitle>
                <CardDescription>
                  Définissez les récompenses que vos clients échangent contre
                  leurs points.
                </CardDescription>
              </div>
              <Button onClick={openCreateReward} className="gap-2">
                <Plus className="h-4 w-4" />
                Créer une récompense
              </Button>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl border-dashed">
                  <Gift className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-medium">Aucune récompense</h3>
                  <p className="text-muted-foreground max-w-sm mt-1">
                    Créez des récompenses pour motiver vos clients à revenir.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={openCreateReward}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une récompense
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rewards.map((reward) => (
                    <Card
                      key={reward.id}
                      className={`border ${reward.is_active ? "border-primary/30" : "opacity-60"}`}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{reward.name}</p>
                            {reward.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {reward.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            className={
                              reward.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }
                          >
                            {reward.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <Badge
                            variant="secondary"
                            className="font-mono bg-primary/10 text-primary text-base"
                          >
                            {reward.value} pts
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleReward(reward)}
                            >
                              {reward.is_active ? (
                                <XCircleIcon />
                              ) : (
                                <CheckCircleIcon />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditReward(reward)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteReward(reward.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Règles */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Règles d'accumulation</CardTitle>
              <CardDescription>
                Définissez comment les clients gagnent des points.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Montant dépensé (FCFA)</Label>
                  <Input
                    type="number"
                    value={exchangeRate.amountPerPoint}
                    onChange={(e) =>
                      setExchangeRate({
                        ...exchangeRate,
                        amountPerPoint: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Points gagnés</Label>
                  <Input
                    type="number"
                    value={exchangeRate.pointsPerAmount}
                    onChange={(e) =>
                      setExchangeRate({
                        ...exchangeRate,
                        pointsPerAmount: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Actuellement : {exchangeRate.amountPerPoint} FCFA ={" "}
                {exchangeRate.pointsPerAmount} point
              </p>
              <Button onClick={handleSaveExchangeRate} disabled={saving} className="mt-4 gap-2">
                <Save className="h-4 w-4" />
                Sauvegarder les règles
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Paliers de fidélité</CardTitle>
              <CardDescription>
                Les paliers sont attribués automatiquement selon les points.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "Bronze", min: 0, icon: "🥉" },
                { name: "Silver", min: 500, icon: "🥈" },
                { name: "Gold", min: 1000, icon: "🥇" },
                { name: "Platinum", min: 2500, icon: "💎" },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-xl border p-4 flex items-center gap-3"
                >
                  <span className="text-2xl">{tier.icon}</span>
                  <div>
                    <p className="font-semibold">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      dès {tier.min} pts
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal ajustement points */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajuster les points fidélité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-semibold">{selectedClient?.displayName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Points actuels</p>
                <p className="text-2xl font-bold text-primary">
                  {selectedClient?.loyalty_points || 0}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Points à ajouter (+) ou retirer (-)</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPointsToAdd((prev) => prev - 10)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                  className="text-center text-lg font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPointsToAdd((prev) => prev + 10)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Nouveau total :{" "}
                {(selectedClient?.loyalty_points || 0) + pointsToAdd} points
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdjustPoints}>Confirmer l'ajustement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal récompense */}
      <Dialog open={rewardModalOpen} onOpenChange={setRewardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? "Modifier la récompense" : "Nouvelle récompense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveReward} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                required
                value={rewardForm.name}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, name: e.target.value })
                }
                placeholder="Ex : Réduction de 10%"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={rewardForm.description}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, description: e.target.value })
                }
                placeholder="Sur votre prochaine prestation"
              />
            </div>
            <div className="space-y-2">
              <Label>Points requis *</Label>
              <Input
                type="number"
                required
                value={rewardForm.points_required}
                onChange={(e) =>
                  setRewardForm({
                    ...rewardForm,
                    points_required: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="reward-active" className="cursor-pointer">
                Récompense active
              </Label>
              <input
                id="reward-active"
                type="checkbox"
                checked={rewardForm.is_active}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRewardModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingReward ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function XCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-destructive"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-600"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
