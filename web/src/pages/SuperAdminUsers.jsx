// /src/pages/SuperAdminUsers.jsx
import React, { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Users, Search, Filter, MoreHorizontal, Edit, Trash2, Eye,
  RefreshCw, ChevronLeft, ChevronRight, UserPlus, UserMinus,
  Mail, Phone, Calendar, Building2, ShieldCheck, UserCog,
  UserCheck, UserX, Clock, AlertCircle, CheckCircle, XCircle,
  Download, Upload, Printer, FilterX, SortAsc, SortDesc,
  Grid3x3, List, Settings, UserRound, UserCircle, UserSquare,
  ArrowUp, ArrowDown, Crown, Sparkles, Shield, User as UserIcon,
  Save, X, Loader2  // ✅ Loader2 ajouté ici
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [tenants, setTenants] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewMode, setViewMode] = useState("table");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [selectedNewRole, setSelectedNewRole] = useState("");
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // ✅ États pour l'édition et l'assignation
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignTenantModal, setShowAssignTenantModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    role: '',
    tenant_id: '',
    is_active: true
  });
  const [editLoading, setEditLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const [userStats, setUserStats] = useState({
    total: 0,
    admins: 0,
    employees: 0,
    clients: 0,
    active: 0,
    inactive: 0
  });

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [searchTerm, roleFilter, statusFilter, tenantFilter, currentPage, sortField, sortDirection]);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('subscription_status', 'active')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*, tenants(id, name, slug)', { count: 'exact' });

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }

      if (tenantFilter !== 'all') {
        query = query.eq('tenant_id', tenantFilter);
      }

      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const { data: statsData, error: statsError } = await supabase
        .from('profiles')
        .select('role, is_active');

      if (!statsError && statsData) {
        const total = statsData.length;
        const admins = statsData.filter(u => u.role === 'admin').length;
        const employees = statsData.filter(u => u.role === 'employee').length;
        const clients = statsData.filter(u => u.role === 'client').length;
        const active = statsData.filter(u => u.is_active === true).length;
        const inactive = statsData.filter(u => u.is_active === false).length;

        setUserStats({ total, admins, employees, clients, active, inactive });
      }

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Ouvrir le modal d'édition
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'client',
      tenant_id: user.tenant_id || '',
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setShowEditModal(true);
  };

  // ✅ Modifier un utilisateur
  const handleEditUser = async () => {
    if (!selectedUser) {
      toast.error('Aucun utilisateur sélectionné');
      return;
    }

    if (!editFormData.full_name) {
      toast.error('Le nom complet est requis');
      return;
    }

    setEditLoading(true);
    try {
      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          phone: editFormData.phone || null,
          role: editFormData.role,
          tenant_id: editFormData.tenant_id || null,
          is_active: editFormData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Si l'utilisateur est un admin ou super_admin, mettre à jour les métadonnées Auth
      if (editFormData.role === 'admin' || editFormData.role === 'super_admin') {
        try {
          await supabaseAdmin.auth.admin.updateUserById(
            selectedUser.id,
            {
              user_metadata: {
                full_name: editFormData.full_name,
                role: editFormData.role
              }
            }
          );
        } catch (authError) {
          console.warn('Auth update warning:', authError);
        }
      }

      toast.success(`Utilisateur "${editFormData.full_name}" modifié avec succès`);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error editing user:', error);
      toast.error(`Erreur: ${error.message || 'Impossible de modifier l\'utilisateur'}`);
    } finally {
      setEditLoading(false);
    }
  };

  // ✅ Ouvrir le modal d'assignation de salon
  const openAssignTenantModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      ...editFormData,
      tenant_id: user.tenant_id || ''
    });
    setShowAssignTenantModal(true);
  };

  // ✅ Assigner un salon à un utilisateur
  const handleAssignTenant = async () => {
    if (!selectedUser) {
      toast.error('Aucun utilisateur sélectionné');
      return;
    }

    if (!editFormData.tenant_id) {
      toast.error('Veuillez sélectionner un salon');
      return;
    }

    setAssignLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tenant_id: editFormData.tenant_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Si l'utilisateur est admin, mettre à jour les métadonnées Auth
      if (selectedUser.role === 'admin') {
        try {
          await supabaseAdmin.auth.admin.updateUserById(
            selectedUser.id,
            {
              user_metadata: {
                ...selectedUser.user_metadata,
                tenant_id: editFormData.tenant_id
              }
            }
          );
        } catch (authError) {
          console.warn('Auth update warning:', authError);
        }
      }

      const tenantName = tenants.find(t => t.id === editFormData.tenant_id)?.name || 'Salon';
      toast.success(`Utilisateur assigné au salon "${tenantName}" avec succès`);
      setShowAssignTenantModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error assigning tenant:', error);
      toast.error(`Erreur: ${error.message || 'Impossible d\'assigner le salon'}`);
    } finally {
      setAssignLoading(false);
    }
  };

  // ✅ Supprimer un utilisateur (version corrigée)
  const handleDeleteUserComplete = async (userId) => {
    setDeleteLoading(true);
    try {
      // 1. Récupérer l'email avant suppression
      const { data: userData, error: fetchError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Supprimer de la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // 3. Supprimer de auth.users via l'API admin
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Auth delete error:', authError);
        toast.warning('Le profil a été supprimé mais l\'utilisateur Auth n\'a pas pu être supprimé');
      } else {
        toast.success(`Utilisateur ${userData.email} supprimé avec succès`);
      }

      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erreur lors de la suppression complète de l\'utilisateur');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`);
      fetchUsers();
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.warning('Sélectionnez au moins un utilisateur');
      return;
    }

    try {
      if (action === 'activate') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: true })
          .in('id', selectedUsers);
        
        if (error) throw error;
        toast.success(`${selectedUsers.length} utilisateurs activés`);
      } else if (action === 'deactivate') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: false })
          .in('id', selectedUsers);
        
        if (error) throw error;
        toast.success(`${selectedUsers.length} utilisateurs désactivés`);
      } else if (action === 'delete') {
        toast.warning('La suppression en masse n\'est pas disponible. Supprimez un par un.');
        return;
      }

      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error('Erreur lors de l\'opération en masse');
    }
  };

  const handleDeleteUser = async (userId) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Nom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Salon', 'Inscrit le'];
      const rows = users.map(user => [
        user.full_name || '',
        user.email || '',
        user.phone || '',
        user.role || '',
        user.is_active ? 'Actif' : 'Inactif',
        user.tenants?.name || 'N/A',
        new Date(user.created_at).toLocaleDateString()
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Exportation réussie');
    } catch (error) {
      toast.error('Erreur lors de l\'exportation');
    }
  };

  // ✅ Changer le rôle d'un utilisateur
  const handleChangeRole = async () => {
    if (!roleChangeUser || !selectedNewRole) {
      toast.warning('Veuillez sélectionner un rôle');
      return;
    }

    if (roleChangeUser.role === selectedNewRole) {
      toast.info('L\'utilisateur a déjà ce rôle');
      setShowRoleModal(false);
      return;
    }

    setRoleChangeLoading(true);
    try {
      const tenantId = roleChangeUser.tenant_id;

      // 1. Mettre à jour le rôle dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: selectedNewRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleChangeUser.id);

      if (profileError) throw profileError;

      // 2. Mettre à jour les métadonnées Auth
      try {
        await supabaseAdmin.auth.admin.updateUserById(
          roleChangeUser.id,
          {
            user_metadata: {
              role: selectedNewRole
            }
          }
        );
      } catch (authError) {
        console.warn('Auth update warning:', authError);
      }

      // 3. Gérer les entrées dans les tables associées
      if (selectedNewRole === 'client') {
        await supabase
          .from('employees')
          .delete()
          .eq('profile_id', roleChangeUser.id)
          .eq('tenant_id', tenantId);
        
        await supabase
          .from('clients')
          .upsert({
            profile_id: roleChangeUser.id,
            tenant_id: tenantId,
            name: roleChangeUser.full_name || 'Client',
            email: roleChangeUser.email || '',
            phone: roleChangeUser.phone || '',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'profile_id,tenant_id'
          });
      } else if (selectedNewRole === 'employee') {
        await supabase
          .from('clients')
          .delete()
          .eq('profile_id', roleChangeUser.id)
          .eq('tenant_id', tenantId);

        const { data: existingEmp } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', roleChangeUser.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (!existingEmp) {
          const empNumber = `EMP${Date.now().toString().slice(-6)}`;
          await supabase
            .from('employees')
            .insert({
              profile_id: roleChangeUser.id,
              tenant_id: tenantId,
              employee_number: empNumber,
              is_active: true,
              created_at: new Date().toISOString()
            });
        }
      } else if (selectedNewRole === 'admin') {
        await supabase
          .from('clients')
          .delete()
          .eq('profile_id', roleChangeUser.id)
          .eq('tenant_id', tenantId);
        
        await supabase
          .from('employees')
          .delete()
          .eq('profile_id', roleChangeUser.id)
          .eq('tenant_id', tenantId);
      }

      toast.success(
        `Rôle changé : ${getRoleLabel(roleChangeUser.role)} → ${getRoleLabel(selectedNewRole)}`
      );

      setShowRoleModal(false);
      setRoleChangeUser(null);
      setSelectedNewRole("");
      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const roleMap = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      employee: 'Employé',
      client: 'Client'
    };
    return roleMap[role] || role;
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800 border-purple-200', icon: Crown },
      admin: { label: 'Admin', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: ShieldCheck },
      employee: { label: 'Employé', className: 'bg-green-100 text-green-800 border-green-200', icon: UserCog },
      client: { label: 'Client', className: 'bg-gray-100 text-gray-800 border-gray-200', icon: UserCircle }
    };
    return roleMap[role] || { label: role, className: 'bg-gray-100 text-gray-800', icon: UserRound };
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const toggleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ✅ Modal d'édition utilisateur
  const EditUserModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Modifier l'utilisateur</h2>
              <p className="text-sm text-muted-foreground">
                Modifier les informations de <strong>{selectedUser?.full_name}</strong>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom complet *</label>
              <Input
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                value={selectedUser?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="+228 90 00 00 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rôle</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="employee">Employé</option>
                <option value="client">Client</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Salon</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background"
                value={editFormData.tenant_id}
                onChange={(e) => setEditFormData({ ...editFormData, tenant_id: e.target.value })}
              >
                <option value="">Aucun salon</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
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
            <Button onClick={handleEditUser} disabled={editLoading}>
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ Modal d'assignation de salon
  const AssignTenantModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Assigner un salon</h2>
              <p className="text-sm text-muted-foreground">
                Assigner un salon à <strong>{selectedUser?.full_name}</strong>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAssignTenantModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Salon *</label>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Assignation d'un salon</p>
                  <p className="text-xs mt-1">
                    L'utilisateur pourra accéder aux ressources de ce salon
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAssignTenantModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleAssignTenant} disabled={assignLoading || !editFormData.tenant_id}>
              {assignLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
              Assigner
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ Modal de confirmation de suppression
  const DeleteConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Supprimer définitivement</h2>
              <p className="text-sm text-muted-foreground">
                Cette action est irréversible
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                ⚠️ Vous êtes sur le point de supprimer définitivement cet utilisateur.
              </p>
              <p className="text-sm text-red-700 font-medium mt-2">
                Cette action ne peut pas être annulée.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleDeleteUserComplete(userToDelete)}
                disabled={deleteLoading}
                className="gap-2"
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ Modal de changement de rôle
  const RoleChangeModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Changer le rôle</h2>
              <p className="text-sm text-muted-foreground">
                Utilisateur : <span className="font-medium">{roleChangeUser?.full_name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Rôle actuel : <Badge variant="outline" className={getRoleBadge(roleChangeUser?.role).className}>
                  {getRoleLabel(roleChangeUser?.role)}
                </Badge>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowRoleModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Nouveau rôle</label>
              <div className="grid grid-cols-2 gap-3">
                {['super_admin', 'admin', 'employee', 'client'].map((role) => {
                  const roleInfo = getRoleBadge(role);
                  const RoleIcon = roleInfo.icon;
                  const isSelected = selectedNewRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedNewRole(role)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <RoleIcon className={`h-6 w-6 mx-auto mb-1 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div className={`text-sm font-medium ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {roleInfo.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Attention</p>
                  <p className="text-xs">
                    Changer le rôle modifie les permissions de l'utilisateur.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleChangeRole}
                disabled={roleChangeLoading || roleChangeUser?.role === selectedNewRole}
                className="gap-2"
              >
                {roleChangeLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Modification...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Confirmer
                  </>
                )}
              </Button>
            </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} utilisateurs sur la plateforme
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{userStats.total}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><ShieldCheck className="h-5 w-5 text-purple-600" /></div>
              <div><p className="text-xs text-muted-foreground">Admins</p><p className="text-xl font-bold">{userStats.admins}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><UserCog className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-xs text-muted-foreground">Employés</p><p className="text-xl font-bold">{userStats.employees}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><UserCircle className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-muted-foreground">Clients</p><p className="text-xl font-bold">{userStats.clients}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><UserCheck className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-muted-foreground">Actifs</p><p className="text-xl font-bold">{userStats.active}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><UserX className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-xs text-muted-foreground">Inactifs</p><p className="text-xl font-bold">{userStats.inactive}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="px-3 py-2 border rounded-lg bg-background text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">Tous les rôles</option>
                <option value="admin">Admins</option>
                <option value="employee">Employés</option>
                <option value="client">Clients</option>
              </select>
              <select className="px-3 py-2 border rounded-lg bg-background text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
              <select className="px-3 py-2 border rounded-lg bg-background text-sm" value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
                <option value="all">Tous les salons</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setRoleFilter('all'); setStatusFilter('all'); setTenantFilter('all'); }}>
                <FilterX className="h-4 w-4 mr-2" /> Réinitialiser
              </Button>
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-sm font-medium">{selectedUsers.length} sélectionné(s)</span>
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')} className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" /> Activer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')} className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700">
                    <XCircle className="h-3 w-3 mr-1" /> Désactiver
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tableau des utilisateurs */}
      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des utilisateurs</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{totalCount} utilisateurs</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selectedUsers.length === users.length && users.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                  </th>
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Salon</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Inscrit le</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-8 text-muted-foreground">Chargement...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</td></tr>
                ) : (
                  users.map((user) => {
                    const role = getRoleBadge(user.role);
                    const RoleIcon = role.icon;
                    return (
                      <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleSelectUser(user.id)} className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">{getInitials(user.full_name)}</span>
                            </div>
                            <div>
                              <div className="font-medium">{user.full_name || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-sm"><Mail className="h-3 w-3 text-muted-foreground" /><span>{user.email}</span></div>
                            {user.phone && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3 w-3" /><span>{user.phone}</span></div>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={role.className}>
                            <span className="flex items-center gap-1"><RoleIcon className="h-3 w-3" />{role.label}</span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span>{user.tenants?.name || 'Aucun'}</span>
                            {!user.tenant_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAssignTenantModal(user)}
                                className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                                title="Assigner un salon"
                              >
                                <Building2 className="h-3 w-3 mr-1" />
                                Assigner
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setShowUserModal(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-700" title="Modifier">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setRoleChangeUser(user); setSelectedNewRole(user.role); setShowRoleModal(true); }} className="text-purple-600 hover:text-purple-700" title="Changer le rôle">
                              <Crown className="h-4 w-4" />
                            </Button>
                            {user.is_active ? (
                              <Button variant="ghost" size="sm" onClick={() => handleToggleUserStatus(user.id, user.is_active)} className="text-yellow-600 hover:text-yellow-700" title="Désactiver">
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleToggleUserStatus(user.id, user.is_active)} className="text-green-600 hover:text-green-700" title="Activer">
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-700" title="Supprimer définitivement">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
            Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) pageNumber = i + 1;
              else if (currentPage <= 3) pageNumber = i + 1;
              else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i;
              else pageNumber = currentPage - 2 + i;
              return (
                <Button key={pageNumber} variant={currentPage === pageNumber ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNumber)}>
                  {pageNumber}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDeleteModal && <DeleteConfirmationModal />}
      {showRoleModal && <RoleChangeModal />}
      {showEditModal && <EditUserModal />}
      {showAssignTenantModal && <AssignTenantModal />}
      
      {/* Modal de détails utilisateur */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Détails de l'utilisateur</h2>
                  <p className="text-muted-foreground">ID: {selectedUser.id}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowUserModal(false)}><X className="h-5 w-5" /></Button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{getInitials(selectedUser.full_name)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedUser.full_name || 'N/A'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getRoleBadge(selectedUser.role).className}>
                        {getRoleBadge(selectedUser.role).label}
                      </Badge>
                      <Badge className={selectedUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {selectedUser.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selectedUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                    <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selectedUser.phone || 'Non renseigné'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Salon</label>
                    <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{selectedUser.tenants?.name || 'Aucun salon'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Inscrit le</label>
                    <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(selectedUser.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button variant="outline" className="text-blue-600 hover:text-blue-700" onClick={() => { setShowUserModal(false); openEditModal(selectedUser); }}>
                    <Edit className="h-4 w-4 mr-2" /> Modifier
                  </Button>
                  <Button variant="outline" className="text-purple-600 hover:text-purple-700" onClick={() => { setShowUserModal(false); setRoleChangeUser(selectedUser); setSelectedNewRole(selectedUser.role); setShowRoleModal(true); }}>
                    <Crown className="h-4 w-4 mr-2" /> Changer le rôle
                  </Button>
                  {!selectedUser.tenant_id && (
                    <Button variant="outline" className="text-green-600 hover:text-green-700" onClick={() => { setShowUserModal(false); openAssignTenantModal(selectedUser); }}>
                      <Building2 className="h-4 w-4 mr-2" /> Assigner un salon
                    </Button>
                  )}
                  <Button variant={selectedUser.is_active ? 'destructive' : 'default'} onClick={() => { handleToggleUserStatus(selectedUser.id, selectedUser.is_active); setShowUserModal(false); }}>
                    {selectedUser.is_active ? <><UserMinus className="h-4 w-4 mr-2" /> Désactiver</> : <><UserPlus className="h-4 w-4 mr-2" /> Activer</>}
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => { setShowUserModal(false); handleDeleteUser(selectedUser.id); }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}