// /src/pages/admin/TeamManagement.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  ShieldAlert,
  User,
  Mail,
  Phone,
  Calendar,
  Star,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  UserPlus,
  UserCog,
  Clock,
  Award,
  Crown,
  Building2,
  BadgeCheck,
  Trophy,
  Medal,
  MessageCircle,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ========== COMPOSANT : ÉTOILES ==========
const renderStars = (rating, size = "h-4 w-4") => {
  const fullStars = Math.floor(rating || 0);
  const emptyStars = 5 - fullStars;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Star
          key={`full-${i}`}
          className={`${size} fill-yellow-400 text-yellow-400`}
        />
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={`${size} text-gray-300 dark:text-gray-600`}
        />
      ))}
    </div>
  );
};

// ========== COMPOSANT : AVIS CLIENT ==========

const ClientReviewCard = ({ review, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-gray-700 last:border-0 py-3 hover:bg-gray-800/50 transition-colors px-2 rounded-lg"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">
            {review.client_name?.charAt(0) || "C"}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-white">
                {review.client_name || "Client anonyme"}
              </span>
              {review.client_phone && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {review.client_phone}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {format(new Date(review.created_at), "dd MMM yyyy", {
                locale: fr,
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 my-1">
            {renderStars(review.rating, "h-3 w-3")}
            <span className="text-xs font-medium text-yellow-400">
              {review.rating.toFixed(1)}
            </span>
          </div>

          {review.comment && (
            <div>
              <p
                className={`text-sm text-gray-300 ${!expanded && "line-clamp-2"}`}
              >
                {review.comment}
              </p>
              {review.comment.length > 100 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  {expanded ? "Voir moins" : "Voir plus"}
                </button>
              )}
            </div>
          )}

          {review.service_name && (
            <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded-full inline-block mt-1">
              {review.service_name}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ========== COMPOSANT : CLASSEMENT DES EMPLOYÉS ==========

const EmployeeRanking = ({ employees, tenantId, onRefresh }) => {
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeReviews, setEmployeeReviews] = useState({});
  const [loadingReviews, setLoadingReviews] = useState({});
  const [sortBy, setSortBy] = useState("rating");
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");

  // Charger les avis d'un employé
  const loadEmployeeReviews = async (employeeId) => {
    if (loadingReviews[employeeId]) return;

    setLoadingReviews((prev) => ({ ...prev, [employeeId]: true }));
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          client:client_id (
            id,
            name,
            phone,
            profile:profile_id (
              full_name,
              phone
            )
          ),
          service:service_id (
            name
          )
        `,
        )
        .eq("employee_id", employeeId)
        .eq("tenant_id", tenantId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedReviews = data.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        client_name:
          r.client?.profile?.full_name || r.client?.name || "Client anonyme",
        client_phone: r.client?.profile?.phone || r.client?.phone || null,
        service_name: r.service?.name || null,
      }));

      setEmployeeReviews((prev) => ({
        ...prev,
        [employeeId]: formattedReviews,
      }));
    } catch (error) {
      console.error("Error loading employee reviews:", error);
      toast.error("Erreur lors du chargement des avis");
    } finally {
      setLoadingReviews((prev) => ({ ...prev, [employeeId]: false }));
    }
  };

  const toggleExpand = (employeeId) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null);
    } else {
      setExpandedEmployee(employeeId);
      loadEmployeeReviews(employeeId);
    }
  };

  const handleViewAllReviews = (employee, reviews) => {
    setSelectedEmployeeName(employee.name);
    setSelectedReviews(reviews);
    setIsReviewModalOpen(true);
  };

  // Classement des employés
  const rankedEmployees = [...employees]
    .filter((emp) => emp.status === "active")
    .sort((a, b) => {
      if (sortBy === "rating") {
        return (b.average_rating || 0) - (a.average_rating || 0);
      } else if (sortBy === "reviews") {
        return (b.total_clients_served || 0) - (a.total_clients_served || 0);
      }
      return 0;
    });

  // Statistiques
  const stats = {
    total: rankedEmployees.length,
    avgRating:
      rankedEmployees.reduce((sum, e) => sum + (e.average_rating || 0), 0) /
      (rankedEmployees.length || 1),
    totalClients: rankedEmployees.reduce(
      (sum, e) => sum + (e.total_clients_served || 0),
      0,
    ),
  };

  return (
    <div className="space-y-4">
      {/* Statistiques - Fond sombre */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-900/30 to-blue-800/20 text-white">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-blue-300">Employés actifs</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 text-white">
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">
              {stats.avgRating.toFixed(1)}/5
            </p>
            <p className="text-xs text-yellow-300">Note moyenne</p>
          </CardContent>
        </Card>
        {/* <Card className="border-none shadow-sm bg-gradient-to-br from-green-900/30 to-green-800/20 text-white">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{stats.totalClients}</p>
            <p className="text-xs text-green-300">Clients servis</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Filtres de tri */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-400">Trier par :</span>
        <Button
          variant={sortBy === "rating" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("rating")}
          className={`h-8 text-xs ${sortBy === "rating" ? "bg-primary text-white" : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}
        >
          <Star className="h-3 w-3 mr-1" />
          Note
        </Button>
        <Button
          variant={sortBy === "reviews" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("reviews")}
          className={`h-8 text-xs ${sortBy === "reviews" ? "bg-primary text-white" : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}
        >
          <Users className="h-3 w-3 mr-1" />
          Clients
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 text-xs text-gray-400 hover:text-white hover:bg-gray-800 ml-auto"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Actualiser
        </Button>
      </div>

      {/* Liste des employés classés */}
      {rankedEmployees.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
          <Users className="h-12 w-12 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">Aucun employé actif</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rankedEmployees.map((employee, index) => {
            const reviews = employeeReviews[employee.id] || [];
            const isExpanded = expandedEmployee === employee.id;
            const isLoading = loadingReviews[employee.id];
            const isTop3 = index < 3;

            const getMedal = () => {
              if (index === 0)
                return <Crown className="h-5 w-5 text-yellow-400" />;
              if (index === 1)
                return <Medal className="h-5 w-5 text-gray-300" />;
              if (index === 2)
                return <Medal className="h-5 w-5 text-amber-400" />;
              return null;
            };

            const getRankBg = () => {
              if (index === 0) return "border-yellow-500/30 bg-yellow-950/30";
              if (index === 1) return "border-gray-500/30 bg-gray-800/50";
              if (index === 2) return "border-amber-500/30 bg-amber-950/30";
              return "border-gray-700 bg-gray-800/30";
            };

            return (
              <Card
                key={employee.id}
                className={`border ${getRankBg()} hover:shadow-lg hover:shadow-primary/5 transition-all text-white`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Rang */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isTop3
                          ? "bg-primary text-white"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      #{index + 1}
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/30">
                      <span className="text-lg font-bold text-primary">
                        {employee.name?.charAt(0) || "E"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">
                          {employee.name}
                        </span>
                        {isTop3 && getMedal()}
                        {employee.is_cashier && (
                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px]">
                            🏦 Caisse
                          </Badge>
                        )}
                        {employee.position && (
                          <Badge
                            variant="outline"
                            className="border-gray-600 text-gray-300 text-[10px]"
                          >
                            {employee.position}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          {renderStars(employee.average_rating || 0)}
                          <span className="text-sm font-medium text-yellow-400">
                            {(employee.average_rating || 0).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {employee.total_clients_served || 0} clients servis
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(employee.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Avis développés */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-gray-300">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          Avis clients ({reviews.length})
                        </h4>
                        {reviews.length > 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="text-xs h-6 text-primary hover:text-primary/80"
                            onClick={() =>
                              handleViewAllReviews(employee, reviews)
                            }
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Voir tous
                          </Button>
                        )}
                      </div>

                      {isLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : reviews.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                          {reviews.slice(0, 5).map((review, idx) => (
                            <ClientReviewCard
                              key={review.id}
                              review={review}
                              index={idx}
                            />
                          ))}
                          {reviews.length > 5 && (
                            <p className="text-xs text-center text-gray-500 pt-2">
                              + {reviews.length - 5} autres avis
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Aucun avis pour le moment
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal des avis détaillés - Fond sombre */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <MessageCircle className="h-5 w-5 text-primary" />
              Avis pour {selectedEmployeeName}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedReviews.length} avis clients
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {selectedReviews.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Aucun avis pour le moment
              </p>
            ) : (
              selectedReviews.map((review, idx) => (
                <ClientReviewCard key={review.id} review={review} index={idx} />
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
// ========== COMPOSANT DE SUCCÈS POUR L'AJOUT D'EMPLOYÉ ==========
const EmployeeCreationSuccess = ({
  email,
  name,
  firstName,
  lastName,
  phone,
  adminName,
  adminEmail,
  adminId,
  employeeId,
  tenantId,
  onClose,
}) => {
  const navigate = useNavigate();
  const fullName =
    `${firstName || ""} ${lastName || ""}`.trim() || name || "Employé";

  useEffect(() => {
    const logEmployeeCreation = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let ipAddress = null;
        try {
          const response = await fetch("https://api.ipify.org?format=json");
          const data = await response.json();
          ipAddress = data.ip;
        } catch (e) {}

        const { error } = await supabase.from("activity_logs").insert({
          user_id: adminId || user?.id,
          user_email: adminEmail || user?.email,
          action: `Création d'employé: ${fullName}`,
          action_type: "create",
          details: JSON.stringify({
            employee_id: employeeId,
            employee_name: fullName,
            employee_email: email,
            employee_phone: phone,
            admin_id: adminId || user?.id,
            admin_email: adminEmail || user?.email,
            admin_name: adminName,
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
          }),
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error("❌ Erreur lors de l'enregistrement du log:", error);
        }
      } catch (error) {
        console.error("❌ Erreur lors de l'enregistrement du log:", error);
      }
    };

    logEmployeeCreation();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="max-w-md w-full mx-4 shadow-2xl border-0"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            ✅ Employé ajouté avec succès !
          </h2>

          <div className="bg-muted/30 rounded-lg p-4 mb-4 text-left space-y-2">
            <p className="text-sm text-muted-foreground mb-1 font-medium">
              👤 Informations de l'employé
            </p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium">{fullName}</span>
            </div>
            {email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📧</span>
                <span>{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{phone}</span>
              </div>
            )}
          </div>

          <div className="bg-primary/5 rounded-lg p-4 mb-6 text-left space-y-2 border border-primary/10">
            <p className="text-sm text-muted-foreground mb-1 font-medium">
              👔 Créé par
            </p>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {adminName || "Administrateur"}
              </span>
            </div>
            {adminEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📧</span>
                <span>{adminEmail}</span>
              </div>
            )}
          </div>

          <Button className="w-full gap-2" onClick={onClose}>
            <Users className="h-4 w-4" />
            Continuer
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            💡 Action enregistrée dans les logs système
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ========== PAGE PRINCIPALE ==========
export default function TeamManagement() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [filteredTeam, setFilteredTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "employee",
    position: "",
    commission_rate: "",
    is_cashier: false,
    is_active: true,
  });

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setTeam([]);
        setFilteredTeam([]);
        setLoading(false);
        return;
      }

      const { data: employees, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          profile:profile_id (
            id,
            full_name,
            email,
            phone,
            is_active,
            avatar,
            role
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedTeam = employees.map((emp) => ({
        id: emp.id,
        profile_id: emp.profile?.id,
        name: emp.profile?.full_name || "N/A",
        email: emp.profile?.email,
        phone: emp.profile?.phone,
        role: emp.profile?.role || emp.role || "employee",
        status: emp.profile?.is_active ? "active" : "inactive",
        hire_date: emp.created_at,
        commission_rate: emp.commission_rate || 0,
        employee_number: emp.employee_number,
        position: emp.position || "Employé",
        is_cashier: emp.is_cashier || false,
        average_rating: emp.average_rating || 0,
        total_clients_served: emp.total_clients_served || 0,
        is_available: emp.is_available !== false,
      }));

      setTeam(formattedTeam);
      applyFilters(formattedTeam, searchTerm, activeTab);
    } catch (err) {
      console.error("Error fetching team:", err);
      toast.error("Erreur lors du chargement de l'équipe");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, search, tab) => {
    let filtered = [...data];

    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(search.toLowerCase()) ||
          m.email?.toLowerCase().includes(search.toLowerCase()) ||
          m.position?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (tab === "active") {
      filtered = filtered.filter((m) => m.status === "active");
    } else if (tab === "inactive") {
      filtered = filtered.filter((m) => m.status === "inactive");
    } else if (tab === "cashier") {
      filtered = filtered.filter((m) => m.is_cashier === true);
    }

    setFilteredTeam(filtered);
  };

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchTeam();
    }
  }, [currentUser]);

  useEffect(() => {
    applyFilters(team, searchTerm, activeTab);
  }, [searchTerm, activeTab, team]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      role: "employee",
      position: "",
      commission_rate: "",
      is_cashier: false,
      is_active: true,
    });
    setEditingMember(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setFormData({
      full_name: member.name,
      email: member.email,
      phone: member.phone || "",
      password: "",
      role: member.role || "employee",
      position: member.position || "",
      commission_rate: member.commission_rate?.toString() || "",
      is_cashier: member.is_cashier || false,
      is_active: member.status === "active",
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (member) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const logEmployeeCreation = async (employeeData) => {
    try {
      let ipAddress = null;
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        ipAddress = data.ip;
      } catch (e) {}

      const { error } = await supabase.from("activity_logs").insert({
        user_id: currentUser?.id,
        user_email: currentUser?.email,
        action: `Création d'employé: ${employeeData.full_name}`,
        action_type: "create",
        details: JSON.stringify({
          employee_id: employeeData.employee_id,
          employee_name: employeeData.full_name,
          employee_email: employeeData.email,
          employee_phone: employeeData.phone,
          admin_id: currentUser?.id,
          admin_email: currentUser?.email,
          admin_name: currentUser?.profile?.full_name,
          tenant_id: currentUser?.profile?.tenant_id,
          created_at: new Date().toISOString(),
        }),
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("❌ Erreur lors de l'enregistrement du log:", error);
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'enregistrement du log:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      if (editingMember) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMember.profile_id);

        if (profileError) throw profileError;

        const { error: employeeError } = await supabase
          .from("employees")
          .update({
            position: formData.position || null,
            commission_rate: parseFloat(formData.commission_rate) || 0,
            is_cashier: formData.is_cashier,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMember.id);

        if (employeeError) throw employeeError;

        toast.success("Membre mis à jour avec succès");
        setIsModalOpen(false);
        resetForm();
        await fetchTeam();
      } else {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", formData.email)
          .maybeSingle();

        if (existingUser) {
          toast.error("Cet email est déjà utilisé par un autre utilisateur");
          setIsSubmitting(false);
          return;
        }

        const adminEmail = currentUser?.email;
        const adminName = currentUser?.profile?.full_name;
        const adminId = currentUser?.id;

        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.full_name,
                phone: formData.phone || null,
              },
            },
          },
        );

        if (authError) {
          if (authError.message.includes("rate limit")) {
            toast.error("Trop de tentatives. Veuillez patienter.");
          } else {
            toast.error("Erreur lors de la création: " + authError.message);
          }
          setIsSubmitting(false);
          return;
        }

        if (!authData?.user) {
          toast.error("Erreur lors de la création de l'utilisateur");
          setIsSubmitting(false);
          return;
        }

        const authUserId = authData.user.id;

        const { error: profileError } = await supabase.from("profiles").insert({
          id: authUserId,
          tenant_id: tenantId,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role || "employee",
          is_active: true,
          created_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error("Erreur création profil:", profileError);
          throw profileError;
        }

        const { error: employeeError } = await supabase
          .from("employees")
          .insert({
            tenant_id: tenantId,
            profile_id: authUserId,
            position: formData.position || null,
            commission_rate: parseFloat(formData.commission_rate) || 0,
            is_cashier: formData.is_cashier,
            is_available: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (employeeError) {
          console.error("Erreur création employé:", employeeError);
          throw employeeError;
        }

        await logEmployeeCreation({
          employee_id: authUserId,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
        });

        setNewEmployee({
          name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          adminName: adminName,
          adminEmail: adminEmail,
          adminId: adminId,
          employeeId: authUserId,
          tenantId: tenantId,
        });
        setShowSuccessModal(true);

        toast.success(`Membre ajouté avec succès !`);

        setIsModalOpen(false);
        resetForm();

        setTimeout(async () => {
          await fetchTeam();
        }, 1500);
      }
    } catch (err) {
      console.error("Error saving team member:", err);

      if (err.message?.includes("duplicate key")) {
        toast.error("Cet email est déjà utilisé par un autre utilisateur");
      } else if (err.message?.includes("rate limit")) {
        toast.error("Trop de tentatives. Veuillez patienter.");
      } else {
        toast.error(err.message || "Erreur lors de l'enregistrement");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    setIsSubmitting(true);

    try {
      const { error: employeeError } = await supabase
        .from("employees")
        .delete()
        .eq("id", memberToDelete.id);

      if (employeeError) throw employeeError;

      toast.success("Membre supprimé avec succès");
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
      fetchTeam();
    } catch (err) {
      console.error("Error deleting team member:", err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (member) => {
    try {
      const newStatus = member.status === "active" ? false : true;
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.profile_id);

      if (error) throw error;

      toast.success(`Membre ${newStatus ? "activé" : "désactivé"} avec succès`);
      fetchTeam();
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("Erreur lors du changement de statut");
    }
  };

  // ✅ Fonction handleToggleAvailability ajoutée
  const handleToggleAvailability = async (member) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          is_available: !member.is_available,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (error) throw error;

      toast.success(
        `Employé ${!member.is_available ? "disponible" : "indisponible"}`,
      );
      fetchTeam();
    } catch (err) {
      console.error("Error toggling availability:", err);
      toast.error("Erreur lors du changement de disponibilité");
    }
  };

  const stats = {
    total: team.length,
    active: team.filter((m) => m.status === "active").length,
    inactive: team.filter((m) => m.status === "inactive").length,
    cashiers: team.filter((m) => m.is_cashier).length,
  };

  const getRoleBadge = (role) => {
    const variants = {
      admin: { className: "bg-purple-100 text-purple-800", label: "Admin" },
      manager: { className: "bg-blue-100 text-blue-800", label: "Manager" },
      employee: { className: "bg-gray-100 text-gray-800", label: "Employé" },
    };
    const variant = variants[role] || variants.employee;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    if (status === "active") {
      return (
        <Badge className="bg-green-100 text-green-800 gap-1">
          <CheckCircle className="h-3 w-3" /> Actif
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 gap-1">
        <XCircle className="h-3 w-3" /> Inactif
      </Badge>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Gestion de l'Équipe
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span>Gérez vos collaborateurs et leurs accès</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.active} actifs
              </Badge>
              <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                <XCircle className="h-3 w-3 mr-1" />
                {stats.inactive} inactifs
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                <Crown className="h-3 w-3 mr-1" />
                {stats.cashiers} caissiers
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={openAddModal} className="gap-2">
          <UserPlus className="h-4 w-4" /> Ajouter un membre
        </Button>
      </div>

      {/* Info rôles */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-4 text-sm">
        <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        {/* <div className="text-primary/90 font-medium space-y-1">
          <p>
            <strong className="text-primary">Admin:</strong> Accès total à
            toutes les fonctionnalités et paramètres.
          </p>
          <p>
            <strong className="text-primary">Employé:</strong> Accès à son
            propre agenda et à l'encaissement de ses prestations.
          </p>
          <p className="text-xs text-muted-foreground">
            💡 Les employés marqués comme <strong>caissiers</strong> peuvent
            gérer les encaissements.
          </p>
        </div> */}
      </div>

      {/* Tabs avec nouvel onglet Classement */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un membre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchTeam}
                title="Actualiser"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="all" className="gap-2">
                Tous ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Actifs ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="gap-2">
                <XCircle className="h-3 w-3 text-gray-400" />
                Inactifs ({stats.inactive})
              </TabsTrigger>
              <TabsTrigger value="cashier" className="gap-2">
                <Crown className="h-3 w-3 text-yellow-500" />
                Caissiers ({stats.cashiers})
              </TabsTrigger>
              <TabsTrigger value="ranking" className="gap-2">
                <Trophy className="h-3 w-3 text-amber-500" />
                Classement
              </TabsTrigger>
            </TabsList>

            {/* Contenu des onglets existants */}
            <TabsContent value="all" className="mt-4">
              <TeamTable
                filteredTeam={filteredTeam}
                loading={loading}
                searchTerm={searchTerm}
                openAddModal={openAddModal}
                openEditModal={openEditModal}
                handleToggleStatus={handleToggleStatus}
                handleToggleAvailability={handleToggleAvailability}
                openDeleteDialog={openDeleteDialog}
                getRoleBadge={getRoleBadge}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="active" className="mt-4">
              <TeamTable
                filteredTeam={filteredTeam}
                loading={loading}
                searchTerm={searchTerm}
                openAddModal={openAddModal}
                openEditModal={openEditModal}
                handleToggleStatus={handleToggleStatus}
                handleToggleAvailability={handleToggleAvailability}
                openDeleteDialog={openDeleteDialog}
                getRoleBadge={getRoleBadge}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="inactive" className="mt-4">
              <TeamTable
                filteredTeam={filteredTeam}
                loading={loading}
                searchTerm={searchTerm}
                openAddModal={openAddModal}
                openEditModal={openEditModal}
                handleToggleStatus={handleToggleStatus}
                handleToggleAvailability={handleToggleAvailability}
                openDeleteDialog={openDeleteDialog}
                getRoleBadge={getRoleBadge}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            <TabsContent value="cashier" className="mt-4">
              <TeamTable
                filteredTeam={filteredTeam}
                loading={loading}
                searchTerm={searchTerm}
                openAddModal={openAddModal}
                openEditModal={openEditModal}
                handleToggleStatus={handleToggleStatus}
                handleToggleAvailability={handleToggleAvailability}
                openDeleteDialog={openDeleteDialog}
                getRoleBadge={getRoleBadge}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>

            {/* ✅ Nouvel onglet Classement */}
            <TabsContent value="ranking" className="mt-4">
              <EmployeeRanking
                employees={team}
                tenantId={currentUser?.profile?.tenant_id}
                onRefresh={fetchTeam}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal d'ajout/modification */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingMember ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  Modifier le membre
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-primary" />
                  Ajouter un membre
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? "Modifiez les informations du membre"
                : "Créez un nouveau compte employé pour votre salon"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom complet */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Jean Dupont"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="jean@exemple.com"
                  required
                  disabled={!!editingMember}
                />
                {editingMember && (
                  <p className="text-xs text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+226 54 32 92 99"
                />
              </div>

              {/* Poste */}
              <div className="space-y-2">
                <Label htmlFor="position">Poste</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Coiffeur, Styliste, Manager..."
                />
              </div>

              {/* Rôle */}
              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleSelectChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mot de passe (uniquement pour les nouveaux) */}
              {!editingMember && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 caractères
                  </p>
                </div>
              )}

              {/* Taux de commission */}
              <div className="space-y-2">
                <Label htmlFor="commission_rate">Taux de commission (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.commission_rate}
                  onChange={handleInputChange}
                  placeholder="10"
                />
              </div>

              {/* Statut */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    handleSelectChange("is_active", value === "active")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Caissier */}
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Switch
                id="is_cashier"
                checked={formData.is_cashier}
                onCheckedChange={(checked) =>
                  handleSelectChange("is_cashier", checked)
                }
              />
              <Label htmlFor="is_cashier" className="cursor-pointer">
                Assigné à la caisse
              </Label>
              <span className="text-xs text-muted-foreground ml-2">
                (Peut gérer les encaissements)
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : editingMember ? (
                  "Mettre à jour"
                ) : (
                  "Ajouter"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le membre{" "}
              <strong className="text-foreground">
                {memberToDelete?.name}
              </strong>{" "}
              ?
              <br />
              <span className="text-destructive text-sm">
                Cette action est irréversible et supprimera définitivement le
                compte.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ Modal de succès pour l'ajout d'employé avec logs */}
      <AnimatePresence>
        {showSuccessModal && newEmployee && (
          <EmployeeCreationSuccess
            name={newEmployee.name}
            email={newEmployee.email}
            phone={newEmployee.phone}
            adminName={newEmployee.adminName}
            adminEmail={newEmployee.adminEmail}
            adminId={newEmployee.adminId}
            employeeId={newEmployee.employeeId}
            tenantId={newEmployee.tenantId}
            onClose={() => {
              setShowSuccessModal(false);
              setNewEmployee(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ========== COMPOSANT TABLEAU DES EMPLOYÉS ==========
const TeamTable = ({
  filteredTeam,
  loading,
  searchTerm,
  openAddModal,
  openEditModal,
  handleToggleStatus,
  handleToggleAvailability,
  openDeleteDialog,
  getRoleBadge,
  getStatusBadge,
}) => {
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (filteredTeam.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium text-muted-foreground">
          {searchTerm ? "Aucun membre trouvé" : "Aucun membre dans l'équipe"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {searchTerm
            ? "Essayez de modifier votre recherche"
            : "Commencez par ajouter votre premier employé"}
        </p>
        {!searchTerm && (
          <Button variant="link" onClick={openAddModal} className="mt-2">
            Ajouter un membre
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="pl-6">Employé</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Poste</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Dispo</TableHead>
            <TableHead className="text-right pr-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTeam.map((member) => (
            <TableRow key={member.id} className="hover:bg-muted/30">
              <TableCell className="font-medium pl-6">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{member.employee_number}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {member.email}
                  </span>
                  {member.phone && (
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Phone className="h-3 w-3" />
                      {member.phone}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{member.position || "Employé"}</span>
                {member.is_cashier && (
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-[10px]">
                    🏦 Caisse
                  </Badge>
                )}
              </TableCell>
              <TableCell>{getRoleBadge(member.role)}</TableCell>
              <TableCell>{getStatusBadge(member.status)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {member.average_rating || 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /5 ({member.total_clients_served || 0} clients)
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Switch
                  checked={member.is_available}
                  onCheckedChange={() => handleToggleAvailability(member)}
                  className="data-[state=checked]:bg-green-500"
                />
              </TableCell>
              <TableCell className="text-right pr-6">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(member)}
                    className="h-8 w-8 p-0"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={member.status === "active" ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(member)}
                    className={`h-8 px-2 text-xs ${
                      member.status === "active"
                        ? "border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {member.status === "active" ? (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activer
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(member)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
