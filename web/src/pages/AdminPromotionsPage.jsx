// /src/pages/AdminPromotionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Tag, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPromotionsPage() {
  const { currentUser } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage',
    value: '',
    min_purchase: 0,
    max_uses: 100,
    used_count: 0,
    start_date: '',
    end_date: '',
    applicable_clients: 'all',
    is_active: true
  });

  useEffect(() => {
    fetchPromotions();
  }, [currentUser]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setPromotions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (err) {
      console.error("Failed to load promotions", err);
      toast.error("Erreur lors du chargement des promotions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error('Configuration du salon non trouvée');
        return;
      }

      // ✅ Vérifier si le code existe déjà
      const { data: existingCode, error: checkError } = await supabase
        .from('promotions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', formData.code.toUpperCase())
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing code:', checkError);
      }

      if (existingCode) {
        toast.error(`Le code "${formData.code.toUpperCase()}" existe déjà. Veuillez en choisir un autre.`);
        return;
      }

      // ✅ Préparer les données avec les bons types
      const promotionData = {
        tenant_id: tenantId,
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        description: formData.description ? formData.description.trim() : null,
        type: formData.type,
        value: parseFloat(formData.value) || 0,
        min_purchase: parseFloat(formData.min_purchase) || 0,
        max_uses: parseInt(formData.max_uses) || 0,
        used_count: 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        applicable_clients: formData.applicable_clients || 'all',
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📤 Insertion promotion:', promotionData);

      const { data, error } = await supabase
        .from('promotions')
        .insert(promotionData)
        .select();

      if (error) {
        console.error('❌ Erreur insertion:', error);
        
        // ✅ Gérer les erreurs spécifiques
        if (error.code === '42501') {
          toast.error("Erreur de permission. Veuillez contacter le super administrateur.");
        } else if (error.code === '23505') {
          toast.error(`Le code "${formData.code.toUpperCase()}" existe déjà.`);
        } else {
          toast.error(`Erreur: ${error.message || 'Impossible de créer la promotion'}`);
        }
        return;
      }

      toast.success(`✅ Promotion "${formData.code.toUpperCase()}" créée avec succès !`);
      setShowForm(false);
      resetForm();
      fetchPromotions();
    } catch (err) {
      console.error('❌ Error creating promotion:', err);
      toast.error(err.message || "Erreur lors de la création de la promotion.");
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: '',
      min_purchase: 0,
      max_uses: 100,
      used_count: 0,
      start_date: '',
      end_date: '',
      applicable_clients: 'all',
      is_active: true
    });
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setPromotions(promotions.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
      toast.success("Statut mis à jour.");
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error("Erreur de mise à jour.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette promotion ?")) return;
    
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPromotions(promotions.filter(p => p.id !== id));
      toast.success("Promotion supprimée.");
    } catch (err) {
      console.error('Error deleting promotion:', err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      percentage: 'Pourcentage',
      fixed: 'Montant fixe',
      free_service: 'Service gratuit',
      bogo: '1 acheté = 1 offert',
      loyalty_bonus: 'Bonus fidélité'
    };
    return labels[type] || type;
  };

  const getTypeValueDisplay = (promo) => {
    if (promo.type === 'percentage') return `${promo.value}%`;
    if (promo.type === 'fixed') return `${promo.value.toLocaleString()} FCFA`;
    if (promo.type === 'free_service') return 'Service gratuit';
    if (promo.type === 'bogo') return '1+1 offert';
    return promo.value;
  };

  const isExpired = (endDate) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Promotions</h1>
          <p className="text-muted-foreground mt-1">Créez et suivez vos codes promotionnels.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPromotions} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? "Annuler" : <><Plus className="h-4 w-4" /> Créer une promotion</>}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bento-card border-none shadow-sm animate-in slide-in-from-top-4 fade-in duration-300">
          <CardHeader>
            <CardTitle>Nouvelle Promotion</CardTitle>
            <CardDescription>Définissez les règles et les limites de votre code.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="code">Code promo *</Label>
                  <Input 
                    id="code" 
                    required 
                    placeholder="ETE2026" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-muted-foreground">Le code doit être unique</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de la promotion *</Label>
                  <Input 
                    id="name" 
                    required 
                    placeholder="Promotion Été 2026" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="Description de l'offre..." 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type de réduction *</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant Fixe (FCFA)</SelectItem>
                      <SelectItem value="free_service">Service Gratuit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valeur *</Label>
                  <Input 
                    id="value" 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    value={formData.value} 
                    onChange={e => setFormData({...formData, value: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_purchase">Achat minimum (FCFA)</Label>
                  <Input 
                    id="min_purchase" 
                    type="number" 
                    min="0"
                    value={formData.min_purchase} 
                    onChange={e => setFormData({...formData, min_purchase: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_uses">Limite d'utilisation</Label>
                  <Input 
                    id="max_uses" 
                    type="number" 
                    min="1"
                    value={formData.max_uses} 
                    onChange={e => setFormData({...formData, max_uses: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début</Label>
                  <Input 
                    id="start_date" 
                    type="date" 
                    value={formData.start_date} 
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin *</Label>
                  <Input 
                    id="end_date" 
                    type="date" 
                    required 
                    value={formData.end_date} 
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 bg-muted/30 p-4 rounded-xl w-fit">
                <Switch 
                  id="is_active" 
                  checked={formData.is_active} 
                  onCheckedChange={c => setFormData({...formData, is_active: c})} 
                />
                <Label htmlFor="is_active" className="cursor-pointer">Activer immédiatement</Label>
              </div>
              
              <div className="flex justify-end border-t pt-4">
                <Button type="submit">Créer le code</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bento-card border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                    <TableHead className="text-center">Utilisations</TableHead>
                    <TableHead>Valable jusqu'au</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map(promo => {
                    const expired = isExpired(promo.end_date);
                    return (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-bold text-primary">
                          {promo.code}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {promo.name || promo.code}
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {getTypeLabel(promo.type)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {getTypeValueDisplay(promo)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-foreground">{promo.used_count || 0}</span>
                          <span className="text-muted-foreground text-xs"> / {promo.max_uses || '∞'}</span>
                        </TableCell>
                        <TableCell className={expired ? "text-destructive font-medium" : "text-foreground"}>
                          {promo.end_date ? new Date(promo.end_date).toLocaleDateString('fr-FR') : 'Illimitée'}
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={promo.is_active && !expired} 
                            onCheckedChange={() => toggleStatus(promo.id, promo.is_active)}
                            disabled={expired}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive" 
                            onClick={() => handleDelete(promo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {promotions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        Aucune promotion trouvée. Créez-en une pour commencer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}