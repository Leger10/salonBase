// /src/pages/SuperAdminReportsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { 
  FileText, Download, Calendar, User, Building2, 
  CreditCard, DollarSign, TrendingUp, Users, 
  RefreshCw, Eye, BarChart3, PieChart, Activity,
  AlertCircle, CheckCircle, XCircle, Clock,
  FileSpreadsheet, File, Printer
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell
} from "recharts";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#ec4899', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'];

export default function SuperAdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    totalAppointments: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [tenantData, setTenantData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*');

      if (tenantsError) throw tenantsError;

      // 2. Récupérer les profils
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('role, created_at, email');

      if (profilesError) throw profilesError;

      // 3. Récupérer les transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount, transaction_date, status, tenant_id');

      if (transactionsError) throw transactionsError;

      // 4. Récupérer les rendez-vous
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('status, created_at, total_price');

      if (appointmentsError) throw appointmentsError;

      // Calculer les stats
      const activeTenants = tenants?.filter(t => t.subscription_status === 'active').length || 0;
      const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Revenus par mois
      const now = new Date();
      const revenueByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleString('fr-FR', { month: 'short' });
        const monthTransactions = completedTransactions.filter(t => {
          const date = new Date(t.transaction_date);
          return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
        });
        const monthRevenue = monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        revenueByMonth.push({ month: monthName, revenue: monthRevenue });
      }
      setRevenueData(revenueByMonth);

      // Distribution des salons
      const statusCount = {
        'Actifs': activeTenants,
        'Inactifs': tenants?.filter(t => t.subscription_status === 'inactive').length || 0,
        'Expirés': tenants?.filter(t => t.subscription_status === 'expired').length || 0,
        'En attente': tenants?.filter(t => t.subscription_status === 'pending').length || 0
      };
      setTenantData(Object.entries(statusCount).map(([name, value]) => ({ name, value })));

      // Données utilisateurs
      const roleCount = {
        'Super Admin': profiles?.filter(p => p.role === 'super_admin').length || 0,
        'Admin': profiles?.filter(p => p.role === 'admin').length || 0,
        'Employé': profiles?.filter(p => p.role === 'employee').length || 0,
        'Client': profiles?.filter(p => p.role === 'client').length || 0
      };
      setUsersData(Object.entries(roleCount).map(([name, value]) => ({ name, value })));

      setStats({
        totalTenants: tenants?.length || 0,
        activeTenants: activeTenants,
        totalRevenue: totalRevenue,
        monthlyRevenue: revenueByMonth[revenueByMonth.length - 1]?.revenue || 0,
        totalUsers: profiles?.length || 0,
        totalAppointments: appointments?.length || 0
      });

      // Créer des rapports générés
      const generatedReports = [
        {
          id: '1',
          title: 'Rapport mensuel des revenus',
          description: 'Évolution des revenus sur les 12 derniers mois',
          type: 'revenue',
          date: new Date().toISOString(),
          status: 'completed',
          data: revenueByMonth
        },
        {
          id: '2',
          title: 'Statistiques des salons',
          description: 'Distribution des salons par statut',
          type: 'tenants',
          date: new Date().toISOString(),
          status: 'completed',
          data: Object.entries(statusCount).map(([name, value]) => ({ name, value }))
        },
        {
          id: '3',
          title: 'Activité utilisateurs',
          description: 'Nombre d\'utilisateurs et leur répartition',
          type: 'users',
          date: new Date().toISOString(),
          status: 'completed',
          data: Object.entries(roleCount).map(([name, value]) => ({ name, value }))
        },
        {
          id: '4',
          title: 'Rapport général',
          description: 'Synthèse complète de la plateforme',
          type: 'general',
          date: new Date().toISOString(),
          status: 'completed',
          data: { 
            tenants: tenants?.length || 0,
            activeTenants: activeTenants,
            totalRevenue: totalRevenue,
            totalUsers: profiles?.length || 0,
            appointments: appointments?.length || 0
          }
        }
      ];
      setReports(generatedReports);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // EXPORT EN PDF
  // ============================================
  const exportPDF = async (report) => {
    setExportLoading(true);
    try {
      // ✅ CORRECTION: Importer correctement jsPDF
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Titre
      doc.setFontSize(20);
      doc.setTextColor('#ec4899');
      doc.text(report.title, 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor('#666');
      doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 32);
      
      // Description
      doc.setFontSize(10);
      doc.setTextColor('#888');
      doc.text(report.description, 14, 40);

      let yPos = 50;

      // Contenu selon le type
      if (report.type === 'revenue' && revenueData.length > 0) {
        const hasData = revenueData.some(item => item.revenue > 0);
        
        doc.setFontSize(14);
        doc.setTextColor('#333');
        doc.text('Évolution des revenus', 14, yPos);
        yPos += 10;

        const tableData = revenueData.map(item => [
          item.month,
          `${item.revenue.toLocaleString()} FCFA`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Mois', 'Revenus']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: '#ec4899', textColor: '#fff' },
          styles: { fontSize: 10 },
          didDrawPage: function(data) {
            if (!hasData) {
              doc.setFontSize(10);
              doc.setTextColor('#999');
              doc.text('⚠️ Aucune donnée de revenus disponible pour la période', 14, data.cursor.y + 10);
            }
          }
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      if (report.type === 'tenants' && tenantData.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor('#333');
        doc.text('Distribution des salons', 14, yPos);
        yPos += 10;

        const tableData = tenantData.map(item => [
          item.name,
          item.value
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Statut', 'Nombre']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: '#ec4899', textColor: '#fff' },
          styles: { fontSize: 10 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      if (report.type === 'users' && usersData.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor('#333');
        doc.text('Répartition des utilisateurs', 14, yPos);
        yPos += 10;

        const tableData = usersData.map(item => [
          item.name,
          item.value
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Rôle', 'Nombre']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: '#ec4899', textColor: '#fff' },
          styles: { fontSize: 10 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      if (report.type === 'general') {
        const data = report.data;
        const generalData = [
          ['Total Salons', data.tenants],
          ['Salons Actifs', data.activeTenants],
          ['Revenus Totaux', `${data.totalRevenue.toLocaleString()} FCFA`],
          ['Total Utilisateurs', data.totalUsers],
          ['Total Rendez-vous', data.appointments]
        ];

        doc.setFontSize(14);
        doc.setTextColor('#333');
        doc.text('Synthèse générale', 14, yPos);
        yPos += 10;

        autoTable(doc, {
          startY: yPos,
          head: [['Métrique', 'Valeur']],
          body: generalData,
          theme: 'striped',
          headStyles: { fillColor: '#ec4899', textColor: '#fff' },
          styles: { fontSize: 10 }
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor('#ccc');
        doc.text(`BeautyFlow - Rapport généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, doc.internal.pageSize.height - 10);
        doc.text(`Page ${i} sur ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, null, null, 'right');
      }

      doc.save(`rapport_${report.type}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exporté avec succès !');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================
  // EXPORT EN EXCEL
  // ============================================
  const exportExcel = async (report) => {
    setExportLoading(true);
    try {
      let data = [];
      let headers = [];

      switch (report.type) {
        case 'revenue':
          headers = ['Mois', 'Revenus (FCFA)'];
          data = revenueData.map(item => [item.month, item.revenue]);
          break;
        case 'tenants':
          headers = ['Statut', 'Nombre'];
          data = tenantData.map(item => [item.name, item.value]);
          break;
        case 'users':
          headers = ['Rôle', 'Nombre'];
          data = usersData.map(item => [item.name, item.value]);
          break;
        case 'general':
          headers = ['Métrique', 'Valeur'];
          data = [
            ['Total Salons', report.data.tenants],
            ['Salons Actifs', report.data.activeTenants],
            ['Revenus Totaux', `${report.data.totalRevenue.toLocaleString()} FCFA`],
            ['Total Utilisateurs', report.data.totalUsers],
            ['Total Rendez-vous', report.data.appointments]
          ];
          break;
        default:
          headers = ['Donnée', 'Valeur'];
          data = [];
      }

      const wsData = [headers, ...data];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      ws['!cols'] = headers.map(() => ({ wch: 25 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapport');
      
      XLSX.writeFile(wb, `rapport_${report.type}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exporté avec succès !');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================
  // EXPORT GENERAL (toutes les données)
  // ============================================
  const exportAllData = async () => {
    setExportLoading(true);
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Revenus
      const revenueSheet = XLSX.utils.aoa_to_sheet([
        ['Mois', 'Revenus (FCFA)'],
        ...revenueData.map(item => [item.month, item.revenue])
      ]);
      XLSX.utils.book_append_sheet(wb, revenueSheet, 'Revenus');

      // Sheet 2: Salons
      const tenantSheet = XLSX.utils.aoa_to_sheet([
        ['Statut', 'Nombre'],
        ...tenantData.map(item => [item.name, item.value])
      ]);
      XLSX.utils.book_append_sheet(wb, tenantSheet, 'Salons');

      // Sheet 3: Utilisateurs
      const userSheet = XLSX.utils.aoa_to_sheet([
        ['Rôle', 'Nombre'],
        ...usersData.map(item => [item.name, item.value])
      ]);
      XLSX.utils.book_append_sheet(wb, userSheet, 'Utilisateurs');

      // Sheet 4: Résumé
      const summarySheet = XLSX.utils.aoa_to_sheet([
        ['Métrique', 'Valeur'],
        ['Total Salons', stats.totalTenants],
        ['Salons Actifs', stats.activeTenants],
        ['Revenus Totaux', stats.totalRevenue.toLocaleString() + ' FCFA'],
        ['Revenus Mensuels', stats.monthlyRevenue.toLocaleString() + ' FCFA'],
        ['Total Utilisateurs', stats.totalUsers],
        ['Total Rendez-vous', stats.totalAppointments]
      ]);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Résumé');

      XLSX.writeFile(wb, `rapport_complet_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Export complet effectué avec succès !');
    } catch (error) {
      console.error('Error exporting all data:', error);
      toast.error('Erreur lors de l\'export complet');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Rapports
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyse et rapports de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button 
            onClick={exportAllData} 
            disabled={exportLoading}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {exportLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exporter tout
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Salons</p>
                <p className="text-2xl font-bold">{stats.totalTenants}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenus totaux</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalRevenue.toLocaleString()} FCFA
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rendez-vous</p>
                <p className="text-2xl font-bold">{stats.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm" ref={chartRef}>
          <CardHeader>
            <CardTitle className="text-base">Évolution des revenus</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
                <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Distribution des salons</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={tenantData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {tenantData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Liste des rapports avec boutons d'export */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rapports disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">Aucun rapport disponible</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {report.type === 'revenue' ? '📈 Revenus' :
                           report.type === 'tenants' ? '🏢 Salons' :
                           report.type === 'users' ? '👥 Utilisateurs' : '📊 Général'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Terminé
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportPDF(report)}
                      disabled={exportLoading}
                      className="gap-1"
                    >
                      <File className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportExcel(report)}
                      disabled={exportLoading}
                      className="gap-1"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions d'export */}
      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">📥 Export des rapports</p>
              <p>Cliquez sur <strong>PDF</strong> pour exporter en format PDF ou <strong>Excel</strong> pour exporter en format XLSX.</p>
              <p className="text-xs mt-1">Le bouton <strong>"Exporter tout"</strong> génère un fichier Excel complet avec toutes les données.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}