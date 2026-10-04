// /src/pages/admin/AdminHomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DashboardLayout from '@/layouts/DashboardLayout.jsx';
import AdminHomeFeatures from '@/pages/admin/AdminHomeFeatures.jsx';
import { 
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Bell,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function AdminHomePage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    totalClients: 0,
    pendingTickets: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Simuler le chargement des données
    setTimeout(() => {
      setStats({
        appointmentsToday: 12,
        totalClients: 156,
        pendingTickets: 3,
        revenue: 2840
      });
      setNotifications([
        { id: 1, message: 'Nouvelle réservation de Sophie Martin', time: 'Il y a 5 min', type: 'success' },
        { id: 2, message: 'Paiement de 85€ reçu pour une coupe', time: 'Il y a 15 min', type: 'success' },
        { id: 3, message: 'Rappel : Rendez-vous dans 30 min - Jean Dupont', time: 'Il y a 1h', type: 'warning' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bonjour, {currentUser?.profile?.full_name || currentUser?.full_name || 'Admin'} 👋
            </h1>
            <p className="text-muted-foreground">
              Voici un résumé de votre activité aujourd'hui
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/appointments/new">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                Nouveau rendez-vous
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rendez-vous aujourd'hui</p>
                <p className="text-2xl font-bold mt-1">{stats.appointmentsToday}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl dark:bg-blue-950">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">+2</span>
              <span className="text-sm text-muted-foreground">vs hier</span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold mt-1">{stats.totalClients}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl dark:bg-purple-950">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">+8%</span>
              <span className="text-sm text-muted-foreground">ce mois</span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">File d'attente</p>
                <p className="text-2xl font-bold mt-1">{stats.pendingTickets}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl dark:bg-orange-950">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-600">En attente</span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenu du jour</p>
                <p className="text-2xl font-bold mt-1">{stats.revenue} €</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl dark:bg-green-950">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">+12%</span>
              <span className="text-sm text-muted-foreground">vs hier</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AdminHomeFeatures />
          </div>

          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-card rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <Link to="/admin/notifications" className="text-sm text-primary hover:underline">
                  Voir tout
                </Link>
              </div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    {notif.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.message}</p>
                      <p className="text-xs text-muted-foreground">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taux d'occupation</span>
                  <span className="font-medium">78%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Satisfaction client</span>
                  <span className="font-medium">4.8 ★</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taux de retour</span>
                  <span className="font-medium">12%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}