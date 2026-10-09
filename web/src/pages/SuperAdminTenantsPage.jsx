// /src/pages/SuperAdminTenants.jsx
import React, { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { 
  Building2, Search, Plus, Filter,
  Edit, Trash2, Eye, CheckCircle, XCircle, AlertCircle,
  Mail, Phone, RefreshCw, ChevronLeft, ChevronRight, Users,
  DollarSign, Loader2, UserPlus, Shield,
  Sparkles, Save, X, Check, AlertTriangle, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [slugCheckLoading, setSlugCheckLoading] = useState(false);
  const [slugIsUnique, setSlugIsUnique] = useState(true);
  const [slugMessage, setSlugMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    slug: "",
    description: "",
    subscription_plan: "starter",
    subscription_status: "pending",
    subscription_mode: "subscription",
    external_payment_ref: "",
    external_payment_expiry: ""
  });
  const [adminData, setAdminData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [createWithAdmin, setCreateWithAdmin] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, [searchTerm, statusFilter, currentPage]);

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const checkSlugUniqueness = async (slug, excludeId = null) => {
    if (!slug) {
      setSlugIsUnique(false);
      setSlugMessage("Le slug est requis");
      return false;
    }

    setSlugCheckLoading(true);
    try {
      let query = supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const isUnique = data.length === 0;
      setSlugIsUnique(isUnique);
      
      if (isUnique) {
        setSlugMessage("✓ Slug disponible");
      } else {
        setSlugMessage(`✗ Le slug "${slug}" est déjà utilisé`);
      }
      
      return isUnique;
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugIsUnique(false);
      setSlugMessage("Erreur lors de la vérification");
      return false;
    } finally {
      setSlugCheckLoading(false);
    }
  };

  const generateUniqueSlug = async (baseSlug, excludeId = null) => {
    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      let query = supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data.length === 0) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }
    return slug;
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tenants')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('subscription_status', statusFilter);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;
      if (error) throw error;

      const tenantsWithStats = await Promise.all(
        (data || []).map(async (tenant) => {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          const { count: appointmentCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          const { data: revenueData } = await supabase
            .from('transactions')
            .select('amount')
            .eq('tenant_id', tenant.id)
            .eq('status', 'completed');

          const totalRevenue = revenueData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          return {
            ...tenant,
            userCount: userCount || 0,
            appointmentCount: appointmentCount || 0,
            totalRevenue
          };
        })
      );

      setTenants(tenantsWithStats);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Erreur lors du chargement des salons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Le nom et l'email sont requis");
      return;
    }

    if (createWithAdmin && (!adminData.full_name || !adminData.email || !adminData.password)) {
      toast.error("Tous les champs de l'administrateur sont requis");
      return;
    }

    setFormLoading(true);
    try {
      let baseSlug = formData.slug || generateSlug(formData.name);
      const uniqueSlug = await generateUniqueSlug(baseSlug, null);
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          slug: uniqueSlug,
          description: formData.description || null,
          subscription_plan: formData.subscription_plan || 'starter',
          subscription_status: formData.subscription_status || 'pending',
          subscription_mode: formData.subscription_mode || 'subscription',
          external_payment_ref: formData.subscription_mode === 'external' ? formData.external_payment_ref : null,
          external_payment_expiry: formData.subscription_mode === 'external' ? formData.external_payment_expiry : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      if (createWithAdmin && tenant) {
        // L'API cree le profil ET le compte credential en une fois ; elle
        // rattache directement l'admin au salon qui vient d'etre cree.
        const { error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: adminData.email,
          password: adminData.password,
          email_confirm: true,
          user_metadata: {
            full_name: adminData.full_name,
            phone: adminData.phone || null,
            role: 'admin',
            tenant_id: tenant.id
          }
        });

        if (authError) throw new Error(`Auth error: ${authError.message}`);

        toast.success(`Salon "${formData.name}" créé avec l'administrateur ${adminData.full_name}`);
      } else {
        toast.success(`Salon "${formData.name}" créé avec succès`);
      }

      setShowCreateModal(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error creating tenant:', error);
      if (error.message?.includes('duplicate key')) {
        toast.error('Ce nom de salon existe déjà. Veuillez en choisir un autre.');
      } else {
        toast.error(`Erreur: ${error.message || 'Impossible de créer le salon'}`);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditTenant = async () => {
    if (!selectedTenant || !formData.name) {
      toast.error("Le nom est requis");
      return;
    }

    setFormLoading(true);
    try {
      let baseSlug = formData.slug || generateSlug(formData.name);
      const isUnique = await checkSlugUniqueness(baseSlug, selectedTenant.id);
      
      let finalSlug = baseSlug;
      if (!isUnique) {
        finalSlug = await generateUniqueSlug(baseSlug, selectedTenant.id);
        toast.info(`Le slug a été modifié en "${finalSlug}" car il était déjà utilisé`);
      }
      
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          slug: finalSlug,
          description: formData.description || null,
          subscription_plan: formData.subscription_plan,
          subscription_status: formData.subscription_status,
          subscription_mode: formData.subscription_mode || 'subscription',
          external_payment_ref: formData.subscription_mode === 'external' ? formData.external_payment_ref : null,
          external_payment_expiry: formData.subscription_mode === 'external' ? formData.external_payment_expiry : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTenant.id);

      if (error) throw error;

      toast.success("Salon modifié avec succès");
      setShowEditModal(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error editing tenant:', error);
      if (error.message?.includes('duplicate key')) {
        toast.error('Ce nom de salon existe déjà. Veuillez en choisir un autre.');
      } else {
        toast.error('Erreur lors de la modification');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;

    try {
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', selectedTenant.id);

      if (appointmentsCount > 0) {
        toast.error('Impossible de supprimer ce salon car il a des rendez-vous associés');
        return;
      }

      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', selectedTenant.id);

      if (error) throw error;
      
      toast.success('Salon supprimé avec succès');
      setShowDeleteModal(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleStatus = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          subscription_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;
      
      toast.success(`Salon ${newStatus === 'active' ? 'activé' : 'désactivé'} avec succès`);
      fetchTenants();
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      slug: "",
      description: "",
      subscription_plan: "starter",
      subscription_status: "pending",
      subscription_mode: "subscription",
      external_payment_ref: "",
      external_payment_expiry: ""
    });
    setAdminData({
      full_name: "",
      email: "",
      phone: "",
      password: ""
    });
    setSelectedTenant(null);
    setSlugIsUnique(true);
    setSlugMessage("");
  };

  const openEditModal = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      slug: tenant.slug || "",
      description: tenant.description || "",
      subscription_plan: tenant.subscription_plan || "starter",
      subscription_status: tenant.subscription_status || "pending",
      subscription_mode: tenant.subscription_mode || "subscription",
      external_payment_ref: tenant.external_payment_ref || "",
      external_payment_expiry: tenant.external_payment_expiry || ""
    });
    setSlugIsUnique(true);
    setSlugMessage("");
    setShowEditModal(true);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = generateSlug(name);
    setFormData({ ...formData, name, slug });
    if (slug) {
      checkSlugUniqueness(slug, null);
    }
  };

  const handleSlugChange = (e) => {
    const slug = generateSlug(e.target.value);
    setFormData({ ...formData, slug });
    if (slug) {
      const excludeId = selectedTenant?.id || null;
      checkSlugUniqueness(slug, excludeId);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: 'Actif', className: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactif', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Expiré', className: 'bg-yellow-100 text-yellow-800' },
      pending: { label: 'En attente', className: 'bg-blue-100 text-blue-800' }
    };
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const SlugStatus = () => {
    if (!formData.slug) return null;
    if (slugCheckLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    
    return (
      <div className="flex items-center gap-1 mt-1">
        {slugIsUnique ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
        <span className={`text-xs ${slugIsUnique ? 'text-green-600' : 'text-red-600'}`}>
          {slugMessage}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Salons</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} salons inscrits sur la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau salon
          </Button>
          <Button variant="outline" onClick={fetchTenants}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un salon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border rounded-lg bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
            <option value="expired">Expirés</option>
            <option value="pending">En attente</option>
          </select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Liste des salons */}
      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Salon</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-center">Utilisateurs</th>
                  <th className="px-4 py-3 font-medium text-right">CA</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-muted-foreground">
                      Aucun salon trouvé
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const status = getStatusBadge(tenant.subscription_status);
                    return (
                      <tr key={tenant.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{tenant.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {tenant.slug} • Créé le {new Date(tenant.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">{tenant.email}</div>
                          <div className="text-xs text-muted-foreground">{tenant.phone || '-'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="capitalize">
                            {tenant.subscription_plan || 'Starter'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          {tenant.subscription_mode === 'external' ? (
                            <Badge className="bg-purple-100 text-purple-800">
                              💳 Externe
                            </Badge>
                          ) : tenant.subscription_mode === 'free' ? (
                            <Badge className="bg-green-100 text-green-800">
                              🎁 Gratuit
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">
                              📋 Abonnement
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={status.className}>
                            {status.label}
                          </Badge>
                          {tenant.subscription_end && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Expire le {new Date(tenant.subscription_end).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="text-sm font-medium">{tenant.userCount}</div>
                          <div className="text-xs text-muted-foreground">
                            {tenant.appointmentCount} RDV
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="text-sm font-medium text-green-600">
                            {tenant.totalRevenue.toLocaleString()} FCFA
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(tenant)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/super-admin/tenants/${tenant.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {tenant.subscription_status !== 'active' ? (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleToggleStatus(tenant.id, tenant.subscription_status)}
                                className="bg-green-600 hover:bg-green-700 h-8 px-2"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activer
                              </Button>
                            ) : (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleToggleStatus(tenant.id, tenant.subscription_status)}
                                className="h-8 px-2"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Désactiver
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
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
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} salons
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

      {/* MODAL DE CRÉATION */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Créer un nouveau salon</h2>
                  <p className="text-muted-foreground">Un administrateur sera créé automatiquement</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Informations du salon */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Informations du salon
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nom du salon *</label>
                      <Input
                        value={formData.name}
                        onChange={handleNameChange}
                        placeholder="Ex: Beauty Coiffure"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Slug (identifiant) *</label>
                      <div className="relative">
                        <Input
                          value={formData.slug}
                          onChange={handleSlugChange}
                          placeholder="beauty-coiffure"
                          className={`font-mono text-sm ${!slugIsUnique && formData.slug ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {slugCheckLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                      </div>
                      <SlugStatus />
                      <p className="text-xs text-muted-foreground">
                        Identifiant unique utilisé dans l'URL. Généré automatiquement à partir du nom.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email *</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contact@salon.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Téléphone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+225 XX XX XX XX"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description du salon..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Plan d'abonnement</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        value={formData.subscription_plan}
                        onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                      >
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Statut</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        value={formData.subscription_status}
                        onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                      >
                        <option value="pending">En attente</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mode d'abonnement */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Mode d'abonnement
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        id="mode_subscription"
                        name="subscription_mode"
                        value="subscription"
                        checked={formData.subscription_mode === 'subscription'}
                        onChange={(e) => setFormData({ ...formData, subscription_mode: e.target.value })}
                        className="h-4 w-4"
                      />
                      <label htmlFor="mode_subscription" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">📋 Abonnement</p>
                        <p className="text-xs text-muted-foreground">Paiement récurrent mensuel</p>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        id="mode_external"
                        name="subscription_mode"
                        value="external"
                        checked={formData.subscription_mode === 'external'}
                        onChange={(e) => setFormData({ ...formData, subscription_mode: e.target.value })}
                        className="h-4 w-4"
                      />
                      <label htmlFor="mode_external" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">💳 Paiement externe</p>
                        <p className="text-xs text-muted-foreground">Forfait payé hors plateforme</p>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        id="mode_free"
                        name="subscription_mode"
                        value="free"
                        checked={formData.subscription_mode === 'free'}
                        onChange={(e) => setFormData({ ...formData, subscription_mode: e.target.value })}
                        className="h-4 w-4"
                      />
                      <label htmlFor="mode_free" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">🎁 Gratuit (Essai)</p>
                        <p className="text-xs text-muted-foreground">Accès limité sans abonnement</p>
                      </label>
                    </div>
                  </div>
                  
                  {formData.subscription_mode === 'external' && (
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg mt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Référence de paiement</label>
                        <Input
                          value={formData.external_payment_ref}
                          onChange={(e) => setFormData({ ...formData, external_payment_ref: e.target.value })}
                          placeholder="Facture #12345"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date d'expiration</label>
                        <Input
                          type="date"
                          value={formData.external_payment_expiry}
                          onChange={(e) => setFormData({ ...formData, external_payment_expiry: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Administrateur */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      Administrateur
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Créer un admin</span>
                      <input
                        type="checkbox"
                        checked={createWithAdmin}
                        onChange={(e) => setCreateWithAdmin(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                  {createWithAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nom complet *</label>
                        <Input
                          value={adminData.full_name}
                          onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })}
                          placeholder="Jean Dupont"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email *</label>
                        <Input
                          type="email"
                          value={adminData.email}
                          onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                          placeholder="admin@salon.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Téléphone</label>
                        <Input
                          value={adminData.phone}
                          onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                          placeholder="+225 XX XX XX XX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Mot de passe *</label>
                        <Input
                          type="password"
                          value={adminData.password}
                          onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                          placeholder="••••••••"
                        />
                        <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleCreateTenant} 
                    disabled={formLoading || (formData.slug && !slugIsUnique)} 
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
                        Créer le salon
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL D'ÉDITION */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Modifier le salon</h2>
                  <p className="text-muted-foreground">{selectedTenant.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setShowEditModal(false); resetForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom du salon *</label>
                    <Input
                      value={formData.name}
                      onChange={handleNameChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slug</label>
                    <Input
                      value={formData.slug}
                      onChange={handleSlugChange}
                      className={`font-mono text-sm ${!slugIsUnique && formData.slug ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    <SlugStatus />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan d'abonnement</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      value={formData.subscription_plan}
                      onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      value={formData.subscription_status}
                      onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                    >
                      <option value="pending">En attente</option>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="expired">Expiré</option>
                    </select>
                  </div>
                </div>

                {/* Mode d'abonnement dans l'édition */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Mode d'abonnement
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        id="edit_mode_subscription"
                        name="edit_subscription_mode"
                        value="subscription"
                        checked={formData.subscription_mode === 'subscription'}
                        onChange={(e) => setFormData({ ...formData, subscription_mode: e.target.value })}
                        className="h-4 w-4"
                      />
                      <label htmlFor="edit_mode_subscription" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">📋 Abonnement</p>
                        <p className="text-xs text-muted-foreground">Paiement récurrent mensuel</p>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        id="edit_mode_external"
                        name="edit_subscription_mode"
                        value="external"
                        checked={formData.subscription_mode === 'external'}
                        onChange={(e) => setFormData({ ...formData, subscription_mode: e.target.value })}
                        className="h-4 w-4"
                      />
                      <label htmlFor="edit_mode_external" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">💳 Paiement externe</p>
                        <p className="text-xs text-muted-foreground">Forfait payé hors plateforme</p>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        id="edit_mode_free"
                        name="edit_subscription_mode"
                        value="free"
                        checked={formData.subscription_mode === 'free'}
                        onChange={(e) => setFormData({ ...formData, subscription_mode: e.target.value })}
                        className="h-4 w-4"
                      />
                      <label htmlFor="edit_mode_free" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">🎁 Gratuit (Essai)</p>
                        <p className="text-xs text-muted-foreground">Accès limité sans abonnement</p>
                      </label>
                    </div>
                  </div>
                  
                  {formData.subscription_mode === 'external' && (
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg mt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Référence de paiement</label>
                        <Input
                          value={formData.external_payment_ref}
                          onChange={(e) => setFormData({ ...formData, external_payment_ref: e.target.value })}
                          placeholder="Facture #12345"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date d'expiration</label>
                        <Input
                          type="date"
                          value={formData.external_payment_expiry}
                          onChange={(e) => setFormData({ ...formData, external_payment_expiry: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => { setShowEditModal(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleEditTenant} 
                    disabled={formLoading || (formData.slug && !slugIsUnique)} 
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
        </div>
      )}

      {/* MODAL DE SUPPRESSION */}
      {showDeleteModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold">Confirmer la suppression</h2>
              <p className="text-muted-foreground mt-2">
                Êtes-vous sûr de vouloir supprimer le salon <span className="font-semibold">"{selectedTenant.name}"</span> ?
                <br />
                Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowDeleteModal(false); setSelectedTenant(null); }}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteTenant}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}