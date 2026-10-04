import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Award, Gift, History, Sparkles, TrendingUp, Star, Crown } from 'lucide-react';
import FloatingAiChat from '@/components/FloatingAiChat.jsx';
import { toast } from 'sonner';

const TIERS = [
  { name: 'Bronze', minPoints: 0, color: 'from-amber-600 to-amber-700', icon: Star, bgColor: 'bg-amber-50 dark:bg-amber-950/20' },
  { name: 'Silver', minPoints: 500, color: 'from-gray-400 to-gray-500', icon: Award, bgColor: 'bg-gray-50 dark:bg-gray-950/20' },
  { name: 'Gold', minPoints: 1000, color: 'from-yellow-500 to-yellow-600', icon: Crown, bgColor: 'bg-yellow-50 dark:bg-yellow-950/20' },
  { name: 'Platinum', minPoints: 2500, color: 'from-cyan-500 to-blue-600', icon: Sparkles, bgColor: 'bg-cyan-50 dark:bg-cyan-950/20' }
];

export default function LoyaltyPage() {
  const { currentUser } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [history, setHistory] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.profile?.id) {
      fetchLoyaltyData();
    }
  }, [currentUser]);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      if (!tenantId || !profileId) {
        setLoading(false);
        return;
      }

      // 1. Récupérer les informations du client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', profileId)
        .eq('tenant_id', tenantId)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        console.error('Error fetching client:', clientError);
      }

      setClientData(client || { loyalty_points: 0, total_visits: 0, total_spent: 0 });

      // 2. Récupérer l'historique des transactions (à partir des appointments)
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, total_price, rating')
        .eq('client_id', client?.id)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false })
        .limit(20);

      if (!appointmentsError && appointments) {
        const formattedHistory = appointments.map(apt => ({
          id: apt.id,
          date: apt.appointment_date,
          reason: 'booking',
          points_earned: Math.floor(apt.total_price / 100) || 0,
          points_redeemed: 0,
          description: `Rendez-vous du ${new Date(apt.appointment_date).toLocaleDateString()}`
        }));
        setHistory(formattedHistory);
      }

      // 3. Récupérer les récompenses disponibles
      const { data: promoRewards, error: rewardsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'loyalty_bonus')
        .eq('is_active', true);

      if (!rewardsError && promoRewards) {
        const formattedRewards = promoRewards.map(reward => ({
          id: reward.id,
          reward_name: reward.name,
          description: reward.description,
          points_required: reward.value || 100,
          code: reward.code
        }));
        setRewards(formattedRewards);
      } else {
        // Récompenses par défaut
        setRewards([
          { id: '1', reward_name: 'Réduction de 10%', description: 'Sur votre prochaine prestation', points_required: 100 },
          { id: '2', reward_name: 'Soin offert', description: 'Massage des mains offert', points_required: 250 },
          { id: '3', reward_name: 'Réduction de 20%', description: 'Sur toute prestation', points_required: 500 },
        ]);
      }
    } catch (err) {
      console.error("Error fetching loyalty data", err);
      toast.error("Impossible de charger les données de fidélité.");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTier = (points) => {
    if (points >= 2500) return TIERS[3];
    if (points >= 1000) return TIERS[2];
    if (points >= 500) return TIERS[1];
    return TIERS[0];
  };

  const getNextTier = (points) => {
    if (points >= 2500) return null;
    if (points >= 1000) return TIERS[3];
    if (points >= 500) return TIERS[2];
    return TIERS[1];
  };

  const getProgressToNextTier = (points) => {
    const nextTier = getNextTier(points);
    if (!nextTier) return 100;
    
    const currentTier = getCurrentTier(points);
    const currentMin = currentTier.minPoints;
    const nextMin = nextTier.minPoints;
    const progress = ((points - currentMin) / (nextMin - currentMin)) * 100;
    return Math.min(progress, 100);
  };

  const handleRedeemReward = async (reward) => {
    if (!clientData || clientData.loyalty_points < reward.points_required) {
      toast.error("Points insuffisants pour cette récompense");
      return;
    }

    toast.success(`Code promo: ${reward.code || 'LOYALTY2024'} - Valable pour votre prochain rendez-vous !`);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentPoints = clientData?.loyalty_points || 0;
  const currentTier = getCurrentTier(currentPoints);
  const nextTier = getNextTier(currentPoints);
  const progressPercent = getProgressToNextTier(currentPoints);
  const CurrentTierIcon = currentTier.icon;

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Fidélité & Récompenses
        </h1>
        <p className="text-muted-foreground mt-1">
          Cumulez des points à chaque visite et débloquez des avantages exclusifs.
        </p>
      </div>

      {/* Points & Tier Card */}
      <Card className={`overflow-hidden border-none shadow-lg bg-gradient-to-r ${currentTier.color} text-white`}>
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-2">
              <p className="text-sm font-medium opacity-90 uppercase tracking-widest">Mes points</p>
              <div className="text-6xl md:text-7xl font-bold tracking-tighter">
                {currentPoints}
              </div>
              <p className="text-sm opacity-90 pt-2">100 FCFA dépensés = 1 point</p>
            </div>
            
            <div className="w-full md:w-1/2 space-y-4 bg-white/10 p-6 rounded-2xl backdrop-blur-sm">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm opacity-90 mb-1">Palier Actuel</p>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <CurrentTierIcon className="h-6 w-6" />
                    {currentTier.name}
                  </div>
                </div>
                {nextTier && (
                  <div className="text-right text-sm font-medium">
                    <span className="opacity-90">{nextTier.minPoints - currentPoints} pts avant {nextTier.name}</span>
                  </div>
                )}
              </div>
              <Progress value={progressPercent} className="h-3 bg-black/20 [&>div]:bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Visites totales</p>
              <p className="text-2xl font-bold">{clientData?.total_visits || 0}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dépenses totales</p>
              <p className="text-2xl font-bold">{(clientData?.total_spent || 0).toLocaleString()} FCFA</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Points gagnés</p>
              <p className="text-2xl font-bold">{currentPoints}</p>
            </div>
            <Gift className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Rewards */}
        <Card className="bento-card border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <CardTitle>Récompenses disponibles</CardTitle>
            </div>
            <CardDescription>Utilisez vos points pour des réductions exclusives.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rewards.length > 0 ? (
              rewards.map(reward => (
                <div key={reward.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-all">
                  <div className="mb-4 sm:mb-0">
                    <h4 className="font-semibold text-foreground">{reward.reward_name}</h4>
                    {reward.description && <p className="text-sm text-muted-foreground mt-0.5">{reward.description}</p>}
                    <Badge variant="secondary" className="mt-2 font-mono bg-primary/10 text-primary">
                      {reward.points_required} pts
                    </Badge>
                  </div>
                  <Button 
                    disabled={currentPoints < reward.points_required}
                    variant={currentPoints >= reward.points_required ? "default" : "secondary"}
                    onClick={() => handleRedeemReward(reward)}
                  >
                    Utiliser mes points
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl">
                Aucune récompense active pour le moment.
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bento-card border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Historique des points</CardTitle>
            </div>
            <CardDescription>Vos dernières transactions de fidélité.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {tx.reason === 'booking' && '💇 Rendez-vous'}
                          {tx.reason === 'reward' && '🎁 Récompense utilisée'}
                          {tx.reason === 'birthday' && '🎂 Bonus Anniversaire'}
                          {!tx.reason && tx.description}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {tx.points_earned > 0 ? (
                            <span className="text-green-600">+{tx.points_earned}</span>
                          ) : tx.points_redeemed > 0 ? (
                            <span className="text-red-500">-{tx.points_redeemed}</span>
                          ) : (
                            <span className="text-green-600">+0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucun historique disponible.</p>
                <p className="text-sm mt-2">Réservez votre premier rendez-vous pour gagner des points !</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Comment gagner des points ?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                • 1 point pour 100 FCFA dépensés<br />
                • Points bonus lors de votre anniversaire<br />
                • Offres spéciales et promotions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <FloatingAiChat />
    </div>
  );
}