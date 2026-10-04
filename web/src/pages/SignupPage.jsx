import React, { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { toast } from "sonner";
import { Scissors, Loader2, ArrowRight, Mail, Lock, User, Phone } from "lucide-react";

export default function SignupPage() {
  const { signup, isAuthenticated, currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // États du formulaire
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    terms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupérer les paramètres d'invitation depuis l'URL
  const searchParams = new URLSearchParams(location.search);
  const inviteTenantId = searchParams.get('tenant');
  const inviteSalon = searchParams.get('salon');

  // Redirection si déjà authentifié
  if (isAuthenticated && !isLoading) {
    const role = currentUser?.profile?.role;
    const dashboardPath = role === "super_admin"
      ? "/super-admin/dashboard"
      : role === "admin"
        ? "/admin/dashboard"
        : role === "employee"
          ? "/employee/dashboard"
          : "/client/dashboard";
    return <Navigate to={dashboardPath} replace />;
  }

  // Gestion des changements de formulaire
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Gestion de la soumission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Email invalide");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!formData.terms) {
      toast.error("Vous devez accepter les conditions générales");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'client',
        tenant_id: inviteTenantId || null,
      });
      
      toast.success("Compte créé avec succès !");
      navigate("/client/dashboard");
    } catch (error) {
      // L'erreur est déjà gérée dans le contexte
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        // Ne pas afficher d'erreur supplémentaire
        return;
      }
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo et titre */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Créer un compte</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Rejoignez BeautyFlow dès aujourd'hui
          </p>
          {inviteTenantId && (
            <p className="text-xs text-primary mt-2 bg-primary/10 px-3 py-1 rounded-full">
              ✉️ Invitation à rejoindre <strong>{inviteSalon || 'un salon'}</strong>
            </p>
          )}
        </div>

        {/* Formulaire */}
        <div className="bento-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom complet */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  placeholder="Jean Dupont"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="bg-background pl-10"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-background pl-10"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={formData.phone}
                  onChange={handleChange}
                  className="bg-background pl-10"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmer *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  className="bg-background"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Minimum 8 caractères
            </p>

            {/* Conditions */}
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={formData.terms}
                onCheckedChange={(c) => setFormData((prev) => ({ ...prev, terms: c }))}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                J'accepte les conditions générales d'utilisation et la politique de confidentialité.
              </Label>
            </div>

            {/* Bouton d'inscription */}
            <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  S'inscrire
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Lien vers connexion */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Déjà un compte ? </span>
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}