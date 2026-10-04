// /src/components/client/ClientCard.jsx
import React from 'react';
import { Mail, Phone, Star, Calendar, User, Store } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function ClientCard({ client, onClick, showTenant = false }) {
  // ✅ Structure Supabase - récupération depuis client.profile
  const fullName = client.profile?.full_name || client.full_name || client.name || 'Client';
  const email = client.profile?.email || client.email;
  const phone = client.profile?.phone || client.phone;
  const avatar = client.profile?.avatar || client.avatar;
  const loyaltyPoints = client.loyalty_points || 0;
  const totalVisits = client.total_visits || 0;
  const birthday = client.birthday;
  const tenantName = client.tenants?.name || client.tenant_name;

  const getInitials = (name) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div 
      onClick={onClick}
      className="cursor-pointer rounded-xl border bg-card p-4 transition-all hover:shadow-lg hover:-translate-y-1 group"
    >
      <div className="flex items-start gap-4">
        {avatar ? (
          <img 
            src={avatar} 
            alt={fullName}
            className="h-16 w-16 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 text-2xl font-bold text-primary">
            {getInitials(fullName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {fullName}
          </h3>
          
          {/* ✅ Salon associé */}
          {showTenant && tenantName && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Store className="h-3 w-3" />
              <span>{tenantName}</span>
            </div>
          )}

          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {email && (
              <div className="flex items-center gap-2 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{phone}</span>
              </div>
            )}
            {birthday && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(birthday), 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {loyaltyPoints > 0 && (
              <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-200">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {loyaltyPoints} points
              </Badge>
            )}
            {totalVisits > 0 && (
              <Badge variant="outline" className="gap-1">
                <User className="h-3 w-3" />
                {totalVisits} visites
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}