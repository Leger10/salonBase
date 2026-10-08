// /src/lib/supabase.js
//
// Point d'entree unique pour l'acces aux donnees. Le nom du fichier et les
// exports sont conserves pour que les ~110 fichiers qui l'importent n'aient
// rien a changer, mais il ne cree plus de client Supabase : les requetes
// passent par l'API Node (MariaDB + Prisma).
//
// Deux consequences importantes :
//  - plus aucune cle Supabase n'est necessaire dans le navigateur ;
//  - `supabaseAdmin` a disparu. Il exposait la cle service_role a tout
//    visiteur et n'etait utilise nulle part.
import { createDataClient } from './supabase-shim.js';
import { apiFetch } from './api.js';

export const supabase = createDataClient();

/**
 * Utiliser `supabaseAdmin` est une faille : ce client disposait de la cle
 * service_role, qui contourne toute securite. Les operations d'administration
 * passent desormais par l'API, qui verifie le role de la session.
 */
export const supabaseAdmin = null;

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