// /src/pages/PromotionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveTenant } from '@/contexts/ActiveTenantContext';
import PublicHeader from '@/components/PublicHeader.jsx';
import PublicFooter from '@/components/PublicFooter.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, Copy, CheckCircle2, TicketPercent, Tag, Calendar, Gift, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

export default function PromotionsPage() {
  const { slug } = useParams();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const { currentUser } = useAuth();
  const { activeTenant, isShowcase } = useActiveTenant();

  // ✅ Déterminer le tenant à utiliser
  useEffect(() => {
    const fetchTenantInfo = async () => {
      // 1. Si on a un slug dans l'URL (mode showcase)
      if (slug) {
        try {
          const { data, error } = await supabase
            .from('tenants')
            .select('id, name, slug, logo_url, primary_color, address, phone, email')
            .eq('slug', slug)
            .single();
          
          if (!error && data) {
            setTenantInfo(data);
            return;
          }
        } catch (error) {
          console.error('Error fetching tenant:', error);
        }
      }

      // 2. Si on est en mode showcase avec activeTenant
      if (isShowcase && activeTenant) {
        setTenantInfo(activeTenant);
        return;
      }

      // 3. Si l'utilisateur est admin/employee, récupérer son tenant
      const userRole = currentUser?.profile?.role || currentUser?.role;
      const isAdmin = userRole === 'admin' || userRole === 'employee';
      const userTenantId = currentUser?.profile?.tenant_id || currentUser?.tenant_id;
      
      if (isAdmin && userTenantId) {
        try {
          const { data, error } = await supabase
            .from('tenants')
            .select('id, name, slug, logo_url, primary_color, address, phone, email')
            .eq('id', userTenantId)
            .single();
          
          if (!error && data) {
            setTenantInfo(data);
            return;
          }
        } catch (error) {
          console.error('Error fetching tenant:', error);
        }
      }

      // 4. Fallback - tenant par défaut
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, slug, logo_url, primary_color, address, phone, email')
          .eq('subscription_status', 'active')
          .limit(1)
          .single();
        
        if (!error && data) {
          setTenantInfo(data);
        }
      } catch (error) {
        console.error('Error fetching default tenant:', error);
      }
    };

    fetchTenantInfo();
  }, [slug, isShowcase, activeTenant, currentUser]);

  // ✅ Récupérer les promotions
  useEffect(() => {
    if (tenantInfo?.id) {
      fetchPromotions(tenantInfo.id);
    }
  }, [tenantInfo]);

  const fetchPromotions = async (tenantId) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('end_date', { ascending: true });

      if (error) throw error;

      // Transformer les données pour le frontend
      const formattedPromotions = data.map(promo => ({
        id: promo.id,
        code: promo.code,
        type: promo.type,
        value: promo.value,
        min_purchase: promo.min_purchase || 0,
        expiry_date: promo.end_date,
        applicable_clients: promo.applicable_clients || 'all',
        description: promo.description,
        usage_limit: promo.max_uses,
        used_count: promo.used_count || 0,
        name: promo.name,
        is_percentage: promo.type === 'percentage',
        is_fixed: promo.type === 'fixed',
        is_free_service: promo.type === 'free_service',
        is_bogo: promo.type === 'bogo'
      }));

      setPromotions(formattedPromotions);
    } catch (err) {
      console.error("Failed to load promotions", err);
      toast.error("Impossible de charger les promotions.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fonction pour incrémenter le compteur d'utilisations
  const incrementUsageCount = async (promoId) => {
    try {
      const { data: promo, error: fetchError } = await supabase
        .from('promotions')
        .select('used_count, max_uses')
        .eq('id', promoId)
        .single();

      if (fetchError) throw fetchError;

      // Vérifier si la limite est atteinte
      if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
        toast.error('Ce code promo a atteint sa limite d\'utilisation');
        return false;
      }

      // Incrémenter le compteur
      const { error: updateError } = await supabase
        .from('promotions')
        .update({ 
          used_count: promo.used_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', promoId);

      if (updateError) throw updateError;

      // Mettre à jour l'UI localement
      setPromotions(prevPromotions =>
        prevPromotions.map(p =>
          p.id === promoId
            ? { ...p, used_count: (p.used_count || 0) + 1 }
            : p
        )
      );

      return true;
    } catch (err) {
      console.error('❌ Erreur lors de l\'incrémentation:', err);
      toast.error('Erreur lors de l\'utilisation du code');
      return false;
    }
  };

  const handleCopyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copié dans le presse-papiers !");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ✅ Fonction pour utiliser le code promo (avec incrémentation)
  const handleUsePromoCode = async (id, code) => {
    try {
      // 1. Incrémenter le compteur
      const success = await incrementUsageCount(id);
      
      if (success) {
        // 2. Copier le code
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        
        // 3. Notification
        toast.success(`✅ Code "${code}" copié et enregistré !`);
        
        // 4. Réinitialiser après 2 secondes
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      toast.error('Erreur lors de l\'utilisation du code');
    }
  };

  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promo.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || 
                       (filterType === 'percentage' && promo.type === 'percentage') ||
                       (filterType === 'fixed' && promo.type === 'fixed') ||
                       (filterType === 'free_service' && promo.type === 'free_service') ||
                       (filterType === 'bogo' && promo.type === 'bogo');
    return matchesSearch && matchesType;
  });

  const getPromoValueDisplay = (promo) => {
    if (promo.type === 'percentage') return `-${promo.value}%`;
    if (promo.type === 'fixed') return `-${promo.value.toLocaleString()} FCFA`;
    if (promo.type === 'free_service') return 'Service Gratuit';
    if (promo.type === 'bogo') return '1 Acheté = 1 Offert';
    return '';
  };

  const getPromoIcon = (type) => {
    if (type === 'percentage') return <Tag className="h-4 w-4" />;
    if (type === 'fixed') return <TicketPercent className="h-4 w-4" />;
    if (type === 'free_service') return <Gift className="h-4 w-4" />;
    return <Sparkles className="h-4 w-4" />;
  };

  const getTypeLabel = (type) => {
    const labels = {
      percentage: 'Pourcentage',
      fixed: 'Remise',
      free_service: 'Gratuit',
      bogo: 'Offert'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      percentage: 'bg-blue-100 text-blue-800 border-blue-200',
      fixed: 'bg-green-100 text-green-800 border-green-200',
      free_service: 'bg-purple-100 text-purple-800 border-purple-200',
      bogo: 'bg-amber-100 text-amber-800 border-amber-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isExpiringSoon = (dateString) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const displayName = tenantInfo?.name || 'BeautyFlow';
  const primaryColor = tenantInfo?.primary_color || '#ec4899';

  if (loading) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Skeleton className="h-12 w-48 mb-4" />
            <Skeleton className="h-6 w-72 mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Promotions - {displayName} | BeautyFlow</title>
        <meta name="description" content={`Découvrez les promotions et offres spéciales de ${displayName}.`} />
      </Helmet>

      <PublicHeader />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <Tag className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Promotions & Offres
                </h1>
                <p className="text-muted-foreground mt-1">
                  Découvrez les offres spéciales de {displayName}
                </p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-600 border-amber-500/30">
                {promotions.length} offre(s) active(s)
              </Badge>
            </div>
            {tenantInfo?.logo_url && (
              <div className="flex items-center gap-2 mt-2">
                <img 
                  src={tenantInfo.logo_url} 
                  alt={tenantInfo.name} 
                  className="h-8 w-8 rounded-full object-cover border"
                />
                <span className="text-sm text-muted-foreground">{tenantInfo.name}</span>
              </div>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Chercher un code promo..." 
                className="pl-9 bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px] bg-card">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📋 Tous les types</SelectItem>
                <SelectItem value="percentage">📊 Pourcentage</SelectItem>
                <SelectItem value="fixed">💰 Montant fixe</SelectItem>
                <SelectItem value="free_service">🎁 Service gratuit</SelectItem>
                <SelectItem value="bogo">🔄 1+1 offert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grille des promotions */}
          {promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed">
              <TicketPercent className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Aucune promotion pour le moment</h3>
              <p className="text-muted-foreground max-w-md">
                Revenez plus tard pour découvrir les nouvelles offres de {displayName}.
              </p>
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed">
              <Search className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Aucune promotion trouvée</h3>
              <p className="text-muted-foreground">
                Aucune promotion ne correspond à vos critères.
              </p>
              <Button variant="link" onClick={() => { setSearchTerm(''); setFilterType('all'); }} className="mt-2">
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPromotions.map((promo) => {
                const expiringSoon = isExpiringSoon(promo.expiry_date);
                const typeColor = getTypeColor(promo.type);
                const isLimitReached = promo.max_uses > 0 && promo.used_count >= promo.max_uses;
                
                return (
                  <Card 
                    key={promo.id} 
                    className={`promo-card border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/80 overflow-hidden group relative ${
                      isLimitReached ? 'opacity-60' : ''
                    }`}
                  >
                    {expiringSoon && (
                      <div className="absolute top-0 right-0 z-10">
                        <Badge className="bg-red-500 text-white rounded-tl-none rounded-br-none rounded-tr-lg rounded-bl-lg px-3 py-1 shadow-lg shadow-red-500/30">
                          <Clock className="h-3 w-3 mr-1" />
                          Bientôt expiré
                        </Badge>
                      </div>
                    )}
                    {isLimitReached && (
                      <div className="absolute top-0 left-0 z-10">
                        <Badge className="bg-gray-500 text-white rounded-tl-lg rounded-br-none rounded-tr-lg rounded-bl-lg px-3 py-1 shadow-lg shadow-gray-500/30">
                          <Clock className="h-3 w-3 mr-1" />
                          Épuisé
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="pb-4 relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <Badge className={`${typeColor} gap-1 font-medium`}>
                          {getPromoIcon(promo.type)}
                          <span>{getTypeLabel(promo.type)}</span>
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Expire le {formatDate(promo.expiry_date)}</span>
                        </div>
                      </div>
                      
                      {promo.name && (
                        <p className="text-sm font-medium text-foreground mt-1">
                          {promo.name}
                        </p>
                      )}
                      
                      <CardTitle className="text-3xl font-bold text-primary">
                        {getPromoValueDisplay(promo)}
                      </CardTitle>
                      
                      {promo.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {promo.description}
                        </p>
                      )}
                      
                      <div className="mt-4 flex items-center justify-between bg-muted/30 rounded-xl p-3 border border-border/50">
                        <code className="font-mono text-lg font-bold tracking-wider text-foreground uppercase">
                          {promo.code}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyCode(promo.id, promo.code)}
                          className="h-8 gap-1 text-muted-foreground hover:text-primary"
                          disabled={isLimitReached}
                        >
                          {copiedId === promo.id ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-xs">Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span className="text-xs">Copier</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="text-sm text-muted-foreground flex-1">
                      {promo.min_purchase > 0 && (
                        <p className="flex items-center gap-2 mb-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                          Minimum d'achat : <span className="font-medium text-foreground">{promo.min_purchase.toLocaleString()} FCFA</span>
                        </p>
                      )}
                      {promo.applicable_clients && promo.applicable_clients !== 'all' && (
                        <p className="flex items-center gap-2 mb-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                          Réservé aux : <span className="font-medium capitalize text-foreground">{promo.applicable_clients}</span>
                        </p>
                      )}
                      {promo.usage_limit > 0 && (
                        <p className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                          Utilisations : <span className={`font-medium ${isLimitReached ? 'text-red-500' : 'text-foreground'}`}>
                            {promo.used_count || 0}/{promo.usage_limit}
                          </span>
                          {isLimitReached && (
                            <span className="text-xs text-red-500 ml-2">(Épuisé)</span>
                          )}
                        </p>
                      )}
                    </CardContent>
                    
                    <CardFooter className="pt-4 border-t border-border/50">
                      <Button 
                        className="w-full font-medium shadow-sm bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 group-hover:shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                        onClick={() => handleUsePromoCode(promo.id, promo.code)}
                        disabled={isLimitReached}
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        {isLimitReached ? 'Code épuisé' : 'Utiliser le code promo'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PublicFooter />
    </>
  );
}