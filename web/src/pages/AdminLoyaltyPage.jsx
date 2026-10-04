import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { 
  Award, Search, UserPlus, Settings, PieChart, Cake, 
  Star, TrendingUp, Gift, Plus, Minus, Edit, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';

export default function AdminLoyaltyPage() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState(0);
  const [exchangeRate, setExchangeRate] = useState({ pointsPerAmount: 1, amountPerPoint: 100 });

  useEffect(() => {
    fetchLoyaltyData();
    fetchExchangeRate();
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

      // Récupérer tous les clients avec leurs points
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          loyalty_points,
          total_visits,
          total_spent,
          created_at,
          profile:profile_id (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('tenant_id', tenantId)
        .order('loyalty_points', { ascending: false });

      if (error) throw error;

      // Calculer le palier pour chaque client
      const clientsWithTier = (data || []).map(client => ({
        ...client,
        tier: getTierFromPoints(client.loyalty_points || 0)
      }));

      setClients(clientsWithTier);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setExchangeRate({
          pointsPerAmount: data.points_per_amount || 1,
          amountPerPoint: data.amount_per_point || 100
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  const getTierFromPoints = (points) => {
    if (points >= 2500) return { name: 'Platinum', color: 'bg-slate-900 text-white', icon: '👑' };
    if (points >= 1000) return { name: 'Gold', color: 'bg-amber-100 text-amber-800', icon: '⭐' };
    if (points >= 500) return { name: 'Silver', color: 'bg-slate-100 text-slate-800', icon: '🥈' };
    return { name: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' };
  };

  const handleAdjustPoints = async () => {
    if (!selectedClient || pointsToAdd === 0) return;

    try {
      const newPoints = (selectedClient.loyalty_points || 0) + pointsToAdd;
      
      const { error } = await supabase
        .from('clients')
        .update({ 
          loyalty_points: Math.max(0, newPoints),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedClient.id);

      if (error) throw error;

      toast.success(`${pointsToAdd > 0 ? '+' : ''}${pointsToAdd} points ${pointsToAdd > 0 ? 'ajoutés' : 'retirés'} avec succès`);
      setAdjustModalOpen(false);
      setSelectedClient(null);
      setPointsToAdd(0);
      fetchLoyaltyData();
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast.error('Erreur lors de l\'ajustement des points');
    }
  };

  const handleSaveExchangeRate = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { error } = await supabase
        .from('loyalty_settings')
        .upsert({
          tenant_id: tenantId,
          points_per_amount: exchangeRate.pointsPerAmount,
          amount_per_point: exchangeRate.amountPerPoint,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Règles de fidélité mises à jour');
    } catch (error) {
      console.error('Error saving exchange rate:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const filteredClients = clients.filter(client => 
    client.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPoints = clients.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
  const averagePoints = clients.length > 0 ? Math.round(totalPoints / clients.length) : 0;

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programme de Fidélité</h1>
          <p className="text-muted-foreground mt-1">Gérez les points et les récompenses de vos clients.</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clients fidélisés</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
              <Award className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points distribués</p>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Moyenne par client</p>
                <p className="text-2xl font-bold">{averagePoints}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de conversion</p>
                <p className="text-2xl font-bold">{(clients.filter(c => c.loyalty_points > 0).length / (clients.length || 1) * 100).toFixed(0)}%</p>
              </div>
              <Gift className="h-8 w-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-card">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="rewards">Récompenses</TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="bento-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Fidélité Clients</CardTitle>
                <CardDescription>Consultez et ajustez les soldes de points.</CardDescription>
              </div>
              <div className="relative w-64">
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
                    {filteredClients.map((client) => {
                      const tier = getTierFromPoints(client.loyalty_points || 0);
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">
                            {client.profile?.full_name || 'Client inconnu'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{client.profile?.email}</div>
                            <div className="text-xs text-muted-foreground">{client.profile?.phone}</div>
                          </TableCell>
                          <TableCell>{client.total_visits || 0}</TableCell>
                          <TableCell>{(client.total_spent || 0).toLocaleString()} FCFA</TableCell>
                          <TableCell>
                            <Badge className={tier.color}>
                              {tier.icon} {tier.name}
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
                              <Edit className="h-3 w-3" />
                              Ajuster
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredClients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun client trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="bento-card border-none shadow-md">
            <CardHeader>
              <CardTitle>Règles d'accumulation</CardTitle>
              <CardDescription>Définissez comment les clients gagnent des points.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Montant dépensé (FCFA)</Label>
                  <Input 
                    type="number" 
                    value={exchangeRate.amountPerPoint}
                    onChange={(e) => setExchangeRate({...exchangeRate, amountPerPoint: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Points gagnés</Label>
                  <Input 
                    type="number" 
                    value={exchangeRate.pointsPerAmount}
                    onChange={(e) => setExchangeRate({...exchangeRate, pointsPerAmount: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Actuellement: {exchangeRate.amountPerPoint} FCFA = {exchangeRate.pointsPerAmount} point
              </p>
              <Button onClick={handleSaveExchangeRate} className="mt-4 gap-2">
                <Save className="h-4 w-4" />
                Sauvegarder les règles
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          <Card className="bento-card border-none shadow-md">
            <CardHeader>
              <CardTitle>Récompenses disponibles</CardTitle>
              <CardDescription>Définissez les récompenses que les clients peuvent échanger.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl border-dashed">
                <Gift className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium">Module en développement</h3>
                <p className="text-muted-foreground max-w-sm mt-1">
                  Prochainement: Gérez les récompenses que vos clients peuvent obtenir avec leurs points fidélité.
                </p>
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une récompense
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal d'ajustement des points */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajuster les points fidélité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-semibold">{selectedClient?.profile?.full_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Points actuels</p>
                <p className="text-2xl font-bold text-primary">{selectedClient?.loyalty_points || 0}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Points à ajouter (+) ou retirer (-)</Label>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setPointsToAdd(prev => prev - 10)}
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
                  onClick={() => setPointsToAdd(prev => prev + 10)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Nouveau total: {(selectedClient?.loyalty_points || 0) + pointsToAdd} points
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdjustPoints}>
              Confirmer l'ajustement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}