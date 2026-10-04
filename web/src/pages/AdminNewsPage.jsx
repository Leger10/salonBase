import React, { useState, useEffect, useRef } from "react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import DashboardLayout from "@/layouts/DashboardLayout.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Image as ImageIcon,
  Globe,
  FileText,
  Calendar as CalendarIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "Offre/Promotion", label: "🎁 Offre / Promotion" },
  { value: "News", label: "📰 Actualité" },
  { value: "Post", label: "📝 Article" },
];

const getCategoryColor = (category) => {
  const colors = {
    "Offre/Promotion": "bg-amber-100 text-amber-800",
    News: "bg-blue-100 text-blue-800",
    Post: "bg-purple-100 text-purple-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
};

const getCategoryLabel = (category) => {
  const labels = {
    "Offre/Promotion": "🎁 Offre",
    News: "📰 Actualité",
    Post: "📝 Article",
  };
  return labels[category] || category;
};

export default function AdminNewsPage() {
  const { currentUser } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "News",
    status: "Draft",
    scheduled_publish_date: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setArticles([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("news")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      toast.error("Erreur lors du chargement des actualités");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [statusFilter, currentUser]);

  const filteredArticles = articles.filter((a) =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenCreate = () => {
    setSelectedArticle(null);
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      category: "News",
      status: "Draft",
      scheduled_publish_date: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (article) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title || "",
      excerpt: article.excerpt || "",
      content: article.content || "",
      category: article.category || "News",
      status: article.status || "Draft",
      scheduled_publish_date: article.scheduled_publish_date
        ? article.scheduled_publish_date.substring(0, 16)
        : "",
    });
    setImageFile(null);
    setImagePreview(article.image_url || null);
    setImageUrl(article.image_url || "");
    setIsSheetOpen(true);
  };

  const handleDelete = (article) => {
    setSelectedArticle(article);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", selectedArticle.id);

      if (error) throw error;

      toast.success("Article supprimé avec succès");
      setIsDeleteDialogOpen(false);
      fetchArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `news/${fileName}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      return toast.error("Veuillez remplir le titre et le contenu");
    }

    setSubmitting(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Configuration du salon non trouvée");
        return;
      }

      let finalImageUrl = imageUrl;

      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const articleData = {
        tenant_id: tenantId,
        title: formData.title,
        excerpt: formData.excerpt || formData.content.substring(0, 160),
        content: formData.content,
        category: formData.category,
        status: formData.status,
        image_url: finalImageUrl,
        scheduled_publish_date: formData.scheduled_publish_date || null,
        published_at:
          formData.status === "Published" && !formData.scheduled_publish_date
            ? new Date().toISOString()
            : null,
      };

      if (selectedArticle) {
        const { error } = await supabase
          .from("news")
          .update(articleData)
          .eq("id", selectedArticle.id);

        if (error) throw error;
        toast.success("Article mis à jour avec succès");
      } else {
        const { error } = await supabase.from("news").insert([articleData]);

        if (error) throw error;
        toast.success("Article créé avec succès");
      }

      setIsSheetOpen(false);
      fetchArticles();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Actualités</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos offres, promotions et articles de blog.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Créer un article
          </Button>
        </div>

        <Card className="border-none shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un titre..."
                  className="pl-9 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-background">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="Published">Publiés</SelectItem>
                  <SelectItem value="Draft">Brouillons</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="mb-4 h-10 w-10 opacity-20" />
                <p className="font-medium">Aucun article trouvé.</p>
                <p className="text-sm mt-1">
                  Créez votre première actualité pour engager vos clients.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Article</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Publication</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {article.image_url ? (
                              <div className="h-10 w-10 shrink-0 rounded-md bg-muted overflow-hidden">
                                <img
                                  src={article.image_url}
                                  className="h-full w-full object-cover"
                                  alt=""
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium line-clamp-1 max-w-[250px]">
                              {article.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getCategoryColor(article.category)}
                            variant="outline"
                          >
                            {getCategoryLabel(article.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {article.status === "Published" ? (
                            <Badge className="bg-green-100 text-green-800 gap-1 border-none">
                              <Globe className="h-3 w-3" /> Publié
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <FileText className="h-3 w-3" /> Brouillon
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {article.scheduled_publish_date
                            ? new Date(
                                article.scheduled_publish_date,
                              ).toLocaleDateString("fr-FR")
                            : article.published_at
                              ? new Date(
                                  article.published_at,
                                ).toLocaleDateString("fr-FR")
                              : "Non publié"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(article)}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(article)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
      </div>

      {/* Editor Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {selectedArticle ? "Modifier l'article" : "Créer un article"}
            </SheetTitle>
            <SheetDescription>
              Rédigez votre contenu, ajoutez une image et définissez la date de
              publication.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Image de couverture</Label>
              <div
                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative aspect-[21/9] w-full rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white font-medium">
                        Changer l'image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">
                      Cliquez pour ajouter une image
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG, WEBP (Max 5MB)
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) =>
                    setFormData({ ...formData, category: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">📝 Brouillon</SelectItem>
                    <SelectItem value="Published">🌍 Publié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="scheduled_publish_date"
                className="flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" /> Date de publication prévue
                (Optionnel)
              </Label>
              <Input
                id="scheduled_publish_date"
                type="datetime-local"
                value={formData.scheduled_publish_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduled_publish_date: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour publier immédiatement si le statut est
                "Publié".
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Extrait (Optionnel)</Label>
              <Input
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                placeholder="Court résumé de l'article..."
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="min-h-[250px] font-sans resize-y"
                placeholder="Rédigez votre article ici..."
                required
              />
            </div>

            <SheetFooter className="pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'article</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'article{" "}
              <strong>{selectedArticle?.title}</strong> ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
