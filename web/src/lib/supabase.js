// /src/lib/supabase.js
//
// Point d'entree unique pour l'acces aux donnees. Le nom du fichier et les
// exports sont conserves pour que les ~110 fichiers qui l'importent n'aient
// rien a changer, mais il ne cree plus de client Supabase : les requetes
// passent par l'API Node (MariaDB + Prisma).
//
// Deux consequences importantes :
//  - plus aucune cle Supabase n'est necessaire dans le navigateur ;
//  - `supabaseAdmin` n'est plus un client Supabase : il n'expose plus la cle
//    service_role, mais un petit adaptateur vers les routes /api/admin/users,
//    qui verifient le role de la session cote serveur.
import { createDataClient } from './supabase-shim.js';
import { apiFetch } from './api.js';

export const supabase = createDataClient();

/**
 * Adaptateur de compatibilite pour les pages SuperAdmin qui appelaient
 * `supabaseAdmin.auth.admin.*`. Aucune cle privilegiee ne vit ici : chaque
 * methode appelle l'API, qui applique les regles de role.
 */
export const supabaseAdmin = {
  auth: {
    admin: {
      createUser: async ({ email, password, user_metadata }) => {
        try {
          const data = await apiFetch('/api/admin/users', {
            method: 'POST',
            body: {
              email,
              password,
              full_name: user_metadata?.full_name ?? '',
              phone: user_metadata?.phone ?? null,
              role: user_metadata?.role ?? 'client',
              tenant_id: user_metadata?.tenant_id ?? null,
            },
          });
          return { data: { user: data?.user ?? null }, error: null };
        } catch (error) {
          return { data: { user: null }, error };
        }
      },
      // Les roles/statuts sont portes par la table `profiles` ; les pages les
      // ecrivent deja directement. Cette synchronisation de metadonnees n'a
      // donc plus de cible : on renvoie un succes sans appel reseau.
      updateUserById: async () => ({ data: { user: null }, error: null }),
      deleteUser: async (id) => {
        try {
          await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
          return { data: null, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
    },
  },
};

// ✅ Helper functions

/**
 * Utilisateur connecte + son profil. Remplace l'ancien
 * `supabase.auth.getUser()` suivi d'un select avec jointure.
 */
export const getCurrentUser = async () => {
  try {
    const me = await apiFetch('/api/me');
    return { ...me, profile: me.profile ?? null };
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
};

export const hasActiveSubscription = async (tenantId) => {
  const { data } = await supabase
    .from('tenants')
    .select('subscription_status, subscription_end')
    .eq('id', tenantId)
    .single();

  return (
    data?.subscription_status === 'active' && new Date(data.subscription_end) > new Date()
  );
};

// ✅ Export par défaut
export default supabase;