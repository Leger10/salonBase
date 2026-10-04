import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { toast } from "sonner";
import { Scissors, Loader2, ArrowLeft, MailCheck, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
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
      await forgotPassword(email);
      setSubmitted(true);
      toast.success(
        "Un email de réinitialisation a été envoyé à votre adresse email",
      );
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

      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bento-card bg-card px-6 py-10 sm:px-12 shadow-xl border-border/50 animate-in fade-in zoom-in-95 duration-300">
          {submitted ? (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Vérifiez votre boîte mail
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Si un compte est associé à{" "}
                <span className="font-semibold text-foreground">{email}</span>,
                vous recevrez un lien pour réinitialiser votre mot de passe.
              </p>
              <div className="pt-4">
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
                  Entrez votre adresse email ci-dessous. Nous vous enverrons un
                  lien pour créer un nouveau mot de passe.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    Nous vous enverrons un lien de réinitialisation sécurisé.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base shadow-sm bg-gradient-to-r from-primary to-primary/80"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Envoyer le lien de réinitialisation
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