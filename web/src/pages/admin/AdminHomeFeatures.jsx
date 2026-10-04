// /src/pages/admin/AdminHomeFeatures.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  LayoutDashboard,
  Calendar,
  Ticket,
  Users,
  Scissors,
  Package,
  Receipt,
  Award,
  Tag,
  Gift,
  MessageSquare,
  Clock,
  CreditCard,
  BarChart3,
  Settings,
  Sparkles,
  ShoppingBag,
  UserPlus,
  Building2,
  Wrench,
  Globe,
  TrendingUp,
  Headphones,
  ClipboardList,
  Truck,
  Store,
  Zap,
  Heart
} from 'lucide-react';

// Configuration complète des fonctionnalités admin
const features = [
  { 
    id: 'dashboard',
    title: 'Tableau de bord',
    description: 'Vue d\'ensemble de votre activité en temps réel',
    icon: LayoutDashboard,
    path: '/admin/dashboard',
    color: 'from-indigo-500 to-indigo-600',
    category: 'Général'
  },
  { 
    id: 'appointments',
    title: 'Rendez-vous',
    description: 'Gérez tous les rendez-vous et réservations',
    icon: Calendar,
    path: '/admin/appointments',
    color: 'from-blue-500 to-blue-600',
    category: 'Gestion'
  },
  { 
    id: 'tickets',
    title: 'File d\'attente',
    description: 'Gérez la file d\'attente des clients en temps réel',
    icon: Ticket,
    path: '/admin/tickets',
    color: 'from-cyan-500 to-cyan-600',
    category: 'Gestion',
    badge: true
  },
  { 
    id: 'clients',
    title: 'Clients',
    description: 'Base de données clients et historique des rendez-vous',
    icon: Users,
    path: '/admin/clients',
    color: 'from-teal-500 to-teal-600',
    category: 'Gestion'
  },
  { 
    id: 'team',
    title: 'Équipe',
    description: 'Gérez votre personnel et leurs compétences',
    icon: UserPlus,
    path: '/admin/team',
    color: 'from-purple-500 to-purple-600',
    category: 'Gestion'
  },
  { 
    id: 'services',
    title: 'Services',
    description: 'Catalogue de vos services et prestations',
    icon: Scissors,
    path: '/admin/services',
    color: 'from-yellow-500 to-yellow-600',
    category: 'Catalogue'
  },
  { 
    id: 'products',
    title: 'Produits',
    description: 'Gérez vos produits et fournitures',
    icon: Package,
    path: '/admin/products',
    color: 'from-orange-500 to-orange-600',
    category: 'Catalogue'
  },
  { 
    id: 'cashier',
    title: 'Caisse',
    description: 'Gestion des encaissements et transactions',
    icon: Receipt,
    path: '/admin/cashier',
    color: 'from-emerald-500 to-emerald-600',
    category: 'Finances'
  },
  { 
    id: 'payments',
    title: 'Paiements',
    description: 'Historique des paiements et factures',
    icon: CreditCard,
    path: '/admin/payments',
    color: 'from-rose-500 to-rose-600',
    category: 'Finances'
  },
  { 
    id: 'loyalty',
    title: 'Fidélité',
    description: 'Programme de fidélité et gestion des points',
    icon: Award,
    path: '/admin/loyalty',
    color: 'from-amber-500 to-amber-600',
    category: 'Marketing'
  },
  { 
    id: 'promotions',
    title: 'Promotions',
    description: 'Créez et gérez vos promotions et offres spéciales',
    icon: Tag,
    path: '/admin/promotions',
    color: 'from-fuchsia-500 to-fuchsia-600',
    category: 'Marketing'
  },
  { 
    id: 'gift-cards',
    title: 'Cartes cadeaux',
    description: 'Créez et gérez vos cartes cadeaux',
    icon: Gift,
    path: '/admin/gift-cards',
    color: 'from-pink-500 to-pink-600',
    category: 'Marketing'
  },
  { 
    id: 'marketing',
    title: 'Marketing',
    description: 'Campagnes email, SMS et notifications push',
    icon: MessageSquare,
    path: '/admin/marketing',
    color: 'from-violet-500 to-violet-600',
    category: 'Marketing'
  },
  { 
    id: 'plannings',
    title: 'Plannings',
    description: 'Gérez les plannings de votre équipe en temps réel',
    icon: Clock,
    path: '/admin/plannings',
    color: 'from-sky-500 to-sky-600',
    category: 'Gestion'
  },
  { 
    id: 'analytics',
    title: 'Analytique',
    description: 'Statistiques avancées et rapports d\'activité',
    icon: BarChart3,
    path: '/admin/analytics',
    color: 'from-indigo-500 to-indigo-600',
    category: 'Analytique'
  },
  { 
    id: 'branches',
    title: 'Établissements',
    description: 'Gérez plusieurs succursales',
    icon: Building2,
    path: '/admin/branches',
    color: 'from-emerald-500 to-emerald-600',
    category: 'Configuration'
  },
  { 
    id: 'equipment',
    title: 'Matériel',
    description: 'Gestion du matériel et des équipements',
    icon: Wrench,
    path: '/admin/equipment',
    color: 'from-cyan-500 to-cyan-600',
    category: 'Configuration'
  },
  { 
    id: 'booking',
    title: 'Réservation en ligne',
    description: 'Configurez la réservation en ligne',
    icon: Globe,
    path: '/admin/booking-settings',
    color: 'from-violet-500 to-violet-600',
    category: 'Configuration'
  },
  { 
    id: 'inventory',
    title: 'Inventaire',
    description: 'Gestion complète de l\'inventaire',
    icon: ClipboardList,
    path: '/admin/inventory',
    color: 'from-lime-500 to-lime-600',
    category: 'Catalogue'
  },
  { 
    id: 'suppliers',
    title: 'Fournisseurs',
    description: 'Gérez vos fournisseurs et commandes',
    icon: Truck,
    path: '/admin/suppliers',
    color: 'from-stone-500 to-stone-600',
    category: 'Catalogue'
  },
  { 
    id: 'settings',
    title: 'Paramètres',
    description: 'Configuration de votre salon',
    icon: Settings,
    path: '/admin/settings',
    color: 'from-gray-500 to-gray-600',
    category: 'Configuration'
  },
  { 
    id: 'support',
    title: 'Support',
    description: 'Aide et assistance',
    icon: Headphones,
    path: '/admin/support',
    color: 'from-red-500 to-red-600',
    category: 'Support'
  }
];

