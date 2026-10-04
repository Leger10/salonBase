import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/layouts/DashboardLayout.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CalendarClock,
  User,
  Star,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function AdminEmployeesPage() {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
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
            avatar
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("Erreur lors du chargement des employés");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchEmployees();
    }
  }, [currentUser]);

  const handleToggleStatus = async (employeeId, currentStatus, profileId) => {
    try {
      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", profileId);

      if (profileError) throw profileError;

      // Mettre à jour l'employé
      const { error: empError } = await supabase
        .from("employees")
        .update({ is_available: !currentStatus })
        .eq("id", employeeId);

      if (empError) throw empError;

      toast.success(
        `Employé ${!currentStatus ? "activé" : "désactivé"} avec succès`,
      );
      fetchEmployees();
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("Erreur lors du changement de statut");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = emp.profile?.full_name || "";
    const email = emp.profile?.email || "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-8 pb-8">
          <div className="flex justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employés</h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre équipe et leurs performances.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/admin/team/new">
              <Plus className="h-4 w-4" /> Nouvel Employé
            </Link>
          </Button>
        </div>

        <Card className="border-none shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Membres de l'équipe</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-9 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <User className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">Aucun employé trouvé.</p>
                <p className="text-sm mt-1">
                  Commencez par ajouter des membres à votre équipe.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>N°</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">
                                {emp.profile?.full_name?.charAt(0) || "E"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {emp.profile?.full_name || "Employé"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {emp.profile?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {emp.profile?.phone || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            #{emp.employee_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {emp.position || "Général"}
                        </TableCell>
                        <TableCell>
                          {emp.average_rating > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star
                                className={`h-3 w-3 fill-current ${getRatingColor(emp.average_rating)}`}
                              />
                              <span
                                className={`font-medium ${getRatingColor(emp.average_rating)}`}
                              >
                                {emp.average_rating.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {emp.commission_rate || 0}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              emp.profile?.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {emp.profile?.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin/team/${emp.id}/schedule`}>
                                <CalendarClock className="h-4 w-4 mr-1" />{" "}
                                Planning
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/admin/team/${emp.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleToggleStatus(
                                  emp.id,
                                  emp.profile?.is_active,
                                  emp.profile_id,
                                )
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              {emp.profile?.is_active ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques rapides */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total employés
                  </p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
                <User className="h-8 w-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Note moyenne</p>
                  <p className="text-2xl font-bold">
                    {(
                      employees.reduce(
                        (sum, e) => sum + (e.average_rating || 0),
                        0,
                      ) / (employees.length || 1)
                    ).toFixed(1)}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Commission moyenne
                  </p>
                  <p className="text-2xl font-bold">
                    {(
                      employees.reduce(
                        (sum, e) => sum + (e.commission_rate || 0),
                        0,
                      ) / (employees.length || 1)
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actifs</p>
                  <p className="text-2xl font-bold text-green-600">
                    {employees.filter((e) => e.profile?.is_active).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
