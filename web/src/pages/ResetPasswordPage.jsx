import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { toast } from "sonner";
import { Scissors, Loader2, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState(null);

  const { resetPassword, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract ?token=xxx from URL
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [location]);

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Token invalide ou manquant.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword, confirmPassword);
      toast.success("Mot de passe réinitialisé avec succès");
      navigate("/auth/login");
    } catch (error) {
      toast.error(error.message || "Erreur lors de la réinitialisation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md transition-transform group-hover:scale-105">
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            BeautyFlow
          </span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bento-card bg-card px-6 py-10 sm:px-12 shadow-xl border-border/50 animate-in fade-in zoom-in-95 duration-300">
          {!token ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-destructive">
                Lien Invalide
              </h2>
              <p className="text-muted-foreground text-sm">
                Le lien de réinitialisation est invalide ou expiré.
              </p>
              <Button asChild className="w-full mt-4">
                <Link to="/auth/forgot-password">
                  Faire une nouvelle demande
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">
                  Nouveau mot de passe
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Créez un mot de passe fort pour sécuriser votre compte.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nouveau mot de passe</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    8 caractères minimum.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base shadow-sm group"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Réinitialiser le mot de passe
                  {!isSubmitting && (
                    <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}