// /src/App.jsx
import React from "react";
import {
  Route,
  Routes,
  BrowserRouter as Router,
  Navigate,
  Link,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext.jsx";
import { SubscriptionAuthProvider } from "@/contexts/SubscriptionAuthContext.jsx";
import { ThemeProvider } from "@/contexts/ThemeContext.jsx";
import { TenantProvider } from "@/contexts/TenantContext.jsx";
import { ActiveTenantProvider } from "@/contexts/ActiveTenantContext";
import { PlatformConfigProvider } from "@/contexts/PlatformConfigContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import ScrollToTop from "@/components/ScrollToTop.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import { Toaster } from "@/components/ui/sonner.jsx";
import { Helmet } from "react-helmet-async";

// ========== LAYOUT UNIFIÉ ==========
import DashboardLayout from "@/layouts/DashboardLayout.jsx";

// ========== PAGES PUBLIQUES ==========
import HomePage from "@/pages/HomePage.jsx";
import ServicesPage from "@/pages/ServicesPage.jsx";
import GalleryPage from "@/pages/GalleryPage.jsx";
import TeamPage from "@/pages/TeamPage.jsx";
import ContactPage from "@/pages/ContactPage.jsx";
import PricingPage from "@/pages/PricingPage.jsx";
import ReviewsPage from "@/pages/ReviewsPage.jsx";
import AboutPage from "@/pages/AboutPage.jsx";
import TenantShowcase from "@/pages/TenantShowcase.jsx";
import TicketQueuePage from "@/pages/TicketQueuePage.jsx";
import RateEmployeePage from "./pages/RateEmployeePage";
import GiftCardPublic from "@/pages/GiftCardPublic";

// ========== PAGES PUB ==========
import PublicDisplayPage from "@/pages/public/PublicDisplayPage";

// ========== RÉSERVATION ==========
import BookingPage from "@/pages/BookingPage.jsx";
import BookingSuccessPage from "@/pages/BookingSuccessPage.jsx";

// ========== AUTHENTIFICATION ==========
import LoginPage from "@/pages/LoginPage.jsx";
import SignupPage from "@/pages/SignupPage.jsx";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "@/pages/ResetPasswordPage.jsx";

// ========== DASHBOARDS ==========
import SuperAdminDashboard from "@/pages/SuperAdminDashboard.jsx";
import AdminDashboard from "@/pages/AdminDashboard.jsx";
import EmployeeDashboard from "@/pages/EmployeeDashboard.jsx";
import ClientDashboard from "@/pages/ClientDashboard.jsx";

// ========== SUPER ADMIN PAGES ==========
import SuperAdminTenantsPage from "@/pages/SuperAdminTenantsPage.jsx";
import SuperAdminAdminsPage from "@/pages/SuperAdminAdminsPage.jsx";
import SuperAdminAnalyticsPage from "@/pages/SuperAdminAnalyticsPage.jsx";
import SuperAdminSettingsPage from "@/pages/SuperAdminSettingsPage.jsx";
import SuperAdminSubscriptions from "@/pages/SuperAdminSubscriptions.jsx";
import SuperAdminSubscriptionPlans from "@/pages/SuperAdminSubscriptionPlans.jsx";
import SuperAdminLogsPage from "@/pages/SuperAdminLogsPage.jsx";
import SuperAdminNotificationsPage from "@/pages/SuperAdminNotificationsPage.jsx";
import SuperAdminReportsPage from "@/pages/SuperAdminReportsPage.jsx";
import SuperAdminSupportPage from "@/pages/SuperAdminSupportPage.jsx";
import SuperAdminUsers from "@/pages/SuperAdminUsers.jsx";
import SuperAdminSubscriptionValidation from "@/pages/SuperAdminSubscriptionValidation.jsx";
import SuperAdminServicesPage from "@/pages/SuperAdminServicesPage.jsx";

// ========== DETAIL/FORM PAGES ==========
import SuperAdminTenantDetailPage from "@/pages/SuperAdminTenantDetailPage.jsx";
import SuperAdminTenantFormPage from "@/pages/SuperAdminTenantFormPage.jsx";
import SuperAdminAdminDetailPage from "@/pages/SuperAdminAdminDetailPage.jsx";
import SuperAdminAdminFormPage from "@/pages/SuperAdminAdminFormPage.jsx";
import SuperAdminSubscriptionDetailPage from "@/pages/SuperAdminSubscriptionDetailPage.jsx";
import SuperAdminUserDetailPage from "@/pages/SuperAdminUserDetailPage.jsx";

// ========== ADMIN PAGES ==========
import AdminHomeFeatures from "@/pages/admin/AdminHomeFeatures.jsx";
import AdminTicketQueuePage from "@/pages/admin/AdminTicketQueuePage.jsx";
import ClientsPage from "@/pages/ClientsPage.jsx";
import ClientDetailPage from "@/pages/ClientDetailPage.jsx";
import AdminClientsPage from "./pages/AdminClientsPage";
import NewClientPage from "@/pages/admin/NewClientPage.jsx";
import TeamManagement from "@/pages/admin/TeamManagement.jsx";
import AdminAppointmentsPage from "@/pages/AdminAppointmentsPage.jsx";
import AdminServiceManagement from "@/pages/admin/AdminServiceManagement.jsx";
import ProductsPage from "@/pages/admin/ProductsPage.jsx";
import AdminProductFormPage from "@/pages/admin/AdminProductFormPage.jsx";
import AdminLoyaltyPage from "@/pages/AdminLoyaltyPage.jsx";
import AdminPromotionsPage from "@/pages/AdminPromotionsPage.jsx";
import AdminSupportPage from "@/pages/AdminSupportPage.jsx";
import GiftCards from "@/pages/admin/GiftCards.jsx";
import AdminPlanningsPage from "@/pages/AdminPlanningsPage.jsx";
import AdminSubscriptionsPage from "@/pages/AdminSubscriptionsPage.jsx";

import AdminBookingSettingsPage from "@/pages/AdminBookingSettingsPage.jsx";
import MarketingPage from "@/pages/MarketingPage.jsx";
import SMSTemplatesPage from "@/pages/SMSTemplatesPage.jsx";
import CashierPage from "@/pages/CashierPage.jsx";
import PaymentIntegrationPage from "@/pages/PaymentIntegrationPage.jsx";
import AdminBranchesPage from "./pages/AdminBranchesPage.jsx";
import AdminEquipmentPage from "@/pages/AdminEquipmentPage.jsx";
import AnalyticsPage from "@/pages/AnalyticsPage.jsx";
import AdminSettingsPage from "@/pages/AdminSettingsPage.jsx";
import SubscriptionRequestSuccess from "./pages/SubscriptionRequestSuccess";
import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage.jsx";

// ========== EMPLOYEE PAGES ==========
import EmployeeTicketQueuePage from "@/pages/EmployeeTicketQueuePage.jsx";
import EmployeeSchedulePage from "@/pages/EmployeeSchedulePage.jsx";

// ========== CLIENT PAGES ==========
import ClientBookingsPage from "@/pages/ClientBookingsPage.jsx";
import ClientProfilePage from "@/pages/ClientProfilePage.jsx";
import LoyaltyPage from "@/pages/LoyaltyPage.jsx";
import PromotionsPage from "@/pages/PromotionsPage.jsx";

// ========== ABONNEMENTS ==========
import PlansPage from "@/pages/PlansPage.jsx";
import SubscriptionsPage from "@/pages/SubscriptionsPage.jsx";
import {
  LOGIN_PATH,
  PLANS_PATH,
  MANAGE_PATH,
} from "@/config/subscriptionRoutes.js";
import AdminSubscription from "@/pages/AdminSubscription.jsx";

// ========== GUARD ==========
import SubscriptionGuard from "@/components/SubscriptionGuard.jsx";

// ========== DYNAMIC FAVICON ==========
import DynamicFavicon from "@/components/DynamicFavicon";

// ✅ Composant de placeholder pour les pages en développement
const PlaceholderPage = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
    <div className="text-6xl mb-4">🚧</div>
    <h1 className="text-2xl font-bold mb-2">
      {title || "Page en construction"}
    </h1>
    <p className="text-muted-foreground">
      Cette page est actuellement en développement.
    </p>
  </div>
);

