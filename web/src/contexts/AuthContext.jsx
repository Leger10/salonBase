import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

const AuthContext = createContext(null);

// Fonction helper pour récupérer l'utilisateur avec son profil
async function getCurrentUser() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Erreur récupération utilisateur:', userError);
      return null;
    }
    
    if (!user) return null;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, tenants(*)')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('Erreur récupération profil:', profileError);
      return { ...user, profile: null };
    }
    
    return { ...user, profile };
  } catch (error) {
    console.error('Erreur dans getCurrentUser:', error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const userWithProfile = await getCurrentUser();
          setCurrentUser(userWithProfile);
          setIsAuthenticated(!!userWithProfile);
        }
      } catch (error) {
        console.error("Erreur d'initialisation auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const userWithProfile = await getCurrentUser();
          setCurrentUser(userWithProfile);
          setIsAuthenticated(true);
          toast.success("Connexion réussie");
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setIsAuthenticated(false);
          toast.success("Déconnecté");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const userWithProfile = await getCurrentUser();
      
      if (!userWithProfile?.profile) {
        // Créer le profil s'il n'existe pas
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.email,
            role: 'client',
            is_active: true,
          });
        
        const refreshedUser = await getCurrentUser();
        setCurrentUser(refreshedUser);
        setIsAuthenticated(true);
        return { user: refreshedUser };
      }

      setCurrentUser(userWithProfile);
      setIsAuthenticated(!!userWithProfile);
      
      return { user: userWithProfile };
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // ============================================================
  // ✅ FONCTION SIGNUP COMPLÈTE AVEC GESTION DU RATE LIMIT
  // ============================================================
  const signup = async (userData) => {
    try {
      console.log('📝 Inscription pour:', userData.email);
      
      // ✅ TOUJOURS CLIENT à l'inscription
      const role = 'client';
      const tenantId = userData.tenant_id || null;

      // Créer l'utilisateur dans Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            phone: userData.phone,
            role: role,
            tenant_id: tenantId,
          },
          // ✅ Désactiver la confirmation par email pour éviter l'envoi
          emailRedirectTo: window.location.origin + '/auth/callback',
        }
      });

      if (authError) {
        // ✅ Gestion spécifique du rate limit
        if (authError.code === 'over_email_send_rate_limit') {
          toast.error('Trop de tentatives d\'inscription. Veuillez réessayer dans 1 heure.');
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        
        // ✅ Gestion des autres erreurs
        if (authError.code === 'email_provider_disabled') {
          toast.error('Les inscriptions par email sont désactivées. Contactez l\'administrateur.');
          throw new Error('EMAIL_PROVIDER_DISABLED');
        }
        
        if (authError.code === 'user_already_exists') {
          toast.error('Un compte avec cet email existe déjà.');
          throw new Error('USER_ALREADY_EXISTS');
        }
        
        throw authError;
      }

      console.log('✅ Utilisateur créé dans auth:', authData.user.id);

      // ✅ Vérifier si l'utilisateur a bien été créé
      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // ✅ Si le profil existe déjà, ne pas le recréer
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (existingProfile) {
        console.log('📌 Profil déjà existant');
        const userWithProfile = await getCurrentUser();
        setCurrentUser(userWithProfile);
        setIsAuthenticated(!!userWithProfile);
        toast.success("Inscription réussie");
        return { user: userWithProfile };
      }

      // ✅ Créer le profil avec le rôle client
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone || null,
          role: role, // Toujours client
          tenant_id: tenantId, // Si invitation, assigné au salon
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('❌ Erreur création profil:', profileError);
        throw new Error('Erreur lors de la création du profil');
      }

      console.log('✅ Profil client créé');
      
      // ✅ Attendre que le profil soit disponible
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const userWithProfile = await getCurrentUser();
      setCurrentUser(userWithProfile);
      setIsAuthenticated(!!userWithProfile);
      toast.success("Inscription réussie");
      
      return { user: userWithProfile };
      
    } catch (error) {
      console.error('❌ Erreur d\'inscription:', error);
      
      // ✅ Ne pas afficher de toast si l'erreur est déjà gérée
      if (error.message === 'RATE_LIMIT_EXCEEDED' || 
          error.message === 'EMAIL_PROVIDER_DISABLED' || 
          error.message === 'USER_ALREADY_EXISTS') {
        throw error;
      }
      
      toast.error(error.message || "Erreur lors de l'inscription");
      throw error;
    }
  };

  // ✅ Fonction pour promouvoir un client en Admin (Super Admin uniquement)
  const promoteToAdmin = async (userId, tenantId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          tenant_id: tenantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Utilisateur promu Admin avec succès');
      return { success: true };
    } catch (error) {
      console.error('Erreur promotion admin:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // ✅ Fonction pour promouvoir un client en Employé (Admin uniquement)
  const promoteToEmployee = async (userId, tenantId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'employee',
          tenant_id: tenantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Utilisateur promu Employé avec succès');
      return { success: true };
    } catch (error) {
      console.error('Erreur promotion employee:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // ✅ Fonction pour générer un lien d'invitation pour un salon
  const generateInviteLink = (tenantId, salonName) => {
    const baseUrl = window.location.origin;
    const encodedSalon = encodeURIComponent(salonName);
    return `${baseUrl}/auth/signup?tenant=${tenantId}&salon=${encodedSalon}`;
  };

  const forgotPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        if (error.code === 'over_email_send_rate_limit') {
          toast.error('Trop de demandes. Veuillez réessayer dans 1 heure.');
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        throw error;
      }
      
      toast.success("Email de réinitialisation envoyé");
      return { message: "Email sent" };
    } catch (error) {
      if (error.message !== 'RATE_LIMIT_EXCEEDED') {
        toast.error(error.message);
      }
      throw error;
    }
  };

  const resetPassword = async (accessToken, newPassword) => {
    try {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      });
      
      if (sessionError) throw sessionError;
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success("Mot de passe réinitialisé avec succès");
      return { message: "Password reset successfully" };
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.message || "Erreur lors de la réinitialisation");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsAuthenticated(false);
      navigate("/");
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    login,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    promoteToAdmin,
    promoteToEmployee,
    generateInviteLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}