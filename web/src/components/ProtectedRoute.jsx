import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, currentUser, isLoading } = useAuth();
  const location = useLocation();

  // Debug - Afficher les informations de l'utilisateur
  console.log('🔐 ProtectedRoute - État:', {
    isLoading,
    isAuthenticated,
    userRole: currentUser?.profile?.role,
    requiredRole,
    userId: currentUser?.id,
  });

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
    console.log('🔒 Non authentifié - redirection vers login');
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // ✅ Récupération du rôle depuis le profil (structure Supabase)
  const userRole = currentUser?.profile?.role || currentUser?.role;
  
  console.log('🎯 Rôle détecté:', userRole);

  if (requiredRole && userRole !== requiredRole) {
    console.log(`🔒 Accès refusé - Rôle requis: ${requiredRole}, Rôle actuel: ${userRole}`);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('✅ Accès autorisé');
  return children;
}