// ========== COMPOSANT SEO GLOBAL ==========
const GlobalSEO = () => {
  return (
    <Helmet>
      {/* Métadonnées globales */}
      <html lang="fr-FR" />
      <meta name="theme-color" content="#ec4899" />
      <meta name="msapplication-TileColor" content="#ec4899" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="format-detection" content="telephone=yes" />
      <meta name="apple-mobile-web-app-title" content="BeautyFlow" />

      {/* Favicons par défaut */}
      <link
        rel="icon"
        type="image/png"
        href="/favicon-96x96.png"
        sizes="96x96"
      />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Vérification des moteurs de recherche */}
      <meta name="google-site-verification" content="VOTRE_CODE_GOOGLE" />
      <meta name="yandex-verification" content="VOTRE_CODE_YANDEX" />
      <meta name="msvalidate.01" content="VOTRE_CODE_BING" />

      {/* Open Graph global */}
      <meta property="og:site_name" content="BeautyFlow" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:type" content="website" />

      {/* Twitter Card global */}
      <meta name="twitter:card" content="summary_large_image" />

      {/* Canonical par défaut */}
      <link rel="canonical" href="https://beautyflow.com/" />
    </Helmet>
  );
};

// ========== HELPER REDIRECTION ==========
const DashboardRedirect = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return null;
  if (!currentUser) return <Navigate to="/auth/login" replace />;

  const role = currentUser?.profile?.role;

  if (role === "super_admin")
    return <Navigate to="/super-admin/dashboard" replace />;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "employee") return <Navigate to="/employee/dashboard" replace />;
  return <Navigate to="/client/dashboard" replace />;
};

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <Router>
        <AuthProvider>
          <TenantProvider>
            <SubscriptionAuthProvider>
              <PlatformConfigProvider>
                <ActiveTenantProvider>
                  <DynamicFavicon />
                  <ScrollToTop />
                  <GlobalSEO />
                  <Toaster position="top-center" richColors />
                  <Routes>
                    {/* ============================================================
                    ROUTES PUBLIQUES
                    ============================================================ */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/team" element={<TeamPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/reviews" element={<ReviewsPage />} />
                    <Route path="/about" element={<AboutPage />} />
<Route path="/promotions" element={<PromotionsPage />} />
<Route path="/showcase/:slug/promotions" element={<PromotionsPage />} />
                    <Route
                      path="/gift-cards/tenant/:slug"
                      element={<GiftCardPublic />}
                    />
                    
                    {/* ✅ Route Showcase - Page vitrine du salon */}
                    <Route path="/showcase/:slug" element={<TenantShowcase />} />
                    
                    {/* ✅ Routes pour les pages du salon en mode showcase */}
                    <Route path="/showcase/:slug/services" element={<ServicesPage />} />
                    <Route path="/showcase/:slug/gallery" element={<GalleryPage />} />
                    <Route path="/showcase/:slug/team" element={<TeamPage />} />
                    <Route path="/showcase/:slug/about" element={<AboutPage />} />
                    <Route path="/showcase/:slug/contact" element={<ContactPage />} />
                    <Route path="/showcase/:slug/reviews" element={<ReviewsPage />} />
                    <Route path="/showcase/:slug/booking" element={<BookingPage />} /> 
                    <Route path="/showcase/:slug" element={<TenantShowcase />} />
                    <Route
                      path="/rate-employee/:employeeId"
                      element={<RateEmployeePage />}
                    />
                    <Route
                      path="/public-display"
                      element={<PublicDisplayPage />}
                    />
                    <Route
                      path="/public-display/:tenantId"
                      element={<PublicDisplayPage />}
                    />
                    
                    {/* ROUTES POUR LES ACTIONS */}
                    <Route path="/tickets" element={<TicketQueuePage />} />

                    {/* ============================================================
                    ROUTES RÉSERVATION
                    ============================================================ */}
                    <Route path="/booking" element={<BookingPage />} />
                    <Route
                      path="/booking/tenant/:slug"
                      element={<BookingPage />}
                    />
                    <Route
                      path="/booking/success"
                      element={<BookingSuccessPage />}
                    />

                    {/* ============================================================
                    ROUTES AUTHENTIFICATION
                    ============================================================ */}
                    <Route
                      path="/auth/login"
                      element={<LoginPage defaultTab="login" />}
                    />
                    <Route path="/auth/signup" element={<SignupPage />} />
                    <Route
                      path="/auth/forgot-password"
                      element={<ForgotPasswordPage />}
                    />
                    <Route
                      path="/auth/reset-password"
                      element={<ResetPasswordPage />}
                    />
                    <Route
                      path="/login"
                      element={<Navigate to="/auth/login" replace />}
                    />
                    <Route
                      path="/register"
                      element={<Navigate to="/auth/signup" replace />}
                    />
                    <Route
                      path={LOGIN_PATH}
                      element={<Navigate to="/auth/login" replace />}
                    />

                    {/* ============================================================
                    ROUTES ABONNEMENTS
                    ============================================================ */}
                    <Route path={PLANS_PATH} element={<PlansPage />} />
                    <Route
                      path={MANAGE_PATH}
                      element={
                        <ProtectedRoute>
                          <SubscriptionsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* ============================================================
                    REDIRECTION GÉNÉRIQUE
                    ============================================================ */}
                    <Route path="/dashboard" element={<DashboardRedirect />} />

                    {/* ============================================================
                    ROUTES PROTÉGÉES AVEC LAYOUT UNIFIÉ
                    ============================================================ */}

                    {/* ========== SUPER ADMIN ========== */}
                    <Route
                      path="/super-admin"
                      element={
                        <ProtectedRoute requiredRole="super_admin">
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route
                        index
                        element={
                          <Navigate to="/super-admin/dashboard" replace />
                        }
                      />
                      <Route
                        path="dashboard"
                        element={<SuperAdminDashboard />}
                      />
                      <Route
                        path="tenants"
                        element={<SuperAdminTenantsPage />}
                      />
                      <Route
                        path="tenants/:id"
                        element={<SuperAdminTenantDetailPage />}
                      />
                      <Route
                        path="support"
                        element={<SuperAdminSupportPage />}
                      />
                      <Route
                        path="tenants/new"
                        element={<SuperAdminTenantFormPage />}
                      />
                      <Route path="admins" element={<SuperAdminAdminsPage />} />
                      <Route
                        path="admins/:id"
                        element={<SuperAdminAdminDetailPage />}
                      />
                      <Route
                        path="admins/new"
                        element={<SuperAdminAdminFormPage />}
                      />
                      <Route
                        path="analytics"
                        element={<SuperAdminAnalyticsPage />}
                      />
                      <Route
                        path="settings"
                        element={<SuperAdminSettingsPage />}
                      />
                      <Route
                        path="subscriptions"
                        element={<SuperAdminSubscriptions />}
                      />
                      <Route
                        path="subscriptions/:id"
                        element={<SuperAdminSubscriptionDetailPage />}
                      />
                      <Route
                        path="services"
                        element={<SuperAdminServicesPage />}
                      />
                      <Route
                        path="subscriptions/plans"
                        element={<SuperAdminSubscriptionPlans />}
                      />
                      <Route
                        path="subscriptions/validation"
                        element={<SuperAdminSubscriptionValidation />}
                      />
                      <Route path="users" element={<SuperAdminUsers />} />
                      <Route
                        path="users/:id"
                        element={<SuperAdminUserDetailPage />}
                      />
                      <Route path="logs" element={<SuperAdminLogsPage />} />
                      <Route
                        path="notifications"
                        element={<SuperAdminNotificationsPage />}
                      />
                      <Route
                        path="reports"
                        element={<SuperAdminReportsPage />}
                      />
                    </Route>

                    {/* ========== ADMIN AVEC SUBSCRIPTION GUARD ========== */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <SubscriptionGuard>
                            <DashboardLayout />
                          </SubscriptionGuard>
                        </ProtectedRoute>
                      }
                    >
                      <Route
                        path="/admin/subscription/success"
                        element={<SubscriptionRequestSuccess />}
                      />
                      <Route
                        index
                        element={<Navigate to="/admin/dashboard" replace />}
                      />
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="features" element={<AdminHomeFeatures />} />
                      <Route
                        path="tickets"
                        element={<AdminTicketQueuePage />}
                      />

                      {/* CLIENTS */}
                      <Route path="clients" element={<AdminClientsPage />} />
                     <Route
  path="clients/new"
  element={<NewClientPage />}  // ✅ Nouveau composant
/>

                      <Route
                        path="clients/:id"
                        element={<ClientDetailPage />}
                      />

                      {/* TEAM */}
                      <Route path="team" element={<TeamManagement />} />
                      <Route
                        path="team/new"
                        element={<PlaceholderPage title="Nouvel Employé" />}
                      />
                      <Route
                        path="team/:id"
                        element={<PlaceholderPage title="Détail Employé" />}
                      />

                      {/* APPOINTMENTS */}
                      <Route
                        path="appointments"
                        element={<AdminAppointmentsPage />}
                      />
                      <Route
                        path="appointments/new"
                        element={
                          <PlaceholderPage title="Nouveau Rendez-vous" />
                        }
                      />
                      <Route
                        path="appointments/:id"
                        element={<PlaceholderPage title="Détail Rendez-vous" />}
                      />

                      {/* SERVICES */}
                      <Route
                        path="services"
                        element={<AdminServiceManagement />}
                      />

                      {/* PRODUCTS */}
                      <Route path="products" element={<ProductsPage />} />
                      <Route
                        path="products/new"
                        element={<AdminProductFormPage />}
                      />
                      <Route
                        path="products/:id/edit"
                        element={<AdminProductFormPage />}
                      />

                      {/* SUPPORT */}
                      <Route path="support" element={<AdminSupportPage />} />

                      {/* AUTRES */}
                      <Route
                        path="categories"
                        element={
                          <PlaceholderPage title="Gestion des Catégories" />
                        }
                      />
                      <Route path="loyalty" element={<AdminLoyaltyPage />} />
                      <Route
                        path="promotions"
                        element={<AdminPromotionsPage />}
                      />
                      
                      <Route path="gift-cards" element={<GiftCards />} />
                      <Route
                        path="subscription"
                        element={<AdminSubscription />}
                      />
                      <Route
                        path="plannings"
                        element={<AdminPlanningsPage />} />
                      <Route
                        path="booking-settings"
                        element={<AdminBookingSettingsPage />}
                      />
                      <Route path="marketing" element={<MarketingPage />} />
                      <Route
                        path="sms-templates"
                        element={<SMSTemplatesPage />}
                      />
                     
                      <Route
                        path="reviews"
                        element={<PlaceholderPage title="Gestion des Avis" />}
                      />
                      <Route path="cashier" element={<CashierPage />} />
                     
                      <Route path="payments" element={<AdminPaymentsPage />} />
                      <Route
                        path="transactions"
                        element={
                          <PlaceholderPage title="Historique des Transactions" />
                        }
                      />
                    <Route path="branches" element={<AdminBranchesPage />} />
                      <Route
                        path="equipment"
                        element={<AdminEquipmentPage />}
                      />

                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="settings" element={<AdminSettingsPage />} />
                    </Route>

                    {/* ========== EMPLOYÉ ========== */}
                    <Route
                      path="/employee"
                      element={
                        <ProtectedRoute requiredRole="employee">
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route
                        index
                        element={<Navigate to="/employee/dashboard" replace />}
                      />
                      <Route path="dashboard" element={<EmployeeDashboard />} />
                      <Route
                        path="tickets"
                        element={<EmployeeTicketQueuePage />}
                      />
                      <Route
                        path="schedule"
                        element={<EmployeeSchedulePage />}
                      />
                      <Route
                        path="appointments"
                        element={<PlaceholderPage title="Mes Rendez-vous" />}
                      />
                      <Route
                        path="clients"
                        element={<PlaceholderPage title="Mes Clients" />}
                      />
                      <Route
                        path="availability"
                        element={<PlaceholderPage title="Mes Disponibilités" />}
                      />
                      <Route
                        path="reviews"
                        element={<PlaceholderPage title="Mes Évaluations" />}
                      />
                      <Route
                        path="commissions"
                        element={<PlaceholderPage title="Mes Commissions" />}
                      />
                      <Route
                        path="profile"
                        element={<PlaceholderPage title="Mon Profil" />}
                      />
                    </Route>

                    {/* ========== CLIENT ========== */}
                    <Route
                      path="/client"
                      element={
                        <ProtectedRoute requiredRole="client">
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route
                        index
                        element={<Navigate to="/client/dashboard" replace />}
                      />
                      <Route path="dashboard" element={<ClientDashboard />} />
                      <Route path="book" element={<ClientBookingsPage />} />
                      <Route
                        path="appointments"
                        element={<ClientBookingsPage />}
                      />

                      <Route
                        path="appointments/:id"
                        element={<PlaceholderPage title="Détail Rendez-vous" />}
                      />
                      <Route
                        path="history"
                        element={<PlaceholderPage title="Mon Historique" />}
                      />
                      <Route path="loyalty" element={<LoyaltyPage />} />
                      <Route path="promotions" element={<PromotionsPage />} />
                      <Route path="profile" element={<ClientProfilePage />} />
                      <Route
                        path="invoices"
                        element={<PlaceholderPage title="Mes Factures" />}
                      />
                      <Route
                        path="favorites"
                        element={<PlaceholderPage title="Mes Favoris" />}
                      />
                    </Route>

                    {/* ============================================================
                    ROUTES D'ERREUR
                    ============================================================ */}
                    <Route
                      path="/unauthorized"
                      element={
                        <div className="flex min-h-screen items-center justify-center px-6 bg-muted/30">
                          <Helmet>
                            <title>Accès refusé - BeautyFlow</title>
                            <meta name="robots" content="noindex, nofollow" />
                          </Helmet>
                          <div className="text-center bg-card p-12 rounded-3xl border shadow-sm max-w-md">
                            <div className="text-6xl mb-4">🔒</div>
                            <h1 className="text-3xl font-bold text-primary mb-2">
                              403
                            </h1>
                            <h2 className="text-xl font-semibold mb-2">
                              Accès refusé
                            </h2>
                            <p className="text-muted-foreground mb-6">
                              Vous n'avez pas l'autorisation d'accéder à cette
                              page.
                            </p>
                            <Button asChild className="w-full">
                              <Link to="/">Retour à l'accueil</Link>
                            </Button>
                          </div>
                        </div>
                      }
                    />

                    <Route
                      path="*"
                      element={
                        <div className="flex min-h-screen items-center justify-center px-6 bg-muted/30">
                          <Helmet>
                            <title>Page introuvable - BeautyFlow</title>
                            <meta name="robots" content="noindex, nofollow" />
                          </Helmet>
                          <div className="text-center bg-card p-12 rounded-3xl border shadow-sm max-w-md">
                            <div className="text-6xl mb-4">🔍</div>
                            <h1 className="text-3xl font-bold text-primary mb-2">
                              404
                            </h1>
                            <h2 className="text-xl font-semibold mb-2">
                              Page introuvable
                            </h2>
                            <p className="text-muted-foreground mb-6">
                              La page que vous recherchez n'existe pas.
                            </p>
                            <Button asChild className="w-full">
                              <Link to="/">Retour à l'accueil</Link>
                            </Button>
                          </div>
                        </div>
                      }
                    />
                  </Routes>
                </ActiveTenantProvider>
              </PlatformConfigProvider>
            </SubscriptionAuthProvider>
          </TenantProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;