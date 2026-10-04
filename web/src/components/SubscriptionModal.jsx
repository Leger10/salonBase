import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock, Calendar, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionModal({ open, onOpenChange, tenantId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [plan, setPlan] = useState('pro');

  const handlePayment = async () => {
    if (!tenantId) {
      toast.error('ID du salon manquant');
      return;
    }

    setLoading(true);
    try {
      // Simuler un paiement
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mettre à jour l'abonnement
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_end: endDate.toISOString(),
          trial_ends_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast.success('🎉 Abonnement activé avec succès !');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur paiement:', error);
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Abonnement Pro
          </DialogTitle>
          <DialogDescription>
            Activez votre abonnement pour continuer à utiliser votre salon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan */}
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="grid grid-cols-3 gap-2">
              {['starter', 'pro', 'premium'].map((p) => (
                <Button
                  key={p}
                  variant={plan === p ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setPlan(p)}
                >
                  <span className="capitalize">{p}</span>
                  <span className="text-xs opacity-70">
                    {p === 'starter' ? '19€/mois' : p === 'pro' ? '49€/mois' : '99€/mois'}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Carte */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Paiement sécurisé
            </div>
            
            <div className="space-y-2">
              <Label>Numéro de carte</Label>
              <Input
                placeholder="1234 5678 9012 3456"
                value={cardData.cardNumber}
                onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date d'expiration</Label>
                <Input
                  placeholder="MM/YY"
                  value={cardData.expiry}
                  onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CVC</Label>
                <Input
                  placeholder="123"
                  value={cardData.cvc}
                  onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nom sur la carte</Label>
              <Input
                placeholder="Jean Dupont"
                value={cardData.name}
                onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
              />
            </div>
          </div>

          {/* Résumé */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan {plan}</span>
              <span className="font-semibold">
                {plan === 'starter' ? '19€' : plan === 'pro' ? '49€' : '99€'}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Période</span>
              <span className="font-semibold">1 mois</span>
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between">
              <span className="font-medium">Total</span>
              <span className="font-bold text-primary">
                {plan === 'starter' ? '19€' : plan === 'pro' ? '49€' : '99€'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handlePayment} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {loading ? 'Traitement...' : 'Payer et activer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}