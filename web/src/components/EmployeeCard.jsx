import React from 'react';
import { Mail, Phone, DollarSign, CheckCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';

export default function EmployeeCard({ employee, onClick }) {
  // ✅ Structure Supabase - récupération des données depuis employee.profile
  const fullName = employee.profile?.full_name || 'Employé';
  const email = employee.profile?.email;
  const phone = employee.profile?.phone;
  const avatar = employee.profile?.avatar;
  const employeeNumber = employee.employee_number;
  const commissionRate = employee.commission_rate || 0;
  const isCashier = employee.is_cashier || false;
  const averageRating = employee.average_rating || 0;

  const getInitials = (name) => {
    if (!name) return 'E';
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
        <div className="relative">
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
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {employeeNumber}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {fullName}
          </h3>
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
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {averageRating > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{averageRating.toFixed(1)}</span>
              </div>
            )}
            {commissionRate > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <DollarSign className="h-4 w-4" />
                <span>{commissionRate}%</span>
              </div>
            )}
            {isCashier && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Caissier
              </Badge>
            )}
            {employee.position && (
              <Badge variant="outline" className="text-xs">
                {employee.position}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}