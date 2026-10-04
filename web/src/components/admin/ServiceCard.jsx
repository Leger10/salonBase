// /src/components/admin/ServiceCard.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, DollarSign, Calendar, Star, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

export default function ServiceCard({ 
  service, 
  showActions = false, 
  onEdit, 
  onToggle, 
  onDelete,
  className,
  tenantSlug = null
}) {
  const [imageError, setImageError] = useState(false);

  if (!service) return null;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-md hover:shadow-2xl transition-all duration-300",
        className
      )}
    >
      {/* ✅ Image Cover - hauteur fixe avec object-cover */}
      <div className="relative h-52 md:h-60 overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10">
        {service.image_url && !imageError ? (
          <img
            src={service.image_url}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
            <span className="text-7xl md:text-8xl mb-2">
              {service.icon_emoji || "✂️"}
            </span>
            <span className="text-xs text-muted-foreground">Aucune image</span>
          </div>
        )}

        {/* ✅ Overlay gradient pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* ✅ Prix en bas à gauche */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl px-3.5 py-2 shadow-lg border border-white/20">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold text-base md:text-lg">
              {service.price.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        {/* ✅ Durée en haut à droite */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-xl px-3 py-1.5 text-white text-xs md:text-sm border border-white/10">
            <Clock className="h-3.5 w-3.5" />
            {service.duration} min
          </div>
        </div>

        {/* ✅ Badge Premium en haut à gauche (si applicable) */}
        {service.salon_type === "premium" && (
          <div className="absolute top-4 left-4">
            <span className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
              <Star className="h-3 w-3 fill-white" />
              Premium
            </span>
          </div>
        )}
      </div>

      {/* ✅ Contenu */}
      <div className="p-4 md:p-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg md:text-xl font-bold leading-tight truncate">
              {service.name}
            </h3>
            {service.category && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {service.category}
              </span>
            )}
          </div>
        </div>

        {/* ✅ Description (max 2 lignes) */}
        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        )}

        {/* ✅ Actions pour admin (intégrées dans la carte) */}
        {showActions && (
          <div className="flex items-center gap-2 pt-3 border-t mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 rounded-xl"
              onClick={() => onEdit?.(service)}
            >
              Modifier
            </Button>
            <Button
              variant={service.is_active ? "outline" : "default"}
              size="sm"
              className="flex-1 gap-1.5 rounded-xl"
              onClick={() => onToggle?.(service)}
            >
              {service.is_active ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Masquer
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Afficher
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl"
              onClick={() => onDelete?.(service)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ✅ Bouton Réserver (pour le public) - UNIQUEMENT si showActions est false */}
        {!showActions && (
          <Link
            to={
              tenantSlug ? `/showcase/${tenantSlug}?service=${service.id}` : "#"
            }
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95"
          >
            <Calendar className="h-4 w-4" />
            Réserver ce service
          </Link>
        )}
      </div>
    </motion.div>
  );
}