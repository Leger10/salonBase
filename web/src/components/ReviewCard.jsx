import React from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Star, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ReviewCard({ review }) {
  // ✅ Structure Supabase - récupération des données depuis appointments
  const clientName = review.client?.profile?.full_name || 
                     review.client_name || 
                     'Client anonyme';
  
  const employeeName = review.employee?.profile?.full_name || 
                       review.employee_name || 
                       'Notre équipe';
  
  const serviceName = review.service?.name || review.service_name || '';
  const reviewDate = review.created_at || review.created || new Date();
  const rating = review.rating || 0;
  const comment = review.review || review.comment || '';

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="h-full border shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {getInitials(clientName)}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{clientName}</h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(reviewDate), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          {renderStars(rating)}
        </div>
        
        {comment && (
          <p className="text-sm leading-relaxed text-muted-foreground flex-1 italic">
            "{comment}"
          </p>
        )}
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {employeeName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {employeeName}
              </span>
            )}
            {serviceName && (
              <span className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
                {serviceName}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}