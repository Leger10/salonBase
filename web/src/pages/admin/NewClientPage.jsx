// /src/pages/admin/NewClientPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { toast } from "sonner";
import { 
  UserPlus, 
  ArrowLeft, 
  Loader2, 
  Mail, 
  Phone, 
  User, 
  Award,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

export default function NewClientPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    loyalty_points: 0,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Le nom est obligatoire";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error("Veuillez corriger les erreurs");
      return;
    }

    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Salon non trouvé");
        setLoading(false);
        return;
      }

      // Vérifier si un client avec cet email existe déjà
      if (formData.email) {
        const { data: existingClient, error: checkError } = await supabase
          .from("clients")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("email", formData.email)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking existing client:", checkError);
        } else if (existingClient) {
          toast.error("Un client avec cet email existe déjà");
          setLoading(false);
          return;
        }
      }

      // Créer le nouveau client
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({
          tenant_id: tenantId,
          name: formData.name.trim(),
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
          loyalty_points: parseInt(formData.loyalty_points) || 0,
          total_visits: 0,
          total_spent: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating client:", error);
        toast.error("Erreur lors de la création du client");
        setLoading(false);
        return;
      }

      toast.success(`Client "${newClient.name}" créé avec succès !`);
      
      setTimeout(() => {
        navigate("/admin/clients");
      }, 1000);
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              to="/admin/clients" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Nouveau Client
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez un nouveau client à votre salon
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/clients">Annuler</Link>
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {loading ? "Création..." : "Créer le client"}
          </Button>
        </div>
      </div>

      {/* Formulaire */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Informations du client</CardTitle>
          <CardDescription>
            Remplissez les informations du nouveau client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  Nom complet <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jean Dupont"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="client@email.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Téléphone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+225 07 07 07 07 07"
                />
              </div>

              {/* Points de fidélité */}
              <div className="space-y-2">
                <Label htmlFor="loyalty_points" className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Points de fidélité
                </Label>
                <Input
                  id="loyalty_points"
                  type="number"
                  min="0"
                  value={formData.loyalty_points}
                  onChange={handleChange}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Points attribués au client (si applicable)
                </p>
              </div>

              {/* Adresse */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Adresse complète"
                  rows={2}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Informations supplémentaires sur le client"
                  rows={3}
                />
              </div>
            </div>

            {/* Aperçu */}
            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Résumé :</span>
                <Badge variant="outline" className="gap-1">
                  <User className="h-3 w-3" />
                  {formData.name || "Nom non défini"}
                </Badge>
                {formData.email && (
                  <Badge variant="outline" className="gap-1">
                    <Mail className="h-3 w-3" />
                    {formData.email}
                  </Badge>
                )}
                {formData.phone && (
                  <Badge variant="outline" className="gap-1">
                    <Phone className="h-3 w-3" />
                    {formData.phone}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <Award className="h-3 w-3" />
                  {parseInt(formData.loyalty_points) || 0} pts
                </Badge>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="border-t pt-4 flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                asChild
              >
                <Link to="/admin/clients">Annuler</Link>
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {loading ? "Création en cours..." : "Créer le client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}