// Regrouper les fonctionnalités par catégorie
const groupedFeatures = features.reduce((acc, feature) => {
  if (!acc[feature.category]) {
    acc[feature.category] = [];
  }
  acc[feature.category].push(feature);
  return acc;
}, {});

export default function AdminHomeFeatures() {
  return (
    <TooltipProvider>
      <div className="space-y-12">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Toutes les fonctionnalités</h2>
          <p className="text-muted-foreground">
            Gérez tous les aspects de votre salon depuis un seul endroit
          </p>
        </div>

        {Object.entries(groupedFeatures).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">
              {category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Tooltip key={feature.id}>
                    <TooltipTrigger asChild>
                      {/* ✅ Utiliser un div avec la ref au lieu de Card directement */}
                      <div className="h-full">
                        <Card 
                          className="group cursor-pointer hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/30 relative h-full"
                        >
                          {feature.badge && (
                            <div className="absolute -top-2 -right-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                3
                              </span>
                            </div>
                          )}
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-sm flex-shrink-0`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <CardTitle className="text-sm font-semibold line-clamp-1">{feature.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground line-clamp-2">{feature.description}</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              asChild 
                              className="mt-3 w-full text-xs group-hover:bg-primary/5 transition-colors"
                            >
                              <Link to={feature.path}>
                                Accéder
                                <Sparkles className="h-3 w-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{feature.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}