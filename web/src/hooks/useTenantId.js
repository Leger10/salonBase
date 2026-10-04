// /src/hooks/useTenantId.js
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';

export function useTenantId() {
  const { currentUser } = useAuth();
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantId = async () => {
      try {
        // 1. Si utilisateur connecté, utiliser son tenant
        if (currentUser?.profile?.tenant_id) {
          setTenantId(currentUser.profile.tenant_id);
          setLoading(false);
          return;
        }

        // 2. Sinon, prendre le premier tenant actif
        const { data, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!error && data) {
          setTenantId(data.id);
        } else {
          // 3. Fallback: prendre le premier tenant disponible
          const { data: allTenants, error: allError } = await supabase
            .from('tenants')
            .select('id')
            .limit(1);
          
          if (!allError && allTenants && allTenants.length > 0) {
            setTenantId(allTenants[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching tenant ID:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantId();
  }, [currentUser]);

  return { tenantId, loading };
}