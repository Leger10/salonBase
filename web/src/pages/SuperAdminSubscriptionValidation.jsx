// /src/pages/SuperAdminSubscriptionValidation.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { 
  CheckCircle, XCircle, Clock, RefreshCw, 
  Building2, Search, Eye, ChevronLeft, ChevronRight,
  Loader2, Shield, Mail
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function SuperAdminSubscriptionValidation() {
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchPendingSubscriptions();
  }, [searchTerm, currentPage]);

  const fetchPendingSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('subscriptions')
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            email,
            phone,
            subscription_status,
            subscription_plan
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erreur:', error);
        // Fallback
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });
        
        if (subData) {
          const enrichedData = await Promise.all(subData.map(async (sub) => {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('id, name, email, phone, subscription_status, subscription_plan')
              .eq('id', sub.tenant_id)
              .single();
            return { ...sub, tenants: tenant };
          }));
          setPendingSubscriptions(enrichedData);
          setTotalCount(enrichedData.length);
        }
        return;
      }
      
      setPendingSubscriptions(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (subscriptionId, tenantId) => {
    if (!confirm('Confirmez-vous la validation de cet abonnement ?')) return;

    setProcessing(subscriptionId);
    try {
      // 1. Mettre à jour l'abonnement
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active',
          validated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (subError) throw subError;

      // 2. Mettre à jour le tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ 
          subscription_status: 'active'
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      toast.success('✅ Abonnement validé avec succès !');
      await fetchPendingSubscriptions();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (subscriptionId, tenantId) => {
    if (!confirm('Confirmez-vous le rejet de cet abonnement ?')) return;

    setProcessing(subscriptionId);
    try {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          rejected_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (subError) throw subError;

      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ 
          subscription_status: 'inactive'
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      toast.success('✅ Abonnement rejeté');
      await fetchPendingSubscriptions();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors du rejet');
    } finally {
      setProcessing(null);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Validation des abonnements
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} demande(s) en attente de validation
          </p>
        </div>
        <Button variant="outline" onClick={fetchPendingSubscriptions} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un salon ou un plan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Salon</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Demandé le</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <p className="text-lg font-medium">Aucune demande en attente</p>
                        <p className="text-sm">Toutes les demandes ont été traitées</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{sub.tenants?.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {sub.tenants?.email || 'Email non disponible'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="capitalize">
                          {sub.plan || 'N/A'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {sub.duration || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {sub.amount?.toLocaleString() || '0'} FCFA
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>{sub.created_at ? new Date(sub.created_at).toLocaleDateString('fr-FR') : 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.created_at ? new Date(sub.created_at).toLocaleTimeString('fr-FR') : ''}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleValidate(sub.id, sub.tenant_id)}
                            disabled={processing === sub.id}
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          >
                            {processing === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Valider
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(sub.id, sub.tenant_id)}
                            disabled={processing === sub.id}
                            className="gap-1"
                          >
                            {processing === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Rejeter
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/super-admin/subscriptions/${sub.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}