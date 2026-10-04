// /src/pages/EmployeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Calendar as CalendarComponent } from '@/components/ui/calendar.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { motion } from 'framer-motion';
import { 
  Calendar, Users, Clock, Star, CheckCircle, XCircle, AlertCircle, 
  TrendingUp, DollarSign, Phone, Mail, User, 
  Ticket, Bell, Loader2, RefreshCw, Search, Filter, 
  Receipt, CreditCard, Wallet, CalendarDays, BarChart3,
  Download, FileText, FileSpreadsheet, Eye, ChevronDown,
  ArrowUpRight, ArrowDownRight, Activity, Briefcase, PieChart,
  Package, Scissors, BadgeCheck, Building2, Trophy, Medal,
  Crown, MessageCircle, ThumbsUp, Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

// ========== COMPOSANT : ÉTOILES ==========
const renderStars = (rating, size = "h-4 w-4") => {
  const fullStars = Math.floor(rating || 0);
  const emptyStars = 5 - fullStars;
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className={`${size} fill-yellow-400 text-yellow-400`} />
      ))}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className={`${size} text-gray-300 dark:text-gray-600`} />
      ))}
    </div>
  );
};

// ========== COMPOSANT : CARTE AVIS CLIENT ==========
const ReviewCard = ({ review, index }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b last:border-0 py-3 hover:bg-muted/10 transition-colors px-2 rounded-lg"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">
            {review.client_name?.charAt(0) || "C"}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {review.client_name || "Client anonyme"}
              </span>
              {review.client_phone && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {review.client_phone}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(review.created_at), "dd MMM yyyy", { locale: fr })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 my-1">
            {renderStars(review.rating, "h-3 w-3")}
            <span className="text-xs font-medium text-yellow-600">
              {review.rating.toFixed(1)}
            </span>
          </div>
          
          {review.comment && (
            <div>
              <p className={`text-sm text-muted-foreground ${!expanded && 'line-clamp-2'}`}>
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
            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full inline-block mt-1">
              {review.service_name}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ========== COMPOSANT : CLASSEMENT MENSUEL ==========
const MonthlyRanking = ({ employeeId, tenantId, selectedMonth }) => {
  const [ranking, setRanking] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (tenantId && employeeId) {
      fetchMonthlyRanking();
    }
  }, [tenantId, employeeId, selectedMonth, selectedDate]);

  const fetchMonthlyRanking = async () => {
    setLoading(true);
    try {
      // Déterminer la période
      let startDate, endDate;
      
      if (selectedMonth) {
        startDate = startOfMonth(selectedMonth);
        endDate = endOfMonth(selectedMonth);
      } else {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      }

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Récupérer tous les employés du tenant
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          position,
          profile:profile_id (
            full_name,
            avatar
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      // Récupérer les avis pour chaque employé sur la période
      const employeesWithReviews = await Promise.all(
        (employees || []).map(async (emp) => {
          const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('id, rating, comment, created_at')
            .eq('employee_id', emp.id)
            .eq('tenant_id', tenantId)
            .eq('is_approved', true)
            .gte('created_at', startStr)
            .lte('created_at', endStr);

          if (reviewsError) {
            console.error('Error fetching reviews for employee:', emp.id, reviewsError);
            return {
              ...emp,
              name: emp.profile?.full_name || 'N/A',
              total_reviews: 0,
              average_rating: 0,
              reviews: []
            };
          }

          const total = reviews?.length || 0;
          const sum = reviews?.reduce((acc, r) => acc + r.rating, 0) || 0;
          const avg = total > 0 ? sum / total : 0;

          return {
            ...emp,
            name: emp.profile?.full_name || 'N/A',
            avatar: emp.profile?.avatar,
            total_reviews: total,
            average_rating: avg,
            reviews: reviews || []
          };
        })
      );

      // Trier par note moyenne
      const sorted = employeesWithReviews.sort((a, b) => b.average_rating - a.average_rating);
      
      // Trouver le rang de l'employé actuel
      const currentIndex = sorted.findIndex(emp => emp.id === employeeId);
      const currentRank = currentIndex !== -1 ? currentIndex + 1 : null;
      const currentEmployee = currentIndex !== -1 ? sorted[currentIndex] : null;

      // Statistiques globales
      const totalEmployees = sorted.length;
      const avgRating = sorted.reduce((sum, e) => sum + e.average_rating, 0) / (totalEmployees || 1);
      const totalReviews = sorted.reduce((sum, e) => sum + e.total_reviews, 0);

      setRanking({
        currentRank,
        currentEmployee,
        totalEmployees,
        avgRating,
        totalReviews,
        topEmployees: sorted.slice(0, 5)
      });
      
      setAllEmployees(sorted);

    } catch (error) {
      console.error('Error fetching monthly ranking:', error);
      toast.error('Erreur lors du chargement du classement');
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (index) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto opacity-30 mb-3" />
        <p>Aucune donnée de classement disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Position de l'employé */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Votre position</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-primary">
                  #{ranking.currentRank || '-'}
                </span>
                <span className="text-sm text-muted-foreground">
                  sur {ranking.totalEmployees} employés
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Note moyenne</p>
              <div className="flex items-center gap-2">
                {renderStars(ranking.currentEmployee?.average_rating || 0, "h-5 w-5")}
                <span className="text-xl font-bold text-yellow-600">
                  {(ranking.currentEmployee?.average_rating || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Top 5 du mois
          </CardTitle>
          <CardDescription>
            Basé sur les avis clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ranking.topEmployees.map((emp, index) => (
              <div 
                key={emp.id} 
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  emp.id === employeeId 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className="w-8 text-center font-bold text-sm text-muted-foreground">
                  #{index + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {emp.name?.charAt(0) || 'E'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{emp.name}</span>
                    {getMedal(index)}
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(emp.average_rating || 0, "h-3 w-3")}
                    <span className="text-xs text-muted-foreground">
                      ({emp.total_reviews} avis)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-yellow-600">
                    {(emp.average_rating || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">/5</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{ranking.totalEmployees}</p>
            <p className="text-[10px] text-muted-foreground">Employés</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 text-center">
            <Star className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{ranking.avgRating.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Note moyenne</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 text-center">
            <MessageCircle className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{ranking.totalReviews}</p>
            <p className="text-[10px] text-muted-foreground">Avis total</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ========== PAGE PRINCIPALE ==========
export default function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [employeeData, setEmployeeData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // États pour les rendez-vous
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // États pour les tickets
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [myTicket, setMyTicket] = useState(null);
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [ticketFilterStatus, setTicketFilterStatus] = useState('all');
  
  // États pour les statistiques avec filtres
  const [statsPeriod, setStatsPeriod] = useState('today');
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // États pour la caisse
  const [cashierData, setCashierData] = useState({
    todayRevenue: 0,
    todayTransactions: 0,
    pendingPayments: 0,
    cashBalance: 0,
    cardBalance: 0,
    mobileBalance: 0,
    totalBalance: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    client_name: '',
    service_name: '',
    notes: ''
  });

  // États pour les statistiques détaillées
  const [detailedStats, setDetailedStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalTickets: 0,
    completedTickets: 0,
    totalRevenue: 0,
    totalCommission: 0,
    averageRating: 0,
    monthlyRevenue: [],
    yearlyRevenue: [],
    clientsServed: [],
    servicesDone: []
  });

  // États pour les avis des clients
  const [employeeReviews, setEmployeeReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  // États pour l'export
  const [exporting, setExporting] = useState(false);

  // États pour le classement
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.profile?.id) {
      fetchAllData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (employeeData?.id) {
      fetchStatistics();
      fetchEmployeeReviews();
    }
  }, [employeeData, statsPeriod, dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      if (!tenantId || !profileId) {
        setLoading(false);
        return;
      }

      // Récupérer les infos de l'employé
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          profile:profile_id (
            id,
            full_name,
            email,
            phone,
            avatar
          )
        `)
        .eq('profile_id', profileId)
        .eq('tenant_id', tenantId)
        .single();

      if (employeeError && employeeError.code !== 'PGRST116') {
        console.error('Error fetching employee:', employeeError);
      } else {
        setEmployeeData(employee);
      }

      // Récupérer les rendez-vous
      await fetchAppointments(tenantId, employee?.id);
      
      // Récupérer les tickets
      await fetchTickets(tenantId, employee?.id);
      
      // Récupérer les données de caisse
      await fetchCashierData(tenantId, employee?.id);
      
      // Récupérer les statistiques
      await fetchStatistics();
      
      // Récupérer les avis
      await fetchEmployeeReviews();

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (tenantId, employeeId) => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          client:client_id (
            id,
            name,
            email,
            phone,
            profile:profile_id (
              full_name,
              phone,
              email,
              avatar
            )
          ),
          service:service_id (
            id,
            name,
            duration,
            price
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('employee_id', employeeId)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (statsPeriod === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('appointment_date', today);
      } else if (statsPeriod === 'week') {
        const weekAgo = subMonths(new Date(), 1);
        query = query.gte('appointment_date', weekAgo.toISOString().split('T')[0]);
      } else if (statsPeriod === 'month') {
        const monthStart = startOfMonth(new Date());
        query = query.gte('appointment_date', monthStart.toISOString().split('T')[0]);
      } else if (statsPeriod === 'year') {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        query = query.gte('appointment_date', yearStart.toISOString().split('T')[0]);
      } else if (statsPeriod === 'custom' && dateRange.start && dateRange.end) {
        const start = dateRange.start.toISOString().split('T')[0];
        const end = dateRange.end.toISOString().split('T')[0];
        query = query.gte('appointment_date', start).lte('appointment_date', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const formattedData = data.map(appt => ({
        ...appt,
        client_name: appt.client?.profile?.full_name || appt.client?.name || 'Client inconnu',
        client_phone: appt.client?.profile?.phone || appt.client?.phone || '',
        client_email: appt.client?.profile?.email || appt.client?.email || '',
        service_name: appt.service?.name || 'Service',
        service_price: appt.service?.price || appt.total_price || 0,
        service_duration: appt.service?.duration || 30
      }));
      
      setAppointments(formattedData || []);
      setFilteredAppointments(formattedData || []);

    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchTickets = async (tenantId, employeeId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .neq('status', 'archived')
        .order('ticket_number', { ascending: true });

      if (statsPeriod === 'today') {
        query = query.eq('date', today);
      } else if (statsPeriod === 'week') {
        const weekAgo = subMonths(new Date(), 1);
        query = query.gte('date', weekAgo.toISOString().split('T')[0]);
      } else if (statsPeriod === 'month') {
        const monthStart = startOfMonth(new Date());
        query = query.gte('date', monthStart.toISOString().split('T')[0]);
      } else if (statsPeriod === 'year') {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        query = query.gte('date', yearStart.toISOString().split('T')[0]);
      } else if (statsPeriod === 'custom' && dateRange.start && dateRange.end) {
        query = query
          .gte('date', dateRange.start.toISOString().split('T')[0])
          .lte('date', dateRange.end.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const visibleTickets = data?.filter(t => 
        t.assigned_employee_id === employeeId || 
        (t.assigned_employee_id === null && t.status === 'waiting')
      ) || [];

      setTickets(visibleTickets);
      setFilteredTickets(visibleTickets);
      
      const currentTicket = data?.find(t => 
        t.assigned_employee_id === employeeId && 
        ['called', 'in_progress'].includes(t.status)
      );
      setMyTicket(currentTicket || null);

    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const employeeId = employeeData?.id;

      if (!tenantId || !employeeId) return;

      const completedAppointments = appointments.filter(a => a.status === 'completed');
      const cancelledAppointments = appointments.filter(a => a.status === 'cancelled');
      
      const completedTickets = tickets.filter(t => t.status === 'served' || t.status === 'completed');
      
      const appointmentRevenue = completedAppointments.reduce((sum, a) => sum + (a.service_price || a.total_price || 0), 0);
      const ticketRevenue = completedTickets.reduce((sum, t) => sum + (t.service_price || 0), 0);
      const totalRevenue = appointmentRevenue + ticketRevenue;
      
      const commissionRate = employeeData?.commission_rate || 0;
      const totalCommission = totalRevenue * (commissionRate / 100);

      const ratings = appointments.filter(a => a.rating).map(a => a.rating);
      const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      const monthlyRevenue = {};
      completedAppointments.forEach(a => {
        if (a.appointment_date) {
          const month = format(new Date(a.appointment_date), 'MMM yyyy', { locale: fr });
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (a.service_price || a.total_price || 0);
        }
      });
      completedTickets.forEach(t => {
        if (t.date) {
          const month = format(new Date(t.date), 'MMM yyyy', { locale: fr });
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (t.service_price || 0);
        }
      });
      const monthlyData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }));

      const clientMap = {};
      completedAppointments.forEach(a => {
        const clientId = a.client_id;
        const clientName = a.client_name || 'Client';
        if (!clientMap[clientId]) {
          clientMap[clientId] = { id: clientId, name: clientName, count: 0, total: 0 };
        }
        clientMap[clientId].count += 1;
        clientMap[clientId].total += (a.service_price || a.total_price || 0);
      });
      completedTickets.forEach(t => {
        const clientName = t.client_name || 'Client';
        const key = clientName;
        if (!clientMap[key]) {
          clientMap[key] = { id: key, name: clientName, count: 0, total: 0 };
        }
        clientMap[key].count += 1;
        clientMap[key].total += (t.service_price || 0);
      });
      const clientsServed = Object.values(clientMap).sort((a, b) => b.count - a.count);

      const serviceMap = {};
      completedAppointments.forEach(a => {
        const serviceName = a.service_name || 'Service';
        if (!serviceMap[serviceName]) {
          serviceMap[serviceName] = { name: serviceName, count: 0, total: 0 };
        }
        serviceMap[serviceName].count += 1;
        serviceMap[serviceName].total += (a.service_price || a.total_price || 0);
      });
      completedTickets.forEach(t => {
        const serviceName = t.service_type || 'Service';
        if (!serviceMap[serviceName]) {
          serviceMap[serviceName] = { name: serviceName, count: 0, total: 0 };
        }
        serviceMap[serviceName].count += 1;
        serviceMap[serviceName].total += (t.service_price || 0);
      });
      const servicesDone = Object.values(serviceMap).sort((a, b) => b.count - a.count);

      setDetailedStats({
        totalAppointments: appointments.length,
        completedAppointments: completedAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        totalTickets: tickets.length,
        completedTickets: completedTickets.length,
        totalRevenue: totalRevenue,
        totalCommission: totalCommission,
        averageRating: averageRating,
        monthlyRevenue: monthlyData,
        yearlyRevenue: [],
        clientsServed: clientsServed.slice(0, 10),
        servicesDone: servicesDone.slice(0, 10)
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchEmployeeReviews = async () => {
    try {
      const employeeId = employeeData?.id;
      if (!employeeId) return;

      const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          client:client_id (
            id,
            name,
            profile:profile_id (
              full_name,
              avatar
            )
          )
        `)
        .eq('employee_id', employeeId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReviews = reviews?.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        client_name: r.client?.profile?.full_name || r.client?.name || 'Client anonyme',
        client_phone: r.client?.profile?.phone || null,
        client_avatar: r.client?.profile?.avatar || null
      })) || [];

      setEmployeeReviews(formattedReviews);

      if (formattedReviews.length > 0) {
        const total = formattedReviews.length;
        const sum = formattedReviews.reduce((acc, r) => acc + r.rating, 0);
        const avg = sum / total;
        
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        formattedReviews.forEach(r => {
          if (distribution[r.rating] !== undefined) {
            distribution[r.rating]++;
          }
        });

        setReviewStats({
          average: avg,
          total: total,
          distribution: distribution
        });
      } else {
        setReviewStats({
          average: 0,
          total: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchCashierData = async (tenantId, employeeId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('employee_id', employeeId)
        .eq('transaction_date', today);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transactions:', error);
      }

      const transactionsData = data || [];
      setTransactions(transactionsData);

      const totals = transactionsData.reduce((acc, t) => {
        if (t.status === 'completed') {
          acc[t.payment_method] = (acc[t.payment_method] || 0) + t.amount;
          acc.total += t.amount;
        }
        return acc;
      }, { cash: 0, card: 0, mobile: 0, total: 0 });

      setCashierData({
        todayRevenue: totals.total || 0,
        todayTransactions: transactionsData.filter(t => t.status === 'completed').length,
        pendingPayments: transactionsData.filter(t => t.status === 'pending').length,
        cashBalance: totals.cash || 0,
        cardBalance: totals.card || 0,
        mobileBalance: totals.mobile || 0,
        totalBalance: totals.total || 0
      });

    } catch (error) {
      console.error('Error fetching cashier data:', error);
    }
  };

  // Handlers pour les rendez-vous
  const handleAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success(`Rendez-vous ${newStatus === 'completed' ? 'terminé' : 'mis à jour'} avec succès`);
      fetchAllData();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Handlers pour les tickets
  const handleCallTicket = async (ticketId) => {
    if (!employeeData) {
      toast.error('Vous n\'êtes pas reconnu comme employé');
      return;
    }

    if (myTicket) {
      toast.error('Vous avez déjà un client en cours');
      return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'called',
          assigned_employee_id: employeeData.id,
          called_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Client appelé ! 🎯');
      fetchAllData();
    } catch (error) {
      console.error('Error calling ticket:', error);
      toast.error('Erreur lors de l\'appel');
    }
  };

  const handleStartService = async (ticketId) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Service commencé ! 💪');
      fetchAllData();
    } catch (error) {
      console.error('Error starting service:', error);
      toast.error('Erreur');
    }
  };

  const handleCompleteService = async (ticketId) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'served',
          completed_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Service terminé ! 🎉');
      fetchAllData();
    } catch (error) {
      console.error('Error completing service:', error);
      toast.error('Erreur');
    }
  };

  // Handler pour les paiements
  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          tenant_id: tenantId,
          employee_id: employeeData?.id,
          client_name: paymentForm.client_name || 'Client',
          service_name: paymentForm.service_name || 'Service',
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.method,
          status: 'completed',
          transaction_date: new Date().toISOString().split('T')[0],
          notes: paymentForm.notes || null
        })
        .select()
        .single();

      if (error) throw error;
      toast.success(`Paiement de ${parseFloat(paymentForm.amount).toLocaleString()} FCFA enregistré`);
      setIsCashierModalOpen(false);
      setPaymentForm({
        amount: '',
        method: 'cash',
        client_name: '',
        service_name: '',
        notes: ''
      });
      fetchAllData();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    }
  };

  // Export Excel
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const dataToExport = [
        ...appointments.map(a => ({
          'Type': 'Rendez-vous',
          'Client': a.client_name || 'Client',
          'Service': a.service_name || 'Service',
          'Montant': a.service_price || 0,
          'Statut': a.status,
          'Date': a.appointment_date,
          'Heure': a.start_time,
          'Téléphone': a.client_phone || ''
        })),
        ...tickets.map(t => ({
          'Type': 'Ticket',
          'Client': t.client_name || 'Client',
          'Service': t.service_type || 'Service',
          'Montant': t.service_price || 0,
          'Statut': t.status,
          'Date': t.date,
          'Heure': t.created_at ? format(new Date(t.created_at), 'HH:mm') : '',
          'Téléphone': t.client_phone || ''
        }))
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, 'Activité');
      
      const colWidths = [
        { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
      ];
      ws['!cols'] = colWidths;

      const fileName = `employe_${employeeData?.employee_number}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Export Excel réussi');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Filtres
  useEffect(() => {
    let filtered = [...appointments];
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, filterStatus]);

  useEffect(() => {
    let filtered = [...tickets];
    if (ticketSearchTerm) {
      filtered = filtered.filter(t => 
        t.client_name?.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
        t.ticket_number.toString().includes(ticketSearchTerm)
      );
    }
    if (ticketFilterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === ticketFilterStatus);
    }
    setFilteredTickets(filtered);
  }, [tickets, ticketSearchTerm, ticketFilterStatus]);

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      confirmed: { label: 'Confirmé', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      in_progress: { label: 'En cours', className: 'bg-purple-100 text-purple-800', icon: Clock },
      completed: { label: 'Terminé ✅', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Annulé', className: 'bg-red-100 text-red-800', icon: XCircle },
      no_show: { label: 'Non présenté', className: 'bg-gray-100 text-gray-800', icon: XCircle },
      waiting: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      called: { label: 'Appelé 📢', className: 'bg-blue-100 text-blue-800 animate-pulse', icon: Bell },
      served: { label: 'Servi ✅', className: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge className={`flex items-center gap-1 ${c.className}`}>
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <Card className="border-none shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className={`text-xl font-bold ${color || 'text-foreground'} mt-1`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${color ? color.replace('text', 'bg').replace('font-bold', '') : 'bg-primary/10'} flex-shrink-0 ml-2`}>
            <Icon className={`h-5 w-5 ${color || 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ========== COMPOSANT : CARTE RENDEZ-VOUS ==========
  const AppointmentCard = ({ appointment }) => (
    <div className="p-4 rounded-xl border hover:border-primary/30 transition-all bg-card">
      <div className="flex items-start gap-3">
        <div className="text-center min-w-[55px] flex-shrink-0">
          <div className="text-lg font-bold text-primary">{appointment.start_time}</div>
          <div className="text-[10px] text-muted-foreground">
            {appointment.service_duration || 0} min
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">
              {appointment.client_name || 'Client'}
            </p>
            {appointment.client_phone && (
              <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Phone className="h-3 w-3" /> {appointment.client_phone}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px]">
              {appointment.service_name || 'Service'}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold text-primary">
              {appointment.service_price?.toLocaleString() || 0} FCFA
            </Badge>
          </div>
          <div className="mt-1.5">
            {getStatusBadge(appointment.status)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
        {appointment.status === 'confirmed' && (
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleAppointmentStatus(appointment.id, 'in_progress')}>
            <Clock className="h-3 w-3 mr-1" /> Démarrer
          </Button>
        )}
        {appointment.status === 'in_progress' && (
          <Button size="sm" className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700" onClick={() => handleAppointmentStatus(appointment.id, 'completed')}>
            <CheckCircle className="h-3 w-3 mr-1" /> Terminer ✅
          </Button>
        )}
        {appointment.status === 'pending' && (
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleAppointmentStatus(appointment.id, 'confirmed')}>
            <CheckCircle className="h-3 w-3 mr-1" /> Confirmer
          </Button>
        )}
        {appointment.status === 'completed' && (
          <Badge className="flex-1 justify-center bg-green-100 text-green-800 text-xs py-1.5">
            ✅ Terminé - {appointment.service_price?.toLocaleString() || 0} FCFA
          </Badge>
        )}
      </div>
    </div>
  );

  // ========== COMPOSANT : CARTE TICKET ==========
  const TicketCard = ({ ticket }) => {
    const isWaiting = ticket.status === 'waiting';
    const isCalled = ticket.status === 'called';
    const isInProgress = ticket.status === 'in_progress';
    const isServed = ticket.status === 'served' || ticket.status === 'completed';
    
    return (
      <div className={`p-4 rounded-xl border transition-all bg-card ${
        isWaiting ? 'hover:border-primary/30' : ''
      } ${isCalled ? 'border-blue-300 bg-blue-50/30' : ''} ${
        isInProgress ? 'border-purple-300 bg-purple-50/30' : ''
      } ${isServed ? 'border-green-300 bg-green-50/30' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
            isWaiting ? 'bg-primary/10' : 
            isCalled ? 'bg-blue-500/10' :
            isInProgress ? 'bg-purple-500/10' :
            'bg-green-500/10'
          }`}>
            <Ticket className={`h-5 w-5 ${
              isWaiting ? 'text-primary' : 
              isCalled ? 'text-blue-500' :
              isInProgress ? 'text-purple-500' :
              'text-green-500'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base">#{ticket.ticket_number}</p>
              {getStatusBadge(ticket.status)}
            </div>
            <p className="font-medium text-sm truncate">{ticket.client_name || 'Client'}</p>
            {ticket.client_phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {ticket.client_phone}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {ticket.service_type && (
                <span className="truncate">Service : {ticket.service_type}</span>
              )}
              {ticket.service_price > 0 && (
                <span className="font-bold text-primary flex-shrink-0">
                  {ticket.service_price.toLocaleString()} FCFA
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions selon le statut */}
        <div className="mt-3">
          {ticket.status === 'waiting' && !myTicket && (
            <Button 
              className="w-full text-sm h-9" 
              onClick={() => handleCallTicket(ticket.id)}
              disabled={!!myTicket}
            >
              <Bell className="h-4 w-4 mr-1" /> Appeler le client
            </Button>
          )}
          {ticket.status === 'waiting' && myTicket && (
            <Badge className="w-full justify-center bg-gray-100 text-gray-500 text-center py-2">
              ⏳ En attente...
            </Badge>
          )}
          {ticket.status === 'called' && (
            <Button 
              className="w-full text-sm h-9 bg-purple-600 hover:bg-purple-700 text-white" 
              onClick={() => handleStartService(ticket.id)}
            >
              <User className="h-4 w-4 mr-1" /> Démarrer le service
            </Button>
          )}
          {ticket.status === 'in_progress' && (
            <Button 
              className="w-full text-sm h-9 bg-green-600 hover:bg-green-700 text-white" 
              onClick={() => handleCompleteService(ticket.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Terminer le service ✅
            </Button>
          )}
          {ticket.status === 'served' && (
            <Badge className="w-full justify-center bg-green-100 text-green-800 text-center py-2">
              ✅ Service terminé - {ticket.service_price?.toLocaleString() || 0} FCFA
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // ========== SECTION DES AVIS CLIENTS AVEC CLASSEMENT ==========
  const ReviewsSection = () => {
    return (
      <div className="space-y-4">
        {/* En-tête avec classement mensuel */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Mon classement mensuel
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 text-xs"
                onClick={() => setShowRankingModal(true)}
              >
                <Eye className="h-3 w-3" />
                Voir le classement
              </Button>
            </div>
            <CardDescription>
              Basé sur les avis clients du mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{reviewStats.average.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/5</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {reviewStats.total} avis
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {renderStars(reviewStats.average, "h-5 w-5")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution des notes */}
        {reviewStats.total > 0 && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewStats.distribution[star] || 0;
                  const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-8 text-right">{star}⭐</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs w-6 text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des avis */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Avis des clients ({employeeReviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeeReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto opacity-20 mb-3" />
                <p className="text-sm">Aucun avis reçu pour le moment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Continuez à offrir un excellent service !
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {employeeReviews.map((review, idx) => (
                  <ReviewCard key={review.id} review={review} index={idx} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ========== MODAL CLASSEMENT MENSUEL ==========
  const RankingModal = () => {
    return (
      <Dialog open={showRankingModal} onOpenChange={setShowRankingModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Classement du mois
            </DialogTitle>
            <DialogDescription>
              {format(selectedMonth, "MMMM yyyy", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <MonthlyRanking 
              employeeId={employeeData?.id}
              tenantId={currentUser?.profile?.tenant_id}
              selectedMonth={selectedMonth}
            />
          </div>
          
          <DialogFooter>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                className="gap-1"
              >
                ← Mois précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMonth(new Date())}
                className="gap-1"
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMonth(subMonths(selectedMonth, -1))}
                className="gap-1"
              >
                Mois suivant →
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowRankingModal(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          👋 Bonjour, {employeeData?.profile?.full_name || currentUser?.profile?.full_name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            #{employeeData?.employee_number} • {employeeData?.position || 'Styliste'}
          </Badge>
          <Badge className={employeeData?.is_available ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>
            {employeeData?.is_available ? '🟢 Disponible' : '🔴 Indisponible'}
          </Badge>
          {employeeData?.is_cashier && (
            <Badge className="bg-amber-100 text-amber-800 text-xs">🏦 Caissier</Badge>
          )}
          {reviewStats.total > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
              {reviewStats.average.toFixed(1)} ({reviewStats.total} avis)
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchAllData()} variant="outline" size="sm" className="gap-1 text-xs flex-1">
            <RefreshCw className="h-3 w-3" /> Actualiser
          </Button>
          {employeeData?.is_cashier && (
            <Button onClick={() => setIsCashierModalOpen(true)} size="sm" className="gap-1 text-xs flex-1">
              <DollarSign className="h-3 w-3" /> Paiement
            </Button>
          )}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          title="RDV aujourd'hui" 
          value={appointments.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]).length} 
          icon={Calendar} 
          color="text-primary" 
          subtitle={`${appointments.length} au total`}
        />
        <StatCard 
          title="En attente" 
          value={tickets.filter(t => t.status === 'waiting').length} 
          icon={Users} 
          color="text-yellow-600" 
        />
        <StatCard 
          title="CA total" 
          value={`${Math.round(detailedStats.totalRevenue).toLocaleString()} FCFA`} 
          icon={DollarSign} 
          color="text-green-600" 
        />
        <StatCard 
          title="Commission" 
          value={`${Math.round(detailedStats.totalCommission).toLocaleString()} FCFA`} 
          icon={TrendingUp} 
          color="text-blue-600" 
        />
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full gap-1 bg-muted p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs py-2 data-[state=active]:bg-background rounded-lg">
            <Activity className="h-3.5 w-3.5 mr-1" /> Vue
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs py-2 data-[state=active]:bg-background rounded-lg">
            <Star className="h-3.5 w-3.5 mr-1" /> Avis
          </TabsTrigger>
          <TabsTrigger value="appointments" className="text-xs py-2 data-[state=active]:bg-background rounded-lg">
            <Calendar className="h-3.5 w-3.5 mr-1" /> RDV
          </TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs py-2 data-[state=active]:bg-background rounded-lg">
            <Ticket className="h-3.5 w-3.5 mr-1" /> Tickets
          </TabsTrigger>
          <TabsTrigger value="cashier" className="text-xs py-2 data-[state=active]:bg-background rounded-lg">
            <Receipt className="h-3.5 w-3.5 mr-1" /> Caisse
          </TabsTrigger>
        </TabsList>

        {/* Onglet Vue d'ensemble */}
        <TabsContent value="overview" className="mt-4">
          <div className="space-y-6">
            {/* Filtres de période */}
            <ScrollArea className="w-full pb-2">
              <div className="flex gap-2 min-w-max">
                <Button variant={statsPeriod === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setStatsPeriod('today')}>
                  Aujourd'hui
                </Button>
                <Button variant={statsPeriod === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setStatsPeriod('week')}>
                  Semaine
                </Button>
                <Button variant={statsPeriod === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setStatsPeriod('month')}>
                  Mois
                </Button>
                <Button variant={statsPeriod === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setStatsPeriod('year')}>
                  Année
                </Button>
                <Button variant={statsPeriod === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setStatsPeriod('custom')}>
                  Perso
                </Button>
                <Button variant={statsPeriod === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatsPeriod('all')}>
                  📋 Tous
                </Button>
              </div>
            </ScrollArea>

            {statsPeriod === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 flex-1">
                      <CalendarDays className="h-4 w-4" />
                      {dateRange.start && dateRange.end ? (
                        `${format(dateRange.start, 'dd/MM')} - ${format(dateRange.end, 'dd/MM')}`
                      ) : (
                        'Sélectionner'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: dateRange.start, to: dateRange.end }}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({ start: range.from, end: range.to || range.from });
                          fetchAllData();
                        }
                      }}
                      initialFocus
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" className="gap-2" onClick={exportToExcel} disabled={exporting}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                title="Revenus" 
                value={`${Math.round(detailedStats.totalRevenue).toLocaleString()} FCFA`} 
                icon={DollarSign} 
                color="text-green-600" 
              />
              <StatCard 
                title="Commission" 
                value={`${Math.round(detailedStats.totalCommission).toLocaleString()} FCFA`} 
                icon={TrendingUp} 
                color="text-blue-600" 
              />
              <StatCard 
                title="Services terminés" 
                value={detailedStats.completedAppointments + detailedStats.completedTickets} 
                icon={CheckCircle} 
                color="text-green-600"
                subtitle={`${detailedStats.completedAppointments} RDV + ${detailedStats.completedTickets} tickets`}
              />
              <StatCard 
                title="Note moyenne" 
                value={`${detailedStats.averageRating.toFixed(1)}/5`} 
                icon={Star} 
                color="text-yellow-600" 
              />
            </div>

            {/* Revenus par mois */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Revenus par mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedStats.monthlyRevenue.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Aucune donnée disponible
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailedStats.monthlyRevenue.slice(-6).map((item, index) => {
                      const maxRevenue = Math.max(...detailedStats.monthlyRevenue.map(m => m.revenue));
                      const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-xs w-16 flex-shrink-0">{item.month}</span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium flex-shrink-0">
                            {Math.round(item.revenue).toLocaleString()} FCFA
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clients servis */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Clients les plus fidèles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedStats.clientsServed.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Aucun client servi
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailedStats.clientsServed.slice(0, 5).map((client, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary w-6">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]">{client.name}</p>
                            <span className="text-xs text-muted-foreground">{client.count} visites</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {client.total.toLocaleString()} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services les plus demandés */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-primary" />
                  Services les plus demandés
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedStats.servicesDone.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Aucun service effectué
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailedStats.servicesDone.slice(0, 5).map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary w-6">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]">{service.name}</p>
                            <span className="text-xs text-muted-foreground">{service.count} fois</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {service.total.toLocaleString()} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section des avis avec classement */}
            <ReviewsSection />

            {/* Résumé de la période */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Résumé de la période
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border-b">
                    <span className="text-sm text-muted-foreground">Rendez-vous</span>
                    <span className="font-medium">{detailedStats.totalAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 border-b">
                    <span className="text-sm text-muted-foreground">RDV terminés</span>
                    <span className="font-medium text-green-600">{detailedStats.completedAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 border-b">
                    <span className="text-sm text-muted-foreground">RDV annulés</span>
                    <span className="font-medium text-red-600">{detailedStats.cancelledAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 border-b">
                    <span className="text-sm text-muted-foreground">Tickets</span>
                    <span className="font-medium">{detailedStats.totalTickets}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 border-b">
                    <span className="text-sm text-muted-foreground">Tickets terminés</span>
                    <span className="font-medium text-green-600">{detailedStats.completedTickets}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-primary/5 rounded-lg">
                    <span className="text-sm font-medium">Total clients servis</span>
                    <span className="font-bold text-primary">
                      {detailedStats.completedAppointments + detailedStats.completedTickets}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Avis */}
        <TabsContent value="reviews" className="mt-4">
          <ReviewsSection />
        </TabsContent>

        {/* Onglet Rendez-vous */}
        <TabsContent value="appointments" className="mt-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Rendez-vous {appointments.length > 0 && `(${appointments.length})`}
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border bg-background px-3 py-1.5 text-sm h-9"
                  >
                    <option value="all">Tous</option>
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmés</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminés ✅</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="rounded-full bg-muted w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Aucun rendez-vous</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAppointments.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Tickets */}
        <TabsContent value="tickets" className="mt-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" />
                  File d'attente {tickets.length > 0 && `(${tickets.length})`}
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={ticketSearchTerm}
                      onChange={(e) => setTicketSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <select
                    value={ticketFilterStatus}
                    onChange={(e) => setTicketFilterStatus(e.target.value)}
                    className="rounded-lg border bg-background px-3 py-1.5 text-sm h-9"
                  >
                    <option value="all">Tous</option>
                    <option value="waiting">En attente</option>
                    <option value="called">Appelés 📢</option>
                    <option value="in_progress">En cours</option>
                    <option value="served">Servis ✅</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {myTicket && (
                <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">🔄 En cours</p>
                      <p className="font-bold text-lg">Ticket #{myTicket.ticket_number}</p>
                      <p className="font-medium text-sm truncate">{myTicket.client_name || 'Client'}</p>
                      {myTicket.service_type && (
                        <p className="text-xs text-muted-foreground">Service : {myTicket.service_type}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(myTicket.status)}
                      {myTicket.status === 'called' && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => handleStartService(myTicket.id)}>
                          <User className="h-3 w-3 mr-1" /> Démarrer
                        </Button>
                      )}
                      {myTicket.status === 'in_progress' && (
                        <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleCompleteService(myTicket.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Terminer ✅
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {filteredTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun ticket</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => {
                    if (ticket.assigned_employee_id && ticket.assigned_employee_id !== employeeData?.id) {
                      return null;
                    }
                    return <TicketCard key={ticket.id} ticket={ticket} />;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Caisse */}
        <TabsContent value="cashier" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              title="CA total" 
              value={`${cashierData.todayRevenue.toLocaleString()} FCFA`} 
              icon={DollarSign} 
              color="text-primary" 
            />
            <StatCard 
              title="Transactions" 
              value={cashierData.todayTransactions} 
              icon={Receipt} 
              color="text-blue-600" 
            />
            <StatCard 
              title="En attente" 
              value={cashierData.pendingPayments} 
              icon={Clock} 
              color="text-yellow-600" 
            />
            <StatCard 
              title="Solde total" 
              value={`${cashierData.totalBalance.toLocaleString()} FCFA`} 
              icon={Wallet} 
              color="text-green-600" 
            />
          </div>

          <Card className="border-none shadow-md mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Transactions du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-6">
                  <Receipt className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune transaction</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{t.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.service_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-primary text-sm">{t.amount.toLocaleString()} FCFA</p>
                        <Badge className={
                          t.payment_method === 'cash' ? 'bg-green-100 text-green-800 text-[10px]' :
                          t.payment_method === 'card' ? 'bg-blue-100 text-blue-800 text-[10px]' :
                          'bg-purple-100 text-purple-800 text-[10px]'
                        }>
                          {t.payment_method === 'cash' ? '💵' :
                           t.payment_method === 'card' ? '💳' : '📱'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de paiement */}
      <Dialog open={isCashierModalOpen} onOpenChange={setIsCashierModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Nouveau paiement
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enregistrez un paiement pour un client
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_name" className="text-sm">Nom du client</Label>
              <Input
                id="client_name"
                value={paymentForm.client_name}
                onChange={(e) => setPaymentForm({ ...paymentForm, client_name: e.target.value })}
                placeholder="Nom du client"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_name" className="text-sm">Service</Label>
              <Input
                id="service_name"
                value={paymentForm.service_name}
                onChange={(e) => setPaymentForm({ ...paymentForm, service_name: e.target.value })}
                placeholder="Nom du service"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">Montant (FCFA)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="100"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0"
                className="h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method" className="text-sm">Méthode de paiement</Label>
              <select
                id="method"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm h-10"
              >
                <option value="cash">💵 Espèces</option>
                <option value="card">💳 Carte bancaire</option>
                <option value="mobile">📱 Mobile Money</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Input
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Notes supplémentaires"
                className="h-10"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCashierModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Classement Mensuel */}
      <RankingModal />
    </div>
  );
}