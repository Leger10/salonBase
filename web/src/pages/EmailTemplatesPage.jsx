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
import { Plus, Edit, Trash2, Eye, Mail } from "lucide-react";

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    variables: [],
    is_active: true,
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchTemplates();
    }
  }, [currentUser]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Erreur lors du chargement des templates email");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Configuration du salon non trouvée");
        return;
      }

      const templateData = {
        tenant_id: tenantId,
        name: formData.name,
        subject: formData.subject,
        body: formData.body,
        variables: formData.variables,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("email_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template mis à jour avec succès");
      } else {
        templateData.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("email_templates")
          .insert([templateData]);

        if (error) throw error;
        toast.success("Template créé avec succès");
      }

      setModalOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce template ?")) return;

    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template supprimé avec succès");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      subject: "",
      body: "",
      variables: [],
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
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

  const commonVariables = [
    "{{client_name}}",
    "{{client_first_name}}",
    "{{client_last_name}}",
    "{{appointment_date}}",
    "{{appointment_time}}",
    "{{appointment_duration}}",
    "{{service_name}}",
    "{{service_price}}",
    "{{employee_name}}",
    "{{salon_name}}",
    "{{salon_address}}",
    "{{salon_phone}}",
    "{{booking_link}}",
    "{{cancellation_link}}",
    "{{reschedule_link}}",
  ];

  const insertVariable = (variable) => {
    setFormData({ ...formData, body: formData.body + variable });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Templates Email
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les templates d'emails automatisés pour votre salon.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau template
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
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                <p className="text-muted-foreground">Aucun template trouvé</p>
                <Button variant="link" onClick={openCreateModal}>
                  Créer votre premier template
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="pl-6">Nom</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium pl-6">
                          {template.name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {template.subject}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(template.variables || [])
                              .slice(0, 3)
                              .map((v, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs font-mono"
                                >
                                  {v}
                                </Badge>
                              ))}
                            {template.variables?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3}
                              </Badge>
                            )}
                          </div>
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
                          <div className="flex justify-end gap-1">
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

        {/* Modal de création/édition */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  placeholder="ex: Confirmation de rendez-vous"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Objet de l'email *</Label>
                <Input
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Votre rendez-vous du {{appointment_date}} est confirmé"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Corps de l'email *</Label>
                <Textarea
                  required
                  value={formData.body}
                  onChange={(e) =>
                    setFormData({ ...formData, body: e.target.value })
                  }
                  rows={10}
                  className="bg-background font-mono text-sm"
                  placeholder="Bonjour {{client_name}},&#10;&#10;Votre rendez-vous est confirmé pour le {{appointment_date}} à {{appointment_time}}.&#10;&#10;Service: {{service_name}}&#10;Durée: {{appointment_duration}} minutes&#10;&#10;À bientôt chez {{salon_name}} !"
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez les variables ci-dessous en cliquant dessus pour les
                  insérer
                </p>
              </div>

              {/* Variables disponibles */}
              <div className="space-y-2">
                <Label>Variables disponibles</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                  {commonVariables.map((variable) => (
                    <Button
                      key={variable}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(variable)}
                      className="font-mono text-xs"
                    >
                      {variable}
                    </Button>
                  ))}
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
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Aperçu: {previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="border-b pb-2">
                <Label className="text-xs text-muted-foreground">Objet</Label>
                <p className="font-medium mt-1">{previewTemplate?.subject}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Corps</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm font-mono">
                  {previewTemplate?.body}
                </div>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                <p>
                  ⚠️ Les variables seront remplacées dynamiquement lors de
                  l'envoi.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
