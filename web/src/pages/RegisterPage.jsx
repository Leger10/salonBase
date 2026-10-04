import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.jsx";
import { Scissors, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    role: "client",
    salon_name: "",
    salon_slug: "",
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (!formData.phone) {
      toast.error("Veuillez entrer votre numéro de téléphone");
      return;
    }

    // Validation simple du numéro de téléphone
    const phoneRegex = /^[0-9+\s\-\(\)]{8,20}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error("Veuillez entrer un numéro de téléphone valide");
      return;
    }

    if (formData.role === "admin" && !formData.salon_name) {
      toast.error("Veuillez entrer le nom de votre salon");
      return;
    }

    setLoading(true);
    try {
      const userData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === "admin") {
        userData.salon_name = formData.salon_name;
        userData.salon_slug = formData.salon_slug || 
          formData.salon_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }

      await signup(userData);
      toast.success("Compte créé avec succès !");

      const roleRoutes = {
        super_admin: "/super-admin/dashboard",
        admin: "/admin/dashboard",
        employee: "/employee/dashboard",
        client: "/client/dashboard",
      };

      navigate(roleRoutes[formData.role] || "/client/dashboard");
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Scissors className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Rejoignez BeautyFlow
          </h1>
          <p className="mt-2 text-muted-foreground">
            Créez un compte pour commencer
          </p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>
              Remplissez le formulaire ci-dessous pour vous inscrire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Jean Dupont"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="bg-background text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-background text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.phone}
                    onChange={handleChange}
                    className="bg-background text-foreground pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Format: 06XXXXXXXX, +33XXXXXXXXX, ou 07XXXXXXXX
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-background text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirmer le mot de passe *</Label>
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    placeholder="••••••••"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    className="bg-background text-foreground"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Minimum 8 caractères
              </p>

              {formData.role === "admin" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="salon_name">Nom du salon *</Label>
                    <Input
                      id="salon_name"
                      name="salon_name"
                      placeholder="Mon Super Salon"
                      value={formData.salon_name}
                      onChange={handleChange}
                      className="bg-background text-foreground"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salon_slug">Identifiant du salon (URL)</Label>
                    <Input
                      id="salon_slug"
                      name="salon_slug"
                      placeholder="mon-super-salon"
                      value={formData.salon_slug}
                      onChange={handleChange}
                      className="bg-background text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      Laissez vide pour générer automatiquement
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-3 pt-2">
                <Label>Je suis... *</Label>
                <RadioGroup
                  defaultValue="client"
                  value={formData.role}
                  onValueChange={handleRoleChange}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 rounded-lg border p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="client" id="client" />
                    <Label
                      htmlFor="client"
                      className="cursor-pointer font-medium w-full"
                    >
                      Client
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="admin" id="admin" />
                    <Label
                      htmlFor="admin"
                      className="cursor-pointer font-medium w-full"
                    >
                      Gérant de salon
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  "Créer le compte"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                Vous avez déjà un compte ?{" "}
              </span>
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                Se connecter
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}