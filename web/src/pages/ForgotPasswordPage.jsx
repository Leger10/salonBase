import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { toast } from "sonner";
import { Scissors, Loader2, ArrowLeft, MailCheck, Mail, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword, isAuthenticated, isLoading } = useAuth();

  // Redirection si déjà connecté
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Format d'email invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(email, note);
      setSubmitted(true);
    } catch (error) {
      toast.error(
        error.message || "Une erreur est survenue. Veuillez réessayer.",
      );
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
        <div className="bento-card bg-card px-6 py-10 sm:px-12 shadow-xl border-border/50 animate-in fade-in zoom-in-95 duration-300">
          {submitted ? (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Demande envoyée au super administrateur
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Votre demande de réinitialisation pour{" "}
                <span className="font-semibold text-foreground">{email}</span>{" "}
                a bien été enregistrée. Le super administrateur va réinitialiser
                votre mot de passe.
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-left text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    Une fois la demande traitée, connectez-vous avec le mot de
                    passe temporaire <strong>00000000</strong>. Vous serez
                    ensuite invité à définir votre nouveau mot de passe.
                  </span>
                </p>
              </div>
              <div className="pt-2">
                <Button asChild className="w-full h-11">
                  <Link to="/auth/login">Retour à la connexion</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Mot de passe oublié ?
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Indiquez l'email de votre compte. Votre demande sera transmise
                  au super administrateur, qui réinitialisera votre mot de passe.
                  Vous vous connecterez ensuite avec le mot de passe temporaire{" "}
                  <strong>00000000</strong>, puis vous en définirez un nouveau.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background h-11"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Utilisez l'email du compte à réinitialiser.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Message pour l'administrateur (optionnel)</Label>
                  <Input
                    id="note"
                    type="text"
                    placeholder="Ex : je n'ai plus accès à mon ancien mot de passe"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-background h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base shadow-sm bg-gradient-to-r from-primary to-primary/80"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Envoyer la demande au super administrateur
                </Button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
