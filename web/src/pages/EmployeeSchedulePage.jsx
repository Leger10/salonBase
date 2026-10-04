// /src/pages/EmployeeSchedulePage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Mail,
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw, 
  Loader2,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Users,
  DollarSign,
  Scissors,
  MapPin,
  Building2,
  Search
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addDays, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

export default function EmployeeSchedulePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const [weekDays, setWeekDays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (currentUser?.profile?.id) {
      fetchEmployeeData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (employee?.id) {
      fetchAppointments();
    }
  }, [employee, selectedDate]);

  useEffect(() => {
    // Calculer les jours de la semaine
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDays(days);
  }, [selectedDate]);

  // Filtrage des rendez-vous
  useEffect(() => {
    let filtered = [...appointments];
    
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.client_phone?.includes(searchTerm)
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    
    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, filterStatus]);

  const fetchEmployeeData = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      if (!tenantId || !profileId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
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

      if (error) throw error;
      setEmployee(data);
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const tenantId = currentUser?.profile?.tenant_id;
      
      // Pour la vue jour, récupérer les rendez-vous du jour
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
          ),
          tenant:tenant_id (
            id,
            name,
            address,
            phone
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('employee_id', employee.id);

      // Filtrer par date selon la vue
      if (viewMode === 'day') {
        query = query.eq('appointment_date', dateStr);
      } else {
        // Vue semaine
        const startDate = format(weekDays[0], 'yyyy-MM-dd');
        const endDate = format(weekDays[6], 'yyyy-MM-dd');
        query = query
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);
      }
      
      query = query.order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      
      // Formater les données
      const formattedData = data.map(appt => ({
        ...appt,
        client_name: appt.client?.profile?.full_name || appt.client?.name || 'Client inconnu',
        client_phone: appt.client?.profile?.phone || appt.client?.phone || '',
        client_email: appt.client?.profile?.email || appt.client?.email || '',
        service_name: appt.service?.name || 'Service',
        service_price: appt.service?.price || appt.total_price || 0,
        service_duration: appt.service?.duration || 30,
        tenant_name: appt.tenant?.name || 'Salon',
        tenant_address: appt.tenant?.address || ''
      }));
      
      setAppointments(formattedData || []);
      setFilteredAppointments(formattedData || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erreur lors du chargement des rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (days) => {
    setSelectedDate(prev => addDays(prev, days));
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      const statusLabels = {
        completed: 'terminé ✅',
        confirmed: 'confirmé',
        in_progress: 'démarré',
        cancelled: 'annulé'
      };
      
      toast.success(`Rendez-vous ${statusLabels[newStatus] || 'mis à jour'} avec succès`);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: '⏳ En attente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      confirmed: { label: '✅ Confirmé', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      in_progress: { label: '💆 En cours', className: 'bg-purple-100 text-purple-800 border-purple-200' },
      completed: { label: '🎉 Terminé', className: 'bg-green-100 text-green-800 border-green-200' },
      cancelled: { label: '❌ Annulé', className: 'bg-red-100 text-red-800 border-red-200' },
      no_show: { label: '🚫 Non présenté', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    return config[status] || config.pending;
  };

  const getDayAppointments = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(a => a.appointment_date === dateStr);
  };

  // ✅ Composant de carte rendez-vous
  const AppointmentCard = ({ appointment }) => {
    const statusConfig = getStatusBadge(appointment.status);
    const isCompleted = appointment.status === 'completed';
    const isInProgress = appointment.status === 'in_progress';
    const isConfirmed = appointment.status === 'confirmed';
    const isPending = appointment.status === 'pending';
    
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all bg-card hover:shadow-md ${
        isCompleted ? 'border-green-200 bg-green-50/30' :
        isInProgress ? 'border-purple-200 bg-purple-50/30' :
        isConfirmed ? 'border-blue-200 bg-blue-50/30' :
        'border-yellow-200 bg-yellow-50/30'
      }`}>
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Heure */}
          <div className="text-center min-w-[70px] flex-shrink-0">
            <div className="text-lg font-bold text-primary">{appointment.start_time}</div>
            <div className="text-xs text-muted-foreground">
              {appointment.service_duration} min
            </div>
            {appointment.end_time && (
              <div className="text-xs text-muted-foreground">
                → {appointment.end_time}
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-lg">
                {appointment.client_name}
              </p>
              {appointment.client_phone && (
                <a href={`tel:${appointment.client_phone}`} 
                   className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {appointment.client_phone}
                </a>
              )}
              {appointment.client_email && (
                <a href={`mailto:${appointment.client_email}`} 
                   className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {appointment.client_email}
                </a>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                <Scissors className="h-3 w-3 mr-1" />
                {appointment.service_name}
              </Badge>
              <Badge variant="outline" className="text-xs font-bold text-primary">
                <DollarSign className="h-3 w-3 mr-1" />
                {appointment.service_price?.toLocaleString() || 0} FCFA
              </Badge>
              {appointment.tenant_name && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {appointment.tenant_name}
                </Badge>
              )}
            </div>
            
            {appointment.notes && (
              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                "📝 {appointment.notes}"
              </p>
            )}
            
            <div className="mt-1.5">
              <Badge className={`${statusConfig.className} border`}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 sm:mt-0 flex-wrap flex-shrink-0">
          {isPending && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                className="gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                Confirmer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleStatusChange(appointment.id, 'cancelled')}
              >
                <XCircle className="h-3 w-3" />
                Annuler
              </Button>
            </>
          )}
          
          {isConfirmed && (
            <>
              <Button
                size="sm"
                onClick={() => handleStatusChange(appointment.id, 'in_progress')}
                className="gap-1"
              >
                <Clock className="h-3 w-3" />
                Démarrer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleStatusChange(appointment.id, 'cancelled')}
              >
                <XCircle className="h-3 w-3" />
                Annuler
              </Button>
            </>
          )}
          
          {isInProgress && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleStatusChange(appointment.id, 'completed')}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-3 w-3" />
              Terminer ✅
            </Button>
          )}
          
          {isCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              asChild
            >
              <Link to={`/employee/appointments/${appointment.id}`}>
                Détails <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  };

  // ✅ Vue Jour
  const DayView = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleDateChange(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Jour
          </Button>
          <h3 className="text-lg font-semibold capitalize">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => handleDateChange(1)} className="gap-1">
            Jour <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            Aujourd'hui
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchAppointments} className="gap-1">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="text-xs">
            {appointments.length} RDV
          </Badge>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher un client ou service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm pl-9"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">⏳ En attente</option>
          <option value="confirmed">✅ Confirmés</option>
          <option value="in_progress">💆 En cours</option>
          <option value="completed">🎉 Terminés</option>
          <option value="cancelled">❌ Annulés</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Aucun rendez-vous ce jour</p>
          <p className="text-sm text-muted-foreground mt-1">Profitez-en pour vous organiser !</p>
          {searchTerm && (
            <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
              Effacer la recherche
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );

  // ✅ Vue Semaine
  const WeekView = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleDateChange(-7)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Semaine
          </Button>
          <h3 className="text-lg font-semibold">
            {format(weekDays[0], 'dd MMM', { locale: fr })} - {format(weekDays[6], 'dd MMM yyyy', { locale: fr })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => handleDateChange(7)} className="gap-1">
            Semaine <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            Aujourd'hui
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchAppointments} className="gap-1">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="text-xs">
            {appointments.length} RDV
          </Badge>
        </div>
      </div>

      {/* Statistiques semaine */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        <Card className="border-none shadow-sm bg-muted/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{appointments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Confirmés</p>
            <p className="text-xl font-bold text-blue-600">
              {appointments.filter(a => a.status === 'confirmed').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-purple-50/50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">En cours</p>
            <p className="text-xl font-bold text-purple-600">
              {appointments.filter(a => a.status === 'in_progress').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-green-50/50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Terminés</p>
            <p className="text-xl font-bold text-green-600">
              {appointments.filter(a => a.status === 'completed').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-yellow-50/50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-xl font-bold text-yellow-600">
              {appointments.filter(a => a.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayAppointments = getDayAppointments(day);
            const isToday = isToday(day);
            
            return (
              <Card 
                key={day.toISOString()} 
                className={`border ${isToday ? 'border-primary ring-2 ring-primary/20 shadow-lg' : 'border-border'}`}
              >
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'EEE', { locale: fr })}
                  </CardTitle>
                  <CardDescription className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-y-auto p-3">
                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">— Aucun RDV —</p>
                  ) : (
                    dayAppointments.map((app) => {
                      const statusConfig = getStatusBadge(app.status);
                      return (
                        <div key={app.id} className="text-xs p-2 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer" 
                             onClick={() => {
                               setSelectedDate(parseISO(app.appointment_date));
                               setViewMode('day');
                             }}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">{app.start_time}</span>
                            <Badge className={`${statusConfig.className} text-[9px] px-1 py-0`}>
                              {statusConfig.label.split(' ')[0]}
                            </Badge>
                          </div>
                          <div className="font-medium truncate">{app.client_name}</div>
                          <div className="text-muted-foreground truncate">{app.service_name}</div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  if (loading && !employee) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Mon Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            {employee?.profile?.full_name} • Employé #{employee?.employee_number}
            {employee?.position && <span className="text-xs">• {employee.position}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={employee?.is_available ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
            {employee?.is_available ? '🟢 Disponible' : '🔴 Indisponible'}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchAppointments} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total RDV</p>
                <p className="text-xl font-bold">{appointments.length}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Confirmés</p>
                <p className="text-xl font-bold text-blue-600">
                  {appointments.filter(a => a.status === 'confirmed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En cours</p>
                <p className="text-xl font-bold text-purple-600">
                  {appointments.filter(a => a.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Terminés</p>
                <p className="text-xl font-bold text-green-600">
                  {appointments.filter(a => a.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vue planning */}
      <Card className="border-none shadow-md">
        <CardContent className="p-4 sm:p-6">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="day" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Jour
              </TabsTrigger>
              <TabsTrigger value="week" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Semaine
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="day" className="mt-4">
              <DayView />
            </TabsContent>
            
            <TabsContent value="week" className="mt-4">
              <WeekView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/employee/dashboard">
            <Users className="h-5 w-5" />
            <span className="text-xs">Tableau de bord</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/employee/tickets">
            <Clock className="h-5 w-5" />
            <span className="text-xs">File d'attente</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/employee/availability">
            <CheckCircle className="h-5 w-5" />
            <span className="text-xs">Disponibilités</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/employee/profile">
            <User className="h-5 w-5" />
            <span className="text-xs">Mon profil</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}