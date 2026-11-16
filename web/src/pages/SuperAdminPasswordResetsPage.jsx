// /src/pages/SuperAdminPasswordResetsPage.jsx
//
// File d'attente des demandes "mot de passe oublie". Le super administrateur
// remet le mot de passe du compte a "00000000" ; l'utilisateur devra le changer
// a sa prochaine connexion.
import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { toast } from "sonner";
import {
  KeyRound,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  ShieldCheck,
  Copy,
} from "lucide-react";

const FILTERS = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Traitées" },
  { value: "rejected", label: "Refusées" },
  { value: "all", label: "Toutes" },
];

const STATUS_META = {
  pending: { label: "En attente", className: "bg-amber-100 text-amber-800", icon: Clock },
  approved: { label: "Réinitialisée", className: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Refusée", className: "bg-red-100 text-red-800", icon: XCircle },
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuperAdminPasswordResetsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [lastReset, setLastReset] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const data = await apiFetch(`/api/super-admin/password-reset-requests${query}`);
      setRequests(data?.requests ?? []);
    } catch (error) {
      console.error("Error fetching password reset requests:", error);
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleProcess = async (request, action) => {
    if (action === "reset") {
      const confirmed = window.confirm(
        `Réinitialiser le mot de passe de ${request.email} ?\n\n` +
          `Le mot de passe deviendra 00000000 et l'utilisateur devra le changer à la prochaine connexion.`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(`Refuser la demande de ${request.email} ?`);
      if (!confirmed) return;
    }

    setProcessingId(request.id);
    try {
      const result = await apiFetch(
        `/api/super-admin/password-reset-requests/${encodeURIComponent(request.id)}`,
        { method: "POST", body: { action } }
      );

      if (action === "reset") {
        setLastReset({ email: request.email, password: result?.temporary_password ?? "00000000" });
        toast.success(`Mot de passe de ${request.email} réinitialisé`);
      } else {
        toast.success(`Demande de ${request.email} refusée`);
      }
      await fetchRequests();
    } catch (error) {
      console.error("Error processing password reset:", error);
      toast.error(error.message || "Erreur lors du traitement de la demande");
    } finally {
      setProcessingId(null);
    }
  };

  const copyPassword = async () => {
    const password = lastReset?.password ?? "00000000";
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Mot de passe temporaire copié");
    } catch {
      toast.error(`Mot de passe temporaire : ${password}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-8 w-8 text-primary" />
            Réinitialisations de mot de passe
          </h1>
          <p className="text-muted-foreground mt-1">
            Les demandes déposées depuis « Mot de passe oublié » arrivent ici. Vous
            réinitialisez le mot de passe à <strong>00000000</strong> ; le client
            devra le changer à la connexion.
          </p>
        </div>
        <Button variant="outline" onClick={fetchRequests} className="gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {lastReset && (
        <Card className="border-2 border-green-200 bg-green-50/60">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">
                    Mot de passe de {lastReset.email} réinitialisé
                  </p>
                  <p className="text-sm text-green-800">
                    Mot de passe temporaire :
                    <span className="ml-2 inline-flex items-center rounded bg-white px-2 py-0.5 font-mono font-bold text-green-900 border">
                      {lastReset.password}
                    </span>
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Communiquez-le au client. Il devra définir un nouveau mot de passe après connexion.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyPassword} className="gap-1">
                  <Copy className="h-4 w-4" />
                  Copier
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setLastReset(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucune demande de réinitialisation pour ce filtre.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const meta = STATUS_META[request.status] ?? STATUS_META.pending;
            const StatusIcon = meta.icon;
            const isPending = request.status === "pending";
            return (
              <Card key={request.id} className={isPending ? "border-amber-200" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      {request.email}
                    </CardTitle>
                    <Badge className={`${meta.className} gap-1`}>
                      <StatusIcon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Demandé le :</span>{" "}
                      {formatDate(request.requested_at)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Compte :</span>{" "}
                      {request.profile_id ? "Compte trouvé" : "Aucun compte associé"}
                    </div>
                    {request.processed_at && (
                      <div>
                        <span className="font-medium text-foreground">Traité le :</span>{" "}
                        {formatDate(request.processed_at)}
                      </div>
                    )}
                  </div>
                  {request.note && (
                    <p className="rounded-md bg-muted/50 p-3 text-sm">
                      <span className="font-medium">Message :</span> {request.note}
                    </p>
                  )}

                  {isPending && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        className="gap-2"
                        disabled={processingId === request.id || !request.profile_id}
                        onClick={() => handleProcess(request, "reset")}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                        Réinitialiser à 00000000
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={processingId === request.id}
                        onClick={() => handleProcess(request, "reject")}
                      >
                        <XCircle className="h-4 w-4" />
                        Refuser
                      </Button>
                      {!request.profile_id && (
                        <span className="self-center text-xs text-amber-700">
                          Aucun compte avec cet email : vérifiez l'adresse avant de refuser.
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
