import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Clock, DollarSign } from 'lucide-react';

export default function ServiceSelector({ selectedSalonType, onServiceSelect, selectedServiceId }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);

  // Récupérer le tenant actif
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('subscription_status', 'active')
          .limit(1)
          .single();

        if (error) throw error;
        setTenantId(data?.id);
      } catch (error) {
        console.error('Error fetching tenant:', error);
      }
    };
    fetchTenant();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedSalonType || !tenantId) {
        setServices([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Filtrer par catégorie ou salon_type
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) throw error;

        // Filtrer par type de salon (si la colonne salon_type existe)
        // Sinon, on utilise la catégorie
        const filtered = data?.filter(service => 
          service.salon_type === selectedSalonType || 
          service.category === selectedSalonType ||
          service.categories?.name === selectedSalonType
        ) || data || [];

        setServices(filtered);
      } catch (error) {
        console.error('Failed to fetch services:', error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [selectedSalonType, tenantId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!selectedSalonType) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 py-12 text-center">
        <p className="text-muted-foreground">Sélectionnez un type de salon pour voir les services disponibles</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 py-12 text-center">
        <p className="font-medium">Aucun service disponible</p>
        <p className="text-sm text-muted-foreground mt-1">Aucun service trouvé pour ce type de salon</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const isSelected = selectedServiceId === service.id;
        return (
          <Card
            key={service.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary shadow-md' : ''
            }`}
            onClick={() => onServiceSelect(service)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                  {service.icon_emoji || '✂️'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{service.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-primary">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{service.price.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}