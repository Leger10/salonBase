// /src/pages/ContactPage.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useActiveTenant } from "@/contexts/ActiveTenantContext.jsx";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext.jsx";
import { supabase } from '@/lib/supabase';
import PublicHeader from "@/components/PublicHeader.jsx";
import PublicFooter from "@/components/PublicFooter.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import FloatingAiChat from "@/components/FloatingAiChat.jsx";

export default function ContactPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  const { activeTenant, isShowcase } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  const [tenantData, setTenantData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ✅ Déterminer le tenant à utiliser
  const userRole = currentUser?.profile?.role || currentUser?.role;
  const isAdmin = isAuthenticated && (userRole === 'admin' || userRole === 'employee');
  const isSuperAdmin = isAuthenticated && userRole === 'super_admin';

  // ✅ Récupérer les infos du tenant et les settings
  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true);
      try {
        let tenant = null;

        // 1. Si on est en mode showcase avec un slug (priorité absolue)
        if (slug) {
          const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', slug)
            .single();
          
          if (!error && data) {
            tenant = data;
          } else {
            toast.error("Salon non trouvé");
            navigate('/');
            setLoading(false);
            return;
          }
        }

        // 2. Si on est en mode showcase avec activeTenant
        if (!tenant && isShowcase && activeTenant) {
          tenant = activeTenant;
        }

        // 3. Si l'utilisateur est admin/employee, récupérer son tenant
        if (!tenant && isAdmin && currentUser?.profile?.tenant_id) {
          const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', currentUser.profile.tenant_id)
            .single();
          
          if (!error && data) {
            tenant = data;
          }
        }

        // 4. Si super_admin, ne pas afficher les infos d'un salon spécifique
        if (!tenant && isSuperAdmin) {
          setTenantData(null);
          setSettings(null);
          setLoading(false);
          return;
        }

        // 5. Si toujours pas de tenant
        if (!tenant) {
          setTenantData(null);
          setSettings(null);
          setLoading(false);
          return;
        }

        setTenantData(tenant);

        // ✅ Récupérer les settings du tenant pour les horaires
        const { data: settingsData, error: settingsError } = await supabase
          .from('tenant_home_settings')
          .select('*')
          .eq('tenant_id', tenant.id)
          .single();

        if (!settingsError && settingsData) {
          setSettings(settingsData);
        } else {
          // Si pas de settings, utiliser les valeurs par défaut
          setSettings({
            footer_hours_monday: '09:00 - 19:00',
            footer_hours_tuesday: '09:00 - 19:00',
            footer_hours_wednesday: '09:00 - 19:00',
            footer_hours_thursday: '09:00 - 19:00',
            footer_hours_friday: '09:00 - 19:00',
            footer_hours_saturday: '09:00 - 17:00',
            footer_hours_sunday: 'Fermé',
          });
        }
      } catch (error) {
        console.error('Error fetching tenant:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantData();
  }, [slug, isShowcase, activeTenant, isAdmin, isSuperAdmin, currentUser, navigate]);

  // ✅ Déterminer les informations à afficher
  const getContactInfo = () => {
    if (tenantData) {
      return {
        name: tenantData.name || 'Salon',
        address: tenantData.address || 'Adresse non renseignée',
        phone: tenantData.phone || 'Téléphone non renseigné',
        email: tenantData.email || 'Email non renseigné',
        description: tenantData.description || 'Notre équipe est à votre disposition.',
        primary_color: tenantData.primary_color || platformConfig.primaryColor || '#ec4899',
        logo: tenantData.logo_url,
        cover_image: tenantData.cover_image,
        tenant_id: tenantData.id,
        slug: tenantData.slug,
      };
    }

    return {
      name: platformConfig.platformName || 'BeautyFlow',
      address: platformConfig.address || 'Adresse non renseignée',
      phone: platformConfig.contactPhone || 'Téléphone non renseigné',
      email: platformConfig.contactEmail || 'Email non renseigné',
      description: platformConfig.platformDescription || 'Notre équipe est à votre disposition.',
      primary_color: platformConfig.primaryColor || '#ec4899',
      logo: platformConfig.logoUrl,
      cover_image: null,
      tenant_id: null,
      slug: null,
    };
  };

  const contactInfo = getContactInfo();

  // ✅ Récupérer les horaires depuis les settings
  const getHours = () => {
    if (settings) {
      return {
        monday: settings.footer_hours_monday || 'Fermé',
        tuesday: settings.footer_hours_tuesday || 'Fermé',
        wednesday: settings.footer_hours_wednesday || 'Fermé',
        thursday: settings.footer_hours_thursday || 'Fermé',
        friday: settings.footer_hours_friday || 'Fermé',
        saturday: settings.footer_hours_saturday || 'Fermé',
        sunday: settings.footer_hours_sunday || 'Fermé',
      };
    }
    // Fallback
    return {
      monday: '09:00 - 19:00',
      tuesday: '09:00 - 19:00',
      wednesday: '09:00 - 19:00',
      thursday: '09:00 - 19:00',
      friday: '09:00 - 19:00',
      saturday: '09:00 - 17:00',
      sunday: 'Fermé',
    };
  };

  const hours = getHours();

  const days = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' },
  ];

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Format d'email invalide");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const tenantId = contactInfo.tenant_id || null;
      
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          tenant_id: tenantId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          subject: formData.subject || null,
          message: formData.message,
          is_read: false,
          replied: false,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setSubmitted(true);
      toast.success("Message envoyé avec succès !");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <PublicHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <PublicHeader />
        <div className="bg-muted/30 py-16 md:py-24 min-h-screen">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="bg-card rounded-2xl p-8 shadow-lg">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Message envoyé !</h2>
              <p className="text-muted-foreground mb-6">
                Merci de nous avoir contactés. Notre équipe vous répondra dans les plus brefs délais.
              </p>
              <Button onClick={() => setSubmitted(false)}>Envoyer un autre message</Button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Contactez {contactInfo.name} - BeautyFlow</title>
        <meta name="description" content={`Contactez ${contactInfo.name} pour toutes vos questions.`} />
      </Helmet>

      <PublicHeader />
      <div className="bg-muted/30 py-16 md:py-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: contactInfo.primary_color }}>
              Contactez {contactInfo.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              {contactInfo.description}
            </p>
            {contactInfo.slug && (
              <Badge variant="outline" className="mt-2 gap-1">
                <Building2 className="h-3 w-3" />
                {contactInfo.name}
              </Badge>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
            <div className="space-y-8">
              {contactInfo.logo && (
                <div className="flex justify-center md:justify-start">
                  <img 
                    src={contactInfo.logo} 
                    alt={contactInfo.name} 
                    className="h-20 w-20 rounded-full object-cover border-2"
                    style={{ borderColor: contactInfo.primary_color }}
                  />
                </div>
              )}

              <div className="flex gap-4 group">
                <div className="bg-primary/10 p-3 rounded-xl text-primary h-fit group-hover:bg-primary/20 transition-colors">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Notre Adresse</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {contactInfo.address}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 group">
                <div className="bg-primary/10 p-3 rounded-xl text-primary h-fit group-hover:bg-primary/20 transition-colors">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Téléphone</h3>
                  <p className="text-muted-foreground">{contactInfo.phone}</p>
                </div>
              </div>
              
              <div className="flex gap-4 group">
                <div className="bg-primary/10 p-3 rounded-xl text-primary h-fit group-hover:bg-primary/20 transition-colors">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Email</h3>
                  <p className="text-muted-foreground">{contactInfo.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">Réponse sous 24h</p>
                </div>
              </div>

              {/* ✅ Horaires d'ouverture depuis les settings */}
              <div className="flex gap-4 group">
                <div className="bg-primary/10 p-3 rounded-xl text-primary h-fit group-hover:bg-primary/20 transition-colors">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Horaires d'ouverture</h3>
                  <div className="space-y-1 text-muted-foreground">
                    {days.map(day => {
                      const hour = hours[day.key];
                      return hour && (
                        <div key={day.key} className="flex justify-between gap-4 text-sm">
                          <span>{day.label}</span>
                          <span className={hour === 'Fermé' ? 'text-red-500 font-medium' : ''}>
                            {hour}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {contactInfo.slug && (
                <div className="pt-4 border-t">
                  <Button variant="outline" asChild className="gap-2">
                    <Link to={`/showcase/${contactInfo.slug}`}>
                      <Building2 className="h-4 w-4" />
                      Retour au salon
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="bento-card p-6 md:p-8 bg-card shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    placeholder="Jean Dupont"
                    value={formData.name}
                    onChange={handleChange}
                    className="bg-background"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jean@exemple.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-background"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+226 07 07 07 07"
                    value={formData.phone}
                    onChange={handleChange}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Input
                    id="subject"
                    placeholder="Demande de renseignements"
                    value={formData.subject}
                    onChange={handleChange}
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="Comment pouvons-nous vous aider ?"
                    value={formData.message}
                    onChange={handleChange}
                    className="bg-background resize-none"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full text-base py-6 gap-2 text-white"
                  style={{ backgroundColor: contactInfo.primary_color }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Envoi en cours...
                    </span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Envoyer le message
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  * Champs obligatoires. Vos informations sont confidentielles.
                </p>
              </form>
            </div>
          </div>
        </div>

        <FloatingAiChat endpointUrl="/integrated-ai/stream-public" />
      </div>
      <PublicFooter />
    </>
  );
}