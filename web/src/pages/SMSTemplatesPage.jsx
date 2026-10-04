import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
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
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit, Trash2, Eye } from "lucide-react";

export default function SMSTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    body: "",
    variables: [],
    is_active: true,
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchTemplates();
  }, [currentUser]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setTemplates([]);
        return;
      }

      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Erreur lors du chargement des templates SMS");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.body.length > 160) {
      toast.error("Le message SMS doit contenir 160 caractères maximum");
      return;
    }

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      const templateData = {
        ...formData,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      };

      if (editingTemplate) {
        // Mise à jour
        const { error } = await supabase
          .from("sms_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template mis à jour");
      } else {
        // Création
        templateData.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("sms_templates")
          .insert([templateData]);

        if (error) throw error;
        toast.success("Template créé");
      }

      setModalOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce template ?")) return;
    try {
      const { error } = await supabase
        .from("sms_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template supprimé");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error(error.message);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({ name: "", body: "", variables: [], is_active: true });
    setModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      body: template.body,
      variables: template.variables || [],
      is_active: template.is_active,
    });
    setModalOpen(true);
  };

  const openPreview = (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Templates SMS
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les templates SMS automatiques de votre salon.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau Template
          </Button>
        </div>

        <Card className="dashboard-card border-none shadow-md">
          <CardHeader>
            <CardTitle>Tous les templates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader className="table-header bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Nom</TableHead>
                    <TableHead>Aperçu</TableHead>
                    <TableHead>Longueur</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Aucun template trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium pl-6">
                          {template.name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {template.body}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              template.body.length > 160
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {template.body.length}/160
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              template.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {template.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPreview(template)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de création/édition */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Modifier le template" : "Créer un template"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom du template *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-background text-foreground"
                  placeholder="ex: Confirmation RDV"
                />
              </div>
              <div className="space-y-2">
                <Label>Message SMS * (Max 160 caractères)</Label>
                <Textarea
                  required
                  value={formData.body}
                  onChange={(e) =>
                    setFormData({ ...formData, body: e.target.value })
                  }
                  rows={4}
                  maxLength={160}
                  className="bg-background text-foreground font-mono text-sm"
                  placeholder="Bonjour {{clientName}}, votre rendez-vous du {{appointmentDate}} est confirmé."
                />
                <div className="flex justify-between text-xs">
                  <p className="text-muted-foreground">
                    Variables disponibles:{" "}
                    {`{{clientName}}, {{appointmentDate}}, {{appointmentTime}}, {{employeeName}}, {{salonName}}`}
                  </p>
                  <p
                    className={
                      formData.body.length > 160
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {formData.body.length}/160
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Template actif
                </Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingTemplate ? "Mettre à jour" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de preview */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Aperçu: {previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="bg-background rounded-lg p-4 shadow-sm">
                  <p className="text-sm whitespace-pre-wrap">
                    {previewTemplate?.body}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {previewTemplate?.body.length}/160 caractères
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
