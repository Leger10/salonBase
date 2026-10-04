import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { toast } from "sonner";
import { Scissors, Loader2, ArrowRight, Mail, Lock, User, Phone } from "lucide-react";

export default function LoginPage({ defaultTab = "login" }) {
  const { login, signup, isAuthenticated, currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // États
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState(null);

  // Login Form State
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Signup Form State
  const [signupData, setSignupData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    terms: false,
  });

  // Vérifier les paramètres d'invitation dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const salon = params.get('salon');
    const tenantId = params.get('tenant');
    const inviteCode = params.get('invite');
    
    if (tenantId) {
      setInviteData({ tenantId, salon, inviteCode });
    }
  }, [location]);

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

  // Gestion des changements
  const handleLoginChange = (e) => {
    const { id, value } = e.target;
    setLoginData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSignupChange = (e) => {
    const { id, value } = e.target;
    setSignupData((prev) => ({ ...prev, [id]: value }));
  };

  // Soumission du login
  const onLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      toast.error("Email invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success("Connexion réussie");
    } catch (error) {
      toast.error(error.message || "Identifiants invalides");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soumission de l'inscription
  const onSignupSubmit = async (e) => {
    e.preventDefault();

    if (!signupData.full_name || !signupData.email || !signupData.password || !signupData.confirm_password) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      toast.error("Email invalide");
      return;
    }

    if (signupData.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (signupData.password !== signupData.confirm_password) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!signupData.terms) {
      toast.error("Vous devez accepter les conditions générales");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        full_name: signupData.full_name,
        email: signupData.email,
        phone: signupData.phone,
        password: signupData.password,
        role: 'client',
        tenant_id: inviteData?.tenantId || null,
      });
      toast.success("Compte créé avec succès !");
      navigate("/client/dashboard");
    } catch (error) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return;
      }
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    window.history.replaceState(null, "", `/auth/${value}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      {/* Logo */}
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
        {/* Bannière d'invitation */}
        {inviteData && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm font-medium text-primary">
              🎯 Invitation à rejoindre le salon <strong>{inviteData.salon || 'BeautyFlow'}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Créez votre compte pour commencer
            </p>
          </div>
        )}

        <div className="bento-card bg-card px-6 py-10 sm:px-12 shadow-xl border-border/50">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Se connecter
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                S'inscrire
              </TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Bon retour</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Connectez-vous à votre espace personnel.
                </p>
              </div>

              <form onSubmit={onLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nom@exemple.com"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      className="bg-background pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Link
                      to="/auth/forgot-password"
                      className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      className="bg-background pl-10"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base shadow-sm group bg-gradient-to-r from-primary to-primary/80" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* SIGNUP TAB */}
            <TabsContent value="signup" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Créer un compte</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Rejoignez BeautyFlow en quelques secondes.
                </p>
                {inviteData && (
                  <p className="text-xs text-primary mt-2">
                    ✉️ Vous êtes invité à rejoindre <strong>{inviteData.salon}</strong>
                  </p>
                )}
              </div>

              <form onSubmit={onSignupSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      placeholder="Jean Dupont"
                      value={signupData.full_name}
                      onChange={handleSignupChange}
                      className="bg-background pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nom@exemple.com"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      className="bg-background pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={signupData.phone}
                      onChange={handleSignupChange}
                      className="bg-background pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={signupData.password} 
                      onChange={handleSignupChange} 
                      className="bg-background" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmer</Label>
                    <Input 
                      id="confirm_password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={signupData.confirm_password} 
                      onChange={handleSignupChange} 
                      className="bg-background" 
                      required 
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Minimum 8 caractères
                </p>

                <div className="flex items-start space-x-2 pt-2 pb-2">
                  <Checkbox 
                    id="terms" 
                    checked={signupData.terms} 
                    onCheckedChange={(c) => setSignupData({ ...signupData, terms: c })} 
                    className="mt-1" 
                  />
                  <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                    J'accepte les conditions générales d'utilisation et la politique de confidentialité.
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base shadow-sm group bg-gradient-to-r from-primary to-primary/80" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Création du compte...
                    </>
                  ) : (
                    <>
                      S'inscrire
                      <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          En continuant, vous acceptez nos{" "}
          <a href="#" className="font-medium text-foreground hover:underline">
            Conditions de service
          </a>
          .
        </p>
      </div>
    </div>
  );
}