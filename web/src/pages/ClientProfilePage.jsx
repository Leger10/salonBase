import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar, MapPin, Save } from 'lucide-react';
import FloatingAiChat from '@/components/FloatingAiChat.jsx';

export default function ClientProfilePage() {
  const { currentUser, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    birthday: '',
    allergies: '',
    notes: ''
  });

  useEffect(() => {
    if (currentUser?.profile?.id) {
      fetchClientProfile();
    }
  }, [currentUser]);

  const fetchClientProfile = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      if (!tenantId || !profileId) {
        setLoading(false);
        return;
      }

      // Récupérer les infos client
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', profileId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching client:', error);
      }

      setClientData(client);
      setFormData({
        full_name: currentUser?.profile?.full_name || '',
        phone: currentUser?.profile?.phone || '',
        birthday: client?.birthday || '',
        allergies: client?.allergies || '',
        notes: client?.notes || ''
      });
    } catch (error) {
      console.error('Error fetching client profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      if (!tenantId || !profileId) {
        toast.error('Configuration non trouvée');
        return;
      }

      // 1. Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (profileError) throw profileError;

      // 2. Mettre à jour ou créer le client
      if (clientData?.id) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({
            birthday: formData.birthday || null,
            allergies: formData.allergies,
            notes: formData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientData.id);

        if (clientError) throw clientError;
      } else {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            tenant_id: tenantId,
            profile_id: profileId,
            birthday: formData.birthday || null,
            allergies: formData.allergies,
            notes: formData.notes,
            loyalty_points: 0,
            total_visits: 0,
            total_spent: 0
          });

        if (clientError) throw clientError;
      }

      toast.success('Profil mis à jour avec succès');
      fetchClientProfile();
      
      // Mettre à jour le contexte auth
      if (updateProfile) {
        await updateProfile({ full_name: formData.full_name, phone: formData.phone });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const name = formData.full_name || currentUser?.profile?.full_name || 'Client';
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-20 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Mon Profil
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez vos informations personnelles et vos préférences.
        </p>
      </div>

      <Card className="bento-card border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informations Personnelles
          </CardTitle>
          <CardDescription>Mettez à jour vos coordonnées de contact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-6 pb-6 border-b">
              <Avatar className="h-20 w-20 shadow-lg border-2 border-primary/20">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Photo de profil</p>
                <Button variant="outline" size="sm" type="button" className="mt-1">
                  Changer de photo
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="bg-background pl-10"
                    placeholder="Jean Dupont"
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
                    value={currentUser?.profile?.email || currentUser?.email}
                    readOnly
                    className="bg-muted text-muted-foreground pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="06 12 34 56 78"
                    className="bg-background pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Date de naissance</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={handleChange}
                    className="bg-background pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="allergies">Allergies / Intolérances</Label>
                <textarea
                  id="allergies"
                  rows={2}
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="Informez-nous de vos allergies (produits, parfums, etc.)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes supplémentaires</Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Préférences, informations importantes..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Statistiques client */}
      <Card className="bento-card border-none shadow-sm bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{clientData?.total_visits || 0}</p>
              <p className="text-xs text-muted-foreground">Visites totales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{clientData?.loyalty_points || 0}</p>
              <p className="text-xs text-muted-foreground">Points fidélité</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{(clientData?.total_spent || 0).toLocaleString()} FCFA</p>
              <p className="text-xs text-muted-foreground">Total dépensé</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{clientData?.created_at ? new Date(clientData.created_at).toLocaleDateString() : '-'}</p>
              <p className="text-xs text-muted-foreground">Membre depuis</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <FloatingAiChat endpointUrl="/integrated-ai/stream" />
    </div>
  );
}