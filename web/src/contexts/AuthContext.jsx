import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch, authApi, fetchMe, toCurrentUser } from "@/lib/api";

const AuthContext = createContext(null);

/**
 * L'authentification passe desormais par l'API Node (Better Auth) au lieu de
 * Supabase. Le contrat expose ici est volontairement identique a celui
 * d'avant : les 155 composants qui utilisent `useAuth()` n'ont pas a changer.
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      const user = toCurrentUser(me);
      setCurrentUser(user);
      setIsAuthenticated(Boolean(user));
      return user;
    } catch (error) {
      // 401 = session absente ou expiree, c'est un cas normal au chargement.
      if (error.status !== 401) console.error("Erreur chargement session:", error);
      setCurrentUser(null);
      setIsAuthenticated(false);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // La session expire toute seule cote serveur : on rafraichit periodicque.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && isAuthenticated) refresh();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password) => {
      try {
        await authApi.signIn(email, password);
        const user = await refresh();
        if (!user) throw new Error("Session invalide apres connexion.");
        toast.success("Connexion réussie");
        return { user };
      } catch (error) {
        const message =
          error.status === 401 || /invalid|identifiants/i.test(error.message)
            ? "Email ou mot de passe incorrect."
            : error.message;
        toast.error(message);
        throw new Error(message);
      }
    },
    [refresh]
  );

  // Le role (client) et l'etablissement sont fixes par le serveur :
  // Better Auth refuse ces champs envoyes par le client (input: false).
  const signup = useCallback(
    async (userData) => {
      try {
        await authApi.signUp({
          email: userData.email,
          password: userData.password,
          name: userData.full_name || userData.email,
          phone: userData.phone || undefined,
        });

        const user = await refresh();
        toast.success("Inscription réussie");
        return { user };
      } catch (error) {
        if (error.status === 422 || /already|existe/i.test(error.message)) {
          const message = "Un compte avec cet email existe déjà.";
          toast.error(message);
          throw new Error("USER_ALREADY_EXISTS", { cause: message });
        }
        toast.error(error.message || "Erreur lors de l'inscription");
        throw error;
      }
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      navigate("/");
    }
  }, [navigate]);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      await authApi.changePassword(currentPassword, newPassword);
      await refresh();
      toast.success("Mot de passe modifié");
      return { success: true };
    },
    [refresh]
  );

  const promote = useCallback(
    async (userId, tenantId, role) => {
      try {
        const data = await apiFetch(`/api/profiles/${encodeURIComponent(userId)}`, {
          method: "PATCH",
          body: { role, tenant_id: tenantId },
        });
        toast.success(
          role === "admin" ? "Utilisateur promu Admin" : "Utilisateur promu Employé"
        );
        return data;
      } catch (error) {
        toast.error(error.message);
        throw error;
      }
    },
    []
  );

  const promoteToAdmin = useCallback(
    (userId, tenantId) => promote(userId, tenantId, "admin"),
    [promote]
  );

  const promoteToEmployee = useCallback(
    (userId, tenantId) => promote(userId, tenantId, "employee"),
    [promote]
  );

  // Necessite un service d'email configure cote serveur (non actif en dev).
  const forgotPassword = useCallback(async (email) => {
    try {
      await authApi.requestPasswordReset(email, `${window.location.origin}/auth/reset-password`);
      toast.success("Email de réinitialisation envoyé");
      return { message: "Email sent" };
    } catch (error) {
      toast.error(error.message || "La réinitialisation par email n'est pas disponible.");
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await authApi.resetPassword(token, newPassword);
      toast.success("Mot de passe réinitialisé");
      return { message: "Password reset successfully" };
    } catch (error) {
      toast.error(error.message || "Erreur lors de la réinitialisation");
      throw error;
    }
  }, []);

  const generateInviteLink = useCallback((tenantId, salonName) => {
    const encodedSalon = encodeURIComponent(salonName ?? "");
    return `${window.location.origin}/auth/signup?tenant=${tenantId}&salon=${encodedSalon}`;
  }, []);

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    promoteToAdmin,
    promoteToEmployee,
    generateInviteLink,
    refresh,
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