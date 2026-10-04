// /src/pages/AdminPlanningsPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  FileText,
  Gift,
  GraduationCap,
  Star,
  TrendingUp,
  CalendarPlus,
  Link as LinkIcon,
  EyeOff,
  Loader2,
  ChevronDown,
  Search,
  X,
  Sparkles,
  Video,
  Upload,
  Play,
  FileVideo,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";

// ============================================
// CONSTANTES
// ============================================
const PUBLICATION_TYPES = [
  { value: "announcement", label: "📢 Annonce", icon: Megaphone },
  { value: "promotion", label: "🎉 Promotion", icon: Gift },
  { value: "ad", label: "📰 Publicité", icon: TrendingUp },
  { value: "training", label: "🎓 Formation", icon: GraduationCap },
  { value: "event", label: "📅 Événement", icon: CalendarPlus },
];

const STATUSES = [
  { value: "draft", label: "Brouillon", color: "bg-gray-500" },
  { value: "published", label: "Publié", color: "bg-green-500" },
  { value: "scheduled", label: "Programmé", color: "bg-blue-500" },
  { value: "archived", label: "Archivé", color: "bg-gray-700" },
];

// ============================================
// PAGE PRINCIPALE
// ============================================
export default function AdminPlanningsPage() {
  const { currentUser } = useAuth();
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    type: "announcement",
    status: "draft",
    image_url: "",
    video_url: "",
    link_url: "",
    start_date: "",
    end_date: "",
    is_highlighted: false,
    display_order: 0,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPublication, setPreviewPublication] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState("image"); // "image" or "video"

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================
  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setPublications([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("publications")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPublications(data || []);
    } catch (error) {
      console.error("Error fetching publications:", error);
      toast.error("Erreur lors du chargement des publications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, [typeFilter, statusFilter]);

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Configuration du salon non trouvée");
        return;
      }

      const payload = {
        tenant_id: tenantId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        type: formData.type,
        status: formData.status,
        image_url: formData.image_url || null,
        video_url: formData.video_url || null,
        link_url: formData.link_url || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_highlighted: formData.is_highlighted,
        display_order: parseInt(formData.display_order) || 0,
        updated_at: new Date().toISOString(),
      };

      if (editingPublication) {
        const { error } = await supabase
          .from("publications")
          .update(payload)
          .eq("id", editingPublication.id);

        if (error) throw error;
        toast.success("Publication mise à jour");
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("publications")
          .insert([payload]);

        if (error) throw error;
        toast.success("Publication créée avec succès");
      }

      setIsModalOpen(false);
      resetForm();
      fetchPublications();
    } catch (error) {
      console.error("Error saving publication:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content: "",
      type: "announcement",
      status: "draft",
      image_url: "",
      video_url: "",
      link_url: "",
      start_date: "",
      end_date: "",
      is_highlighted: false,
      display_order: 0,
    });
    setEditingPublication(null);
    setSelectedMediaType("image");
  };

  const handleEdit = (publication) => {
    setEditingPublication(publication);
    setFormData({
      title: publication.title || "",
      description: publication.description || "",
      content: publication.content || "",
      type: publication.type || "announcement",
      status: publication.status || "draft",
      image_url: publication.image_url || "",
      video_url: publication.video_url || "",
      link_url: publication.link_url || "",
      start_date: publication.start_date || "",
      end_date: publication.end_date || "",
      is_highlighted: publication.is_highlighted || false,
      display_order: publication.display_order || 0,
    });
    // Déterminer le type de média
    if (publication.video_url) {
      setSelectedMediaType("video");
    } else if (publication.image_url) {
      setSelectedMediaType("image");
    } else {
      setSelectedMediaType("image");
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    try {
      const { error } = await supabase
        .from("publications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Publication supprimée");
      fetchPublications();
    } catch (error) {
      console.error("Error deleting publication:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("publications")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Statut mis à jour: ${STATUSES.find(s => s.value === newStatus)?.label}`);
      fetchPublications();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  // ============================================
  // UPLOAD IMAGE
  // ============================================
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) throw new Error("Tenant non trouvé");

      const fileExt = file.name.split('.').pop();
      const fileName = `publications/${tenantId}/images/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success("Image uploadée avec succès");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImage(false);
    }
  };

  // ============================================
  // UPLOAD VIDEO
  // ============================================
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i)) {
      toast.error("Format de vidéo non supporté. Utilisez MP4, WebM, OGG, MOV, AVI, WMV, FLV ou MKV.");
      return;
    }

    // Vérifier la taille (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("La vidéo ne doit pas dépasser 100MB");
      return;
    }

    setUploadingVideo(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) throw new Error("Tenant non trouvé");

      const fileExt = file.name.split('.').pop();
      const fileName = `publications/${tenantId}/videos/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(fileName);

      setFormData({ ...formData, video_url: publicUrl });
      toast.success("Vidéo uploadée avec succès");
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Erreur lors de l'upload de la vidéo");
    } finally {
      setUploadingVideo(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getTypeIcon = (type) => {
    const found = PUBLICATION_TYPES.find(t => t.value === type);
    if (found) {
      const Icon = found.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Megaphone className="h-4 w-4" />;
  };

  const getTypeLabel = (type) => {
    return PUBLICATION_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      published: "bg-green-500/20 text-green-400 border-green-500/30",
      scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      archived: "bg-gray-700/20 text-gray-400 border-gray-700/30",
    };

    return (
      <Badge className={colors[status] || "bg-gray-500/20"}>
        {status === "draft" && "📝 Brouillon"}
        {status === "published" && "✅ Publié"}
        {status === "scheduled" && "📅 Programmé"}
        {status === "archived" && "📦 Archivé"}
      </Badge>
    );
  };

  const handlePreview = (publication) => {
    setPreviewPublication(publication);
    setPreviewOpen(true);
  };

  const isVideo = (pub) => {
    return pub.video_url || 
           pub.link_url?.includes('youtube.com') || 
           pub.link_url?.includes('youtu.be') ||
           pub.link_url?.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i);
  };

  const getMediaPreview = (pub) => {
    if (pub.video_url) {
      return <Video className="h-4 w-4 text-purple-500" />;
    }
    if (pub.image_url) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <Megaphone className="h-4 w-4 text-gray-400" />;
  };

  // ============================================
  // RENDU - SANS DashboardLayout
  // ============================================
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const filteredPublications = publications.filter((pub) => {
    const search = searchTerm.toLowerCase();
    return (
      pub.title?.toLowerCase().includes(search) ||
      pub.description?.toLowerCase().includes(search) ||
      pub.content?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-8 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Publications
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos annonces, promotions, publicités et formations
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Nouvelle publication
        </Button>
      </div>

      {/* ===== FILTRES ===== */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une publication..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-background">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📋 Tous les types</SelectItem>
            {PUBLICATION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-background">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📋 Tous les statuts</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={fetchPublications}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* ===== LISTE DES PUBLICATIONS ===== */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Liste des publications</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Megaphone className="h-3 w-3" />
              {filteredPublications.length} publication
              {filteredPublications.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <CardDescription>
            Gérez toutes vos publications visibles dans la vitrine du salon
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPublications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Megaphone className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Aucune publication trouvée</p>
              <p className="text-sm mt-1">
                {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                  ? "Modifiez vos filtres"
                  : "Commencez par créer une nouvelle publication"}
              </p>
              {!searchTerm && typeFilter === "all" && statusFilter === "all" && (
                <Button
                  variant="link"
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="mt-2"
                >
                  Créer une publication
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Publication</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Média</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPublications.map((pub) => (
                    <TableRow key={pub.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {pub.image_url ? (
                            <img
                              src={pub.image_url}
                              alt={pub.title}
                              className="w-12 h-12 rounded-lg object-cover border"
                            />
                          ) : pub.video_url ? (
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center border">
                              <Video className="h-6 w-6 text-purple-500" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              {getTypeIcon(pub.type)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{pub.title}</p>
                            {pub.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {pub.description}
                              </p>
                            )}
                            {pub.is_highlighted && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                ⭐ Mis en avant
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getTypeIcon(pub.type)}
                          {getTypeLabel(pub.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pub.video_url ? (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1">
                            <Video className="h-3 w-3" />
                            Vidéo
                          </Badge>
                        ) : pub.image_url ? (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Image
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Aucun
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(pub.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {pub.start_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(pub.start_date), "dd MMM yyyy", {
                                locale: fr,
                              })}
                            </div>
                          )}
                          {pub.end_date && (
                            <div className="text-xs text-muted-foreground">
                              → {format(new Date(pub.end_date), "dd MMM yyyy", {
                                locale: fr,
                              })}
                            </div>
                          )}
                          {!pub.start_date && (
                            <span className="text-muted-foreground text-xs">
                              Pas de date
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(pub)}
                            title="Aperçu"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(pub)}
                            title="Modifier"
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {pub.status !== "published" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(pub.id, "published")
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                  Publier
                                </DropdownMenuItem>
                              )}
                              {pub.status !== "scheduled" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(pub.id, "scheduled")
                                  }
                                >
                                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                                  Programmer
                                </DropdownMenuItem>
                              )}
                              {pub.status !== "draft" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(pub.id, "draft")
                                  }
                                >
                                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                  Passer en brouillon
                                </DropdownMenuItem>
                              )}
                              {pub.status !== "archived" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(pub.id, "archived")
                                  }
                                >
                                  <EyeOff className="h-4 w-4 mr-2 text-gray-500" />
                                  Archiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(pub.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== MODAL DE CRÉATION/MODIFICATION ===== */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {editingPublication
                ? "Modifier la publication"
                : "Nouvelle publication"}
            </DialogTitle>
            <DialogDescription>
              {editingPublication
                ? "Modifiez les informations de votre publication"
                : "Créez une nouvelle publication pour votre salon"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Type et statut */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de publication *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData({ ...formData, status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Titre de la publication"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brève description (visible dans la liste)"
                rows={2}
              />
            </div>

            {/* Contenu */}
            <div className="space-y-2">
              <Label>Contenu complet</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Contenu détaillé de la publication"
                rows={4}
              />
            </div>

            {/* Type de média */}
            <div className="space-y-2">
              <Label>Type de média</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedMediaType === "image" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setSelectedMediaType("image")}
                >
                  <ImageIcon className="h-4 w-4" />
                  Image
                </Button>
                <Button
                  type="button"
                  variant={selectedMediaType === "video" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setSelectedMediaType("video")}
                >
                  <Video className="h-4 w-4" />
                  Vidéo
                </Button>
              </div>
            </div>

            {/* Upload Image ou Vidéo */}
            <div className="space-y-2">
              <Label>
                {selectedMediaType === "image" ? "Image" : "Vidéo"}
              </Label>
              <div className="flex items-center gap-4">
                {/* Aperçu du média */}
                {selectedMediaType === "image" && formData.image_url && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    <img
                      src={formData.image_url}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: "" })}
                      className="absolute top-1 right-1 rounded-full bg-black/50 p-1 hover:bg-black/70"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
                {selectedMediaType === "video" && formData.video_url && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-black flex items-center justify-center">
                    <video
                      src={formData.video_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, video_url: "" })}
                      className="absolute top-1 right-1 rounded-full bg-black/50 p-1 hover:bg-black/70"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}

                <div className="flex-1">
                  <Input
                    type="file"
                    accept={
                      selectedMediaType === "image" 
                        ? "image/*" 
                        : "video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.avi,.wmv,.flv,.mkv"
                    }
                    onChange={
                      selectedMediaType === "image" 
                        ? handleImageUpload 
                        : handleVideoUpload
                    }
                    disabled={uploadingImage || uploadingVideo}
                    className="cursor-pointer"
                  />
                  {(uploadingImage || uploadingVideo) && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Upload en cours...
                    </div>
                  )}
                  {selectedMediaType === "image" && formData.image_url && (
                    <p className="text-xs text-green-500 mt-1">Image chargée ✓</p>
                  )}
                  {selectedMediaType === "video" && formData.video_url && (
                    <p className="text-xs text-green-500 mt-1">Vidéo chargée ✓</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedMediaType === "image" 
                      ? "Formats: JPG, PNG, GIF, SVG (max 10MB)" 
                      : "Formats: MP4, WebM, OGG, MOV, AVI, WMV (max 100MB)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Lien YouTube (optionnel) */}
            <div className="space-y-2">
              <Label>Lien YouTube (optionnel)</Label>
              <Input
                value={formData.link_url}
                onChange={(e) =>
                  setFormData({ ...formData, link_url: e.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                Si vous avez une vidéo YouTube, entrez le lien ici. La vidéo sera lue automatiquement.
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <input
                type="checkbox"
                id="is_highlighted"
                checked={formData.is_highlighted}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_highlighted: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_highlighted" className="cursor-pointer flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Mettre en avant (affiché en premier)
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Les publications avec un ordre plus bas s'affichent en premier
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingPublication ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL D'APERÇU ===== */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewPublication && getTypeIcon(previewPublication.type)}
              Aperçu
            </DialogTitle>
          </DialogHeader>

          {previewPublication && (
            <div className="space-y-4">
              {/* Aperçu du média */}
              {previewPublication.video_url ? (
                <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    src={previewPublication.video_url}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                  />
                </div>
              ) : previewPublication.image_url ? (
                <img
                  src={previewPublication.image_url}
                  alt={previewPublication.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : previewPublication.link_url?.includes('youtube.com') ? (
                <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${previewPublication.link_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/)?.[1]}?autoplay=1&rel=0`}
                    title={previewPublication.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : null}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  {getTypeIcon(previewPublication.type)}
                  {getTypeLabel(previewPublication.type)}
                </Badge>
                {getStatusBadge(previewPublication.status)}
                {previewPublication.is_highlighted && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    ⭐ Mis en avant
                  </Badge>
                )}
                {previewPublication.video_url && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1">
                    <Video className="h-3 w-3" />
                    Vidéo
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl font-bold">{previewPublication.title}</h2>

              {previewPublication.description && (
                <p className="text-muted-foreground text-lg">
                  {previewPublication.description}
                </p>
              )}

              {previewPublication.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-line">
                    {previewPublication.content}
                  </p>
                </div>
              )}

              {(previewPublication.start_date || previewPublication.end_date) && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                  {previewPublication.start_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Du {format(
                        new Date(previewPublication.start_date),
                        "dd MMM yyyy HH:mm",
                        { locale: fr }
                      )}
                    </div>
                  )}
                  {previewPublication.end_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Au {format(
                        new Date(previewPublication.end_date),
                        "dd MMM yyyy HH:mm",
                        { locale: fr }
                      )}
                    </div>
                  )}
                </div>
              )}

              {previewPublication.link_url && (
                <div className="border-t pt-4">
                  <a
                    href={previewPublication.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Voir le lien
                  </a>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>ID: {previewPublication.id}</p>
                <p>Créé le: {format(
                  new Date(previewPublication.created_at),
                  "dd MMM yyyy à HH:mm",
                  { locale: fr }
                )}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}