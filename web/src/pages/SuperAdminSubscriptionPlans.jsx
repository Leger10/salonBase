// /src/pages/SuperAdminSubscriptionPlans.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { 
  Plus, Edit, Trash2, CheckCircle, XCircle,
  RefreshCw, Crown, Users, Scissors, Package,
  DollarSign, Calendar, Loader2, X
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// COMPOSANT PLAN FORM (déplacé en dehors)
// ============================================
const PlanForm = ({ formData, setFormData, onSubmit, onCancel, loading }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nom du plan *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Starter, Pro, Enterprise"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description du plan"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Prix *</label>
          <Input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Durée (mois)</label>
          <select
            className="w-full px-3 py-2 border rounded-lg bg-background"
            value={formData.duration_months}
            onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
          >
            <option value={1}>1 mois</option>
            <option value={3}>3 mois</option>
            <option value={6}>6 mois</option>
            <option value={12}>12 mois</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Employés max</label>
          <Input
            type="number"
            value={formData.max_employees}
            onChange={(e) => setFormData({ ...formData, max_employees: parseInt(e.target.value) || 0 })}
            min="1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Services max</label>
          <Input
            type="number"
            value={formData.max_services}
            onChange={(e) => setFormData({ ...formData, max_services: parseInt(e.target.value) || 0 })}
            min="1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Produits max</label>
          <Input
            type="number"
            value={formData.max_products}
            onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) || 0 })}
            min="1"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">Plan actif</label>
      </div>
      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel} type="button">
          Annuler
        </Button>
        <Button onClick={onSubmit} disabled={loading} type="button">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer'
          )}
        </Button>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function SuperAdminSubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'FCFA',
    duration_months: 1,
    max_employees: 5,
    max_services: 20,
    max_products: 50,
    features: {},
    is_active: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!formData.name.trim() || !formData.price) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setFormLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          price: parseFloat(formData.price),
          currency: formData.currency || 'FCFA',
          duration_months: parseInt(formData.duration_months) || 1,
          max_employees: parseInt(formData.max_employees) || 5,
          max_services: parseInt(formData.max_services) || 20,
          max_products: parseInt(formData.max_products) || 50,
          features: formData.features || {},
          is_active: formData.is_active
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Plan "${formData.name}" créé avec succès`);
      setShowCreateModal(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error(error.message || 'Erreur lors de la création du plan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!formData.name.trim() || !formData.price) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          price: parseFloat(formData.price),
          currency: formData.currency || 'FCFA',
          duration_months: parseInt(formData.duration_months) || 1,
          max_employees: parseInt(formData.max_employees) || 5,
          max_services: parseInt(formData.max_services) || 20,
          max_products: parseInt(formData.max_products) || 50,
          features: formData.features || {},
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast.success(`Plan "${formData.name}" mis à jour avec succès`);
      setShowEditModal(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du plan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le plan "${plan.name}" ? Cette action est irréversible.`)) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', plan.id);

      if (error) throw error;

      toast.success(`Plan "${plan.name}" supprimé avec succès`);
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erreur lors de la suppression du plan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'FCFA',
      duration_months: 1,
      max_employees: 5,
      max_services: 20,
      max_products: 50,
      features: {},
      is_active: true
    });
    setSelectedPlan(null);
  };

  const openEditModal = (plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      currency: plan.currency || 'FCFA',
      duration_months: plan.duration_months,
      max_employees: plan.max_employees || 5,
      max_services: plan.max_services || 20,
      max_products: plan.max_products || 50,
      features: plan.features || {},
      is_active: plan.is_active
    });
    setShowEditModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans d'abonnement</h1>
          <p className="text-muted-foreground mt-1">
            {plans.length} plans disponibles
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau plan
          </Button>
          <Button variant="outline" onClick={fetchPlans} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Liste des plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="border-none shadow-sm animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 w-32 bg-muted rounded mb-2"></div>
                <div className="h-4 w-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))
        ) : plans.length === 0 ? (
          <Card className="col-span-full border-none shadow-sm">
            <CardContent className="p-12 text-center">
              <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun plan d'abonnement disponible</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                Créer le premier plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className={`border-none shadow-sm hover:shadow-md transition-all ${!plan.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {plan.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground"> {plan.currency}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ {plan.duration_months} mois</span>
                </div>

                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{plan.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Jusqu'à {plan.max_employees} employés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-primary" />
                    <span>Jusqu'à {plan.max_services} services</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span>Jusqu'à {plan.max_products} produits</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditModal(plan)}>
                    <Edit className="h-4 w-4" />
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePlan(plan)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">Nouveau plan d'abonnement</h2>
                  <p className="text-sm text-muted-foreground">Configurez un nouveau plan pour les salons</p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeCreateModal} className="h-8 w-8 p-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <PlanForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreatePlan}
                onCancel={closeCreateModal}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">Modifier le plan</h2>
                  <p className="text-sm text-muted-foreground">{selectedPlan.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeEditModal} className="h-8 w-8 p-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <PlanForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleUpdatePlan}
                onCancel={closeEditModal}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}