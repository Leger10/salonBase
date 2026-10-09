// /src/pages/SuperAdminAdmins.jsx
import React, { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { 
  ShieldCheck, Search, Plus, UserPlus, Mail, Phone,
  MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle,
  RefreshCw, ChevronLeft, ChevronRight, Building2,
  Calendar, Clock, AlertCircle, Loader2, Sparkles, X,
  Users, UserCheck, UserX, UserCog, Save
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    tenant_id: '',
    password: ''
  });
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    tenant_id: '',
    is_active: true
  });
  const [tenants, setTenants] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');

  useEffect(() => {
    fetchAdmins();
    fetchTenants();
    fetchAvailableUsers();
  }, [searchTerm, currentPage]);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('subscription_status', 'active');
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, tenant_id')
        .neq('role', 'admin')
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*, tenants!inner(name, slug)', { count: 'exact' })
        .eq('role', 'admin');

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;
      if (error) throw error;

      setAdmins(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Erreur lors du chargement des administrateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!formData.tenant_id) {
      toast.error('Veuillez sélectionner un salon');
      return;
    }

    setFormLoading(true);
    try {
      // L'API cree le profil ET le compte credential dans une seule operation :
      // plus de second insert (qui entrait en conflit avec la table profiles).
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: 'admin',
          tenant_id: formData.tenant_id
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Erreur d'authentification: ${authError.message}`);
      }

      toast.success(`Administrateur "${formData.full_name}" créé avec succès`);
      setShowCreateModal(false);
      setFormData({ email: '', full_name: '', phone: '', tenant_id: '', password: '' });
      fetchAdmins();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error creating admin:', error);
      
      if (error.message?.includes('duplicate key')) {
        toast.error('Cet email est déjà utilisé');
      } else if (error.message?.includes('Bearer token')) {
        toast.error('Erreur d\'authentification admin. Vérifiez la clé Service Role.');
      } else {
        toast.error(`Erreur: ${error.message || 'Impossible de créer l\'administrateur'}`);
      }
    } finally {
      setFormLoading(false);
    }
  };

  // ✅ Fonction pour ouvrir le modal d'édition
  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setEditFormData({
      full_name: admin.full_name || '',
      phone: admin.phone || '',
      tenant_id: admin.tenant_id || '',
      is_active: admin.is_active || true
    });
    setShowEditModal(true);
  };

  // ✅ Fonction pour éditer un administrateur
  const handleEditAdmin = async () => {
    if (!selectedAdmin) {
      toast.error('Aucun administrateur sélectionné');
      return;
    }

    if (!editFormData.full_name) {
      toast.error('Le nom complet est requis');
      return;
    }

    if (!editFormData.tenant_id) {
      toast.error('Veuillez sélectionner un salon');
      return;
    }

    setFormLoading(true);
    try {
      // 1. Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          phone: editFormData.phone || null,
          tenant_id: editFormData.tenant_id,
          is_active: editFormData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAdmin.id);

      if (profileError) throw profileError;

      // 2. Mettre à jour les métadonnées de l'utilisateur dans Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        selectedAdmin.id,
        {
          user_metadata: {
            full_name: editFormData.full_name,
            role: 'admin'
          }
        }
      );

      if (authError) {
        console.error('Auth update error:', authError);
        // On continue même si l'update Auth échoue
        toast.warning('Profil mis à jour mais les métadonnées Auth n\'ont pas été synchronisées');
      }

      toast.success(`Administrateur "${editFormData.full_name}" modifié avec succès`);
      setShowEditModal(false);
      setSelectedAdmin(null);
      setEditFormData({ full_name: '', phone: '', tenant_id: '', is_active: true });
      fetchAdmins();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error editing admin:', error);
      toast.error(`Erreur: ${error.message || 'Impossible de modifier l\'administrateur'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedUserId) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }

    if (!selectedTenantId) {
      toast.error('Veuillez sélectionner un salon');
      return;
    }

    setFormLoading(true);
    try {
      const selectedUser = availableUsers.find(u => u.id === selectedUserId);
      if (!selectedUser) {
        toast.error('Utilisateur non trouvé');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          tenant_id: selectedTenantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUserId);

      if (updateError) throw updateError;

      // Mettre à jour les métadonnées Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        selectedUserId,
        {
          user_metadata: {
            full_name: selectedUser.full_name,
            role: 'admin'
          }
        }
      );

      if (authError) {
        console.error('Auth update error:', authError);
      }

      // Supprimer de clients/employees si nécessaire
      if (selectedUser.role === 'client') {
        await supabase
          .from('clients')
          .delete()
          .eq('profile_id', selectedUserId)
          .eq('tenant_id', selectedTenantId);
      }

      if (selectedUser.role === 'employee') {
        await supabase
          .from('employees')
          .delete()
          .eq('profile_id', selectedUserId)
          .eq('tenant_id', selectedTenantId);
      }

      toast.success(`"${selectedUser.full_name}" est maintenant administrateur`);
      setShowAssignModal(false);
      setSelectedUserId('');
      setSelectedTenantId('');
      fetchAdmins();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error assigning admin:', error);
      toast.error('Erreur lors de l\'assignation: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleAdminStatus = async (profileId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;
      
      toast.success(`Administrateur ${newStatus === 'active' ? 'activé' : 'désactivé'} avec succès`);
      fetchAdmins();
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleDeleteAdmin = async (profileId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet administrateur ?')) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (profileError) throw profileError;

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profileId);

      if (authError) {
        console.error('Auth delete error:', authError);
        toast.warning('Le profil a été supprimé mais l\'utilisateur Auth n\'a pas pu être supprimé');
      } else {
        toast.success('Administrateur supprimé avec succès');
      }

      fetchAdmins();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRevokeAdmin = async (profileId) => {
    if (!confirm('Retrograder cet administrateur en client ?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'client',
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      // Mettre à jour les métadonnées Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        profileId,
        {
          user_metadata: {
            role: 'client'
          }
        }
      );

      if (authError) {
        console.error('Auth update error:', authError);
      }

      toast.success('Administrateur rétrogradé en client');
      fetchAdmins();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error revoking admin:', error);
      toast.error('Erreur lors de la rétrogradation');
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ✅ Modal d'édition d'admin
  const EditAdminModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-background rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Modifier l'administrateur</h2>
              <p className="text-sm text-muted-foreground">
                {selectedAdmin?.email}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom complet *</label>
              <Input
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="+228 90 00 00 00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Salon *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background"
                value={editFormData.tenant_id}
                onChange={(e) => setEditFormData({ ...editFormData, tenant_id: e.target.value })}
              >
                <option value="">Sélectionner un salon</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <label className="text-sm font-medium">Statut</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="true"
                    checked={editFormData.is_active === true}
                    onChange={() => setEditFormData({ ...editFormData, is_active: true })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-green-600">Actif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="false"
                    checked={editFormData.is_active === false}
                    onChange={() => setEditFormData({ ...editFormData, is_active: false })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-red-600">Inactif</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleEditAdmin} 
              disabled={formLoading}
              className="gap-2"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal d'assignation d'admin
  const AssignAdminModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-background rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Assigner un administrateur</h2>
              <p className="text-sm text-muted-foreground">
                Sélectionnez un utilisateur existant pour le promouvoir administrateur
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAssignModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Utilisateur *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Sélectionner un utilisateur</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email}) - {user.role || 'Sans rôle'}
                    {user.tenant_id ? ` - ${tenants.find(t => t.id === user.tenant_id)?.name || 'Salon'}` : ' - Sans salon'}
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Aucun utilisateur disponible à promouvoir
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Salon *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
              >
                <option value="">Sélectionner un salon</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Ce que cela implique</p>
                  <ul className="text-xs list-disc list-inside mt-1 space-y-1">
                    <li>L'utilisateur obtiendra des droits d'administration</li>
                    <li>Il pourra gérer le salon sélectionné</li>
                    <li>Son rôle actuel sera remplacé</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAssignAdmin} 
              disabled={formLoading || !selectedUserId || !selectedTenantId}
              className="gap-2"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assignation...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Promouvoir administrateur
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal de création d'admin
  const CreateAdminModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-background rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Ajouter un administrateur</h2>
              <p className="text-sm text-muted-foreground">
                Créer un nouvel administrateur avec un compte
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom complet *</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@exemple.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+228 90 00 00 00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe *</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 caractères</p>
            </div>
            <div>
              <label className="text-sm font-medium">Salon *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background"
                value={formData.tenant_id}
                onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              >
                <option value="">Sélectionner un salon</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateAdmin} 
              disabled={formLoading}
              className="gap-2"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Créer l'administrateur
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Administrateurs</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} administrateurs sur la plateforme
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setShowAssignModal(true)}
            className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Users className="h-4 w-4" />
            Promouvoir un utilisateur
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un admin
          </Button>
          <Button variant="outline" onClick={fetchAdmins} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Admins</p>
                <p className="text-xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actifs</p>
                <p className="text-xl font-bold">
                  {admins.filter(a => a.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inactifs</p>
                <p className="text-xl font-bold">
                  {admins.filter(a => !a.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salons</p>
                <p className="text-xl font-bold">{tenants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un administrateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Liste des admins */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-purple-600" />
            Liste des administrateurs
            <Badge variant="outline" className="ml-2">{totalCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Administrateur</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Salon</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Inscrit le</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      Chargement...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-muted-foreground">
                      Aucun administrateur trouvé
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 font-bold text-sm">
                              {admin.full_name?.charAt(0) || 'A'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{admin.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {admin.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">{admin.email}</div>
                        <div className="text-xs text-muted-foreground">{admin.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span>{admin.tenants?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={admin.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {admin.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {/* ✅ Bouton Modifier */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditModal(admin)}
                            className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Modifier
                          </Button>
                          {admin.is_active ? (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleToggleAdminStatus(admin.id, admin.is_active)}
                              className="text-xs"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Désactiver
                            </Button>
                          ) : (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleToggleAdminStatus(admin.id, admin.is_active)}
                              className="bg-green-600 hover:bg-green-700 text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activer
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRevokeAdmin(admin.id)}
                            className="text-orange-600 hover:text-orange-700 text-xs"
                            title="Rétrograder en client"
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            <Trash2 className="h-3 w-3" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} administrateurs
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

      {/* Modals */}
      {showCreateModal && <CreateAdminModal />}
      {showAssignModal && <AssignAdminModal />}
      {showEditModal && <EditAdminModal />}
    </div>
  );
}