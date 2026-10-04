import React from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Star, User } from 'lucide-react';

export default function TeamMemberCard({ member }) {
  // ✅ Récupération des données depuis la structure Supabase
  const name = member.profile?.full_name || member.profile?.name || 'Membre de l\'équipe';
  const rating = member.average_rating || 0;
  const position = member.position || 'Spécialiste';
  const avatarUrl = member.profile?.avatar || null;
  const totalClients = member.total_clients_served || 0;
  const specialties = member.specialties || '';

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col h-full">
      <div className="aspect-square overflow-hidden bg-muted relative">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <span className="text-6xl font-bold text-primary/40">{getInitials(name)}</span>
          </div>
        )}
        {member.is_cashier && (
          <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            🏦 Caisse
          </div>
        )}
      </div>
      <CardContent className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{position}</p>
        
        <div className="flex items-center gap-1 mb-3">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{rating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">
            ({totalClients} clients servis)
          </span>
        </div>

        {member.notes && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{member.notes}</p>
        )}

        {specialties && (
          <div className="flex flex-wrap gap-2 mt-auto pt-2">
            {specialties.split(',').slice(0, 3).map((specialty, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {specialty.trim()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}