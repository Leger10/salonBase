// /src/pages/RateEmployeePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, User, Phone, Mail, Calendar, Scissors, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function RateEmployeePage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId, isAuthenticated, currentUser]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Récupérer les infos de l'employé
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          position,
          is_cashier,
          average_rating,
          total_clients_served,
          tenant_id,
          profile:profile_id (
            id,
            full_name,
            email,
            phone,
            avatar
          )
        `)
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;
      setEmployee(employeeData);
      setTenantId(employeeData.tenant_id);

      // 2. Récupérer les rendez-vous du client avec cet employé
      if (isAuthenticated && currentUser?.profile?.id) {
        // Récupérer le client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', currentUser.profile.id)
          .eq('tenant_id', employeeData.tenant_id)
          .maybeSingle();

        if (!clientError && clientData) {
          // Récupérer les rendez-vous
          const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointments')
            .select(`
              id,
              appointment_date,
              start_time,
              status,
              service:service_id (
                id,
                name,
                price
              )
            `)
            .eq('employee_id', employeeId)
            .eq('client_id', clientData.id)
            .in('status', ['completed', 'confirmed'])
            .order('appointment_date', { ascending: false });

          if (!appointmentsError) {
            setAppointments(appointmentsData || []);
          }

          // Vérifier si le client a déjà noté cet employé
          const { data: reviewData, error: reviewError } = await supabase
            .from('reviews')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('client_id', clientData.id)
            .maybeSingle();

          if (!reviewError && reviewData) {
            setExistingReview(reviewData);
            setRating(reviewData.rating);
            setComment(reviewData.comment || '');
            setSubmitted(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setError('Impossible de charger les données de l\'employé');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour noter');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      // Récupérer le client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', currentUser.profile.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (clientError || !clientData) {
        toast.error('Client non trouvé');
        setSubmitting(false);
        return;
      }

      const reviewData = {
        employee_id: employeeId,
        client_id: clientData.id,
        tenant_id: tenantId,
        rating: rating,
        comment: comment.trim() || null,
        appointment_id: selectedAppointment || null,
        is_approved: true,
        created_at: new Date().toISOString()
      };

      let error;
      if (existingReview) {
        // Mettre à jour l'avis existant
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating: rating,
            comment: comment.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReview.id);
        error = updateError;
      } else {
        // Créer un nouvel avis
        const { error: insertError } = await supabase
          .from('reviews')
          .insert(reviewData);
        error = insertError;
      }

      if (error) {
        console.error('Error saving review:', error);
        throw error;
      }

      // Mettre à jour la note moyenne de l'employé
      const { data: allReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('employee_id', employeeId)
        .eq('is_approved', true);

      if (!reviewsError && allReviews && allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await supabase
          .from('employees')
          .update({ average_rating: avgRating })
          .eq('id', employeeId);
      }

      toast.success(existingReview ? 'Avis mis à jour avec succès !' : 'Merci pour votre avis !');
      setSubmitted(true);
      await fetchEmployeeData();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Erreur lors de l\'envoi de l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (ratingValue, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive || submitted}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-transform hover:scale-110`}
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hoverRating || ratingValue)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl mt-6" />
          <Skeleton className="h-48 w-full rounded-2xl mt-6" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <p className="text-red-600 font-medium">{error || 'Employé non trouvé'}</p>
            <Button asChild className="mt-4">
              <Link to="/team">Retour à l'équipe</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const employeeName = employee.profile?.full_name || 'Employé';
  const employeeAvatar = employee.profile?.avatar;
  const employeePosition = employee.position || 'Styliste';
  const employeeNumber = employee.employee_number;

  return (
    <>
      <Helmet>
        <title>Noter {employeeName} - BeautyFlow</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <div className="max-w-2xl mx-auto px-4 py-12">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'équipe
            </Link>
          </Button>

          <Card className="border-none shadow-lg overflow-hidden">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 text-center">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4 overflow-hidden">
                  {employeeAvatar ? (
                    <img src={employeeAvatar} alt={employeeName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-primary" />
                  )}
                </div>
                <h1 className="text-2xl font-bold">{employeeName}</h1>
                <p className="text-muted-foreground">{employeePosition}</p>
                <Badge variant="outline" className="mt-2">
                  #{employeeNumber}
                </Badge>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Note actuelle */}
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-2">Note moyenne</p>
                <div className="flex items-center justify-center gap-3">
                  {renderStars(Math.round(employee.average_rating || 0))}
                  <span className="text-2xl font-bold">
                    {(employee.average_rating || 0).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {employee.total_clients_served || 0} clients servis
                </p>
              </div>

              {/* Formulaire de notation */}
              {!submitted ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm font-medium mb-3">
                      {existingReview ? 'Modifier votre note' : 'Comment évaluez-vous cet employé ?'}
                    </p>
                    <div className="flex justify-center">
                      {renderStars(rating, true)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {rating === 1 && '⭐ Très insatisfait'}
                      {rating === 2 && '⭐⭐ Insatisfait'}
                      {rating === 3 && '⭐⭐⭐ Satisfait'}
                      {rating === 4 && '⭐⭐⭐⭐ Très satisfait'}
                      {rating === 5 && '⭐⭐⭐⭐⭐ Excellent !'}
                      {rating === 0 && 'Cliquez sur une étoile pour noter'}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="comment" className="text-sm font-medium block mb-2">
                      Votre commentaire (optionnel)
                    </label>
                    <textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Partagez votre expérience avec cet employé..."
                      className="w-full min-h-[100px] p-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={submitting}
                    />
                  </div>

                  {isAuthenticated ? (
                    <Button
                      onClick={handleSubmitReview}
                      disabled={submitting || rating === 0}
                      className="w-full"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        existingReview ? 'Mettre à jour mon avis' : 'Envoyer mon avis'
                      )}
                    </Button>
                  ) : (
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Connectez-vous pour noter cet employé
                      </p>
                      <Button asChild className="mt-3">
                        <Link to="/login">Se connecter</Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-600">
                    {existingReview ? 'Avis mis à jour !' : 'Merci pour votre avis !'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Votre note aide les autres clients à faire leur choix
                  </p>
                  {!existingReview && (
                    <div className="mt-4 flex justify-center">
                      {renderStars(rating)}
                    </div>
                  )}
                  {comment && (
                    <p className="mt-3 text-sm italic text-muted-foreground">
                      "{comment}"
                    </p>
                  )}
                  <Button variant="outline" className="mt-6" onClick={() => {
                    setSubmitted(false);
                    setRating(0);
                    setComment('');
                  }}>
                    Modifier mon avis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rendez-vous du client avec cet employé */}
          {isAuthenticated && appointments.length > 0 && (
            <Card className="mt-6 border-none shadow-md">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Vos rendez-vous avec {employeeName}
                </h3>
                <div className="space-y-3">
                  {appointments.slice(0, 5).map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {appt.service?.name || 'Service'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.appointment_date).toLocaleDateString()} à {appt.start_time}
                        </p>
                      </div>
                      <Badge className={appt.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {appt.status === 'completed' ? '✅ Terminé' : 'Confirmé'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}