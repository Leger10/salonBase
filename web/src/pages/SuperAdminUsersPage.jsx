import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/layouts/DashboardLayout.jsx';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Users, // ✅ AJOUT DE L'IMPORT Users
  Mail,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  RefreshCw,
  Crown,
  Building2,
  CreditCard,
  Clock,
  Ban,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [promoteData, setPromoteData] = useState({ role: 'admin', tenant_id: '' });
  const [tenants, setTenants] = useState([]);
  const [notification, setNotification] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'active',
    plan: 'pro',
    trial_ends_at: null
  });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [currentPage, searchTerm]);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_status, subscription_end');
      if (!error) setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select(`
          *,
          tenants!profiles_tenant_id_fkey (
            id,
            name,
            subscription_status,
            subscription_plan,
            subscription_end,
            trial_ends_at
          )
        `, { count: 'exact' });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setUsers(data || []);
      setTotalUsers(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // ✅ Promouvoir un utilisateur (Super Admin uniquement)
  const handlePromoteUser = async () => {
    try {
      if (!promoteData.tenant_id && promoteData.role !== 'super_admin') {
        toast.error('Veuillez sélectionner un salon');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          role: promoteData.role,
          tenant_id: promoteData.role === 'super_admin' ? null : promoteData.tenant_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Si promotion en admin, créer un tenant avec essai gratuit
      if (promoteData.role === 'admin' && promoteData.tenant_id) {
        // Mettre à jour le tenant avec un essai gratuit
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30); // 1 mois d'essai

        await supabase
          .from('tenants')
          .update({
            subscription_status: 'trial',
            subscription_plan: 'pro',
            trial_ends_at: trialEnd.toISOString(),
            subscription_end: trialEnd.toISOString()
          })
          .eq('id', promoteData.tenant_id);
      }

      toast.success(`Utilisateur promu ${promoteData.role === 'super_admin' ? 'Super Admin' : promoteData.role} avec succès`);
      setShowPromoteModal(false);
      fetchUsers();
      fetchTenants();
    } catch (error) {
      console.error('Erreur promotion:', error);
      toast.error('Erreur lors de la promotion');
    }
  };

  // ✅ Gérer l'abonnement d'un utilisateur
  const handleManageSubscription = async () => {
    try {
      const updates = {
        subscription_status: subscriptionData.status,
        subscription_plan: subscriptionData.plan,
        updated_at: new Date().toISOString()
      };

      if (subscriptionData.status === 'active') {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        updates.subscription_end = endDate.toISOString();
      }

      if (subscriptionData.status === 'trial') {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        updates.trial_ends_at = trialEnd.toISOString();
        updates.subscription_end = trialEnd.toISOString();
      }

      if (subscriptionData.status === 'inactive' || subscriptionData.status === 'expired') {
        updates.subscription_end = null;
        updates.trial_ends_at = null;
      }

      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', selectedUser?.tenant_id);

      if (error) throw error;

      toast.success('Abonnement mis à jour avec succès');
      setShowSubscriptionModal(false);
      fetchUsers();
      fetchTenants();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // ✅ Activer/Désactiver un utilisateur
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      showNotification(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'}`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du changement de statut', 'error');
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      super_admin: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Super Admin', icon: Crown },
      admin: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Admin', icon: Shield },
      employee: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Employé', icon: User },
      client: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Client', icon: User }
    };
    const roleInfo = roles[role] || roles.client;
    const Icon = roleInfo.icon;
    return (
      <Badge className={`${roleInfo.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {roleInfo.label}
      </Badge>
    );
  };

  const getSubscriptionBadge = (status) => {
    const statuses = {
      active: { color: 'bg-green-100 text-green-800', label: 'Actif' },
      trial: { color: 'bg-blue-100 text-blue-800', label: 'Essai gratuit' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expiré' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactif' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' }
    };
    const info = statuses[status] || statuses.inactive;
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {isActive ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
        {isActive ? 'Actif' : 'Inactif'}
      </Badge>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  // Statistiques
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    employees: users.filter(u => u.role === 'employee').length,
    clients: users.filter(u => u.role === 'client').length
  };

  return (
    <div className="space-y-6">
      <div className="p-6">
        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
            notification.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Check className="w-5 h-5 text-green-500" />
              )}
              <span className={notification.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                {notification.message}
              </span>
            </div>
            <button onClick={() => setNotification(null)}>
              <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
            <p className="text-gray-600 mt-1">Gérez tous les utilisateurs et leurs rôles</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchUsers()}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <User className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Actifs</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactifs</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Employés</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.employees}</p>
                </div>
                <User className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Clients</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.clients}</p>
                </div>
                <Users className="w-8 h-8 text-gray-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abonnement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>Aucun utilisateur trouvé</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-medium text-gray-900">{user.full_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {user.tenants?.name || 'Non assigné'}
                          </span>
                          {user.tenants?.trial_ends_at && (
                            <div className="text-xs text-blue-600 mt-1">
                              Essai jusqu'au {formatDate(user.tenants.trial_ends_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.tenants?.subscription_status ? (
                            getSubscriptionBadge(user.tenants.subscription_status)
                          ) : (
                            <span className="text-sm text-gray-400">Aucun</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(user.is_active)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Activer/Désactiver */}
                            <button
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.is_active 
                                  ? 'text-red-600 hover:bg-red-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>

                            {/* Promouvoir (Super Admin uniquement) */}
                            {user.role !== 'super_admin' && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setPromoteData({ 
                                    role: 'admin', 
                                    tenant_id: user.tenant_id || '' 
                                  });
                                  setShowPromoteModal(true);
                                }}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Promouvoir"
                              >
                                <Crown className="w-4 h-4" />
                              </button>
                            )}

                            {/* Gérer l'abonnement */}
                            {user.role === 'admin' && user.tenant_id && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSubscriptionData({
                                    status: user.tenants?.subscription_status || 'inactive',
                                    plan: user.tenants?.subscription_plan || 'pro',
                                    trial_ends_at: user.tenants?.trial_ends_at || null
                                  });
                                  setShowSubscriptionModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Gérer l'abonnement"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}

                            {/* Voir détails */}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Affichage de {users.length} utilisateurs sur {totalUsers}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Promotion */}
        <Dialog open={showPromoteModal} onOpenChange={setShowPromoteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promouvoir l'utilisateur</DialogTitle>
              <DialogDescription>
                Promouvoir <strong>{selectedUser?.full_name}</strong> à un nouveau rôle.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <Select
                  value={promoteData.role}
                  onValueChange={(value) => setPromoteData({ ...promoteData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employé</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {promoteData.role !== 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Salon</label>
                  <Select
                    value={promoteData.tenant_id}
                    onValueChange={(value) => setPromoteData({ ...promoteData, tenant_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un salon" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.subscription_status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {promoteData.role === 'admin' && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <Clock className="h-4 w-4 inline mr-2" />
                  L'admin bénéficiera d'un essai gratuit de 1 mois
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPromoteModal(false)}>
                Annuler
              </Button>
              <Button onClick={handlePromoteUser}>
                <Crown className="h-4 w-4 mr-2" />
                Promouvoir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Abonnement */}
        <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gérer l'abonnement</DialogTitle>
              <DialogDescription>
                Gérer l'abonnement de <strong>{selectedUser?.full_name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <Select
                  value={subscriptionData.status}
                  onValueChange={(value) => setSubscriptionData({ ...subscriptionData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="trial">Essai gratuit</SelectItem>
                    <SelectItem value="expired">Expiré</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plan</label>
                <Select
                  value={subscriptionData.plan}
                  onValueChange={(value) => setSubscriptionData({ ...subscriptionData, plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {subscriptionData.status === 'trial' && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <Clock className="h-4 w-4 inline mr-2" />
                  L'essai gratuit sera activé pour 30 jours
                </div>
              )}
              {subscriptionData.status === 'active' && (
                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  <Check className="h-4 w-4 inline mr-2" />
                  L'abonnement sera actif pour 1 mois
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubscriptionModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleManageSubscription}>
                <CreditCard className="h-4 w-4 mr-2" />
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Détails */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails de l'utilisateur</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(selectedUser.role)}
                      {getStatusBadge(selectedUser.is_active)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p>{selectedUser.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inscrit le</p>
                    <p>{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salon</p>
                    <p>{selectedUser.tenants?.name || 'Aucun'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Abonnement</p>
                    {selectedUser.tenants?.subscription_status ? (
                      getSubscriptionBadge(selectedUser.tenants.subscription_status)
                    ) : (
                      <span className="text-sm text-gray-400">Aucun</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


