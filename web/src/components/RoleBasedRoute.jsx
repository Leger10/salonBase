import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';

/**
 * Composant de redirection basé sur le rôle de l'utilisateur
 * Utilise currentUser.profile.role de Supabase
 */
export default function RoleBasedRoute() {
  const { isAuthenticated, currentUser, isLoading } = useAuth();

  // ✅ Utiliser isLoading au lieu de initialLoading
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/auth/login" replace />;
  }

  // ✅ Récupérer le rôle depuis profile (structure Supabase)
  const role = currentUser?.profile?.role || currentUser?.role;

  switch (role) {
    case 'super_admin':
      return <Navigate to="/super-admin/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'employee':
      return <Navigate to="/employee/dashboard" replace />;
    case 'client':
      return <Navigate to="/client/dashboard" replace />;
    default:
      // Si le rôle n'est pas reconnu, rediriger vers login
      console.warn('Rôle non reconnu:', role);
      return <Navigate to="/auth/login" replace />;
  }
}