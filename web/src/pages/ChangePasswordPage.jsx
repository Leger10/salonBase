// Changement de mot de passe (volontaire ou force apres reinitialisation).
//
// Le super administrateur remet le mot de passe a "00000000". A la connexion
// suivante, ProtectedRoute redirige ici tant que profiles.must_change_password
// vaut 1. L'utilisateur doit alors definir un nouveau mot de passe avant
// d'acceder a son espace.
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { toast } from "sonner";
import {
  Scissors,
  Loader2,
  ShieldCheck,
  KeyRound,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";

const TEMPORARY_PASSWORD = "00000000";

export default function ChangePasswordPage() {
  const { currentUser, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const forced = currentUser?.mustChangePassword === true;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword === TEMPORARY_PASSWORD) {
      toast.error("Choisissez un mot de passe différent du mot de passe temporaire");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Mot de passe modifié. Bienvenue !");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.message || "Impossible de modifier le mot de passe");
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

      <div className="sm:mx-auto sm:w-full sm:max-w-[520px]">
        <div className="bento-card bg-card px-6 py-10 sm:px-12 shadow-xl border-border/50">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {forced ? "Définissez votre nouveau mot de passe" : "Changer de mot de passe"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {forced
                ? "Votre mot de passe a été réinitialisé par le super administrateur. Pour sécuriser votre compte, choisissez maintenant un nouveau mot de passe personnel."
                : "Saisissez votre mot de passe actuel puis choisissez un nouveau mot de passe."}
            </p>
          </div>

          {forced && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Mot de passe temporaire : <strong>{TEMPORARY_PASSWORD}</strong>.
                  Il ne peut plus être utilisé après cette étape.
                </span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={forced ? TEMPORARY_PASSWORD : "Votre mot de passe actuel"}
                className="bg-background h-11"
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                className="bg-background h-11"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmPassword"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le nouveau mot de passe"
                className="bg-background h-11"
                autoComplete="new-password"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
            >
              {showPasswords ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showPasswords ? "Masquer les mots de passe" : "Afficher les mots de passe"}
            </button>

            <Button
              type="submit"
              className="w-full h-11 text-base shadow-sm bg-gradient-to-r from-primary to-primary/80"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Enregistrer le nouveau mot de passe
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
