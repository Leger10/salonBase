// /src/pages/TenantShowcase.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Star,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  Users,
  Scissors,
  Award,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Instagram,
  Facebook,
  Globe,
  Share2,
  Heart,
  MessageCircle,
  Ticket,
  UserPlus,
  Crown,
  Gift,
  Zap,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Eye,
  CalendarPlus,
  ShoppingBag,
  Loader2,
  ListChecks,
  Search,
  RefreshCw,
  Bell,
  User,
  XCircle,
  Archive,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Megaphone,
  Link as LinkIcon,
  TrendingUp,
  GraduationCap,
  Sparkle,
  Play,
  Video,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TicketQueue from "@/components/client/TicketQueue";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SiTiktok } from "react-icons/si";
import { TicketStatusTrackerWithNotifications } from "@/components/TicketStatusNotification";
// ========== COMPOSANT : GALERIE AVEC IMAGE PLEINE VISIBLE ==========
const GalleryImage = ({ src, alt, onClick, service, onTakeTicket }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-lg cursor-pointer group aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      {/* ✅ Overlay au survol */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-white text-xs font-medium truncate opacity-90">
              {alt}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-lg text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTakeTicket) {
                    onTakeTicket(service);
                  }
                }}
              >
                <Ticket className="h-3.5 w-3.5" />
                Prendre ticket
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 gap-1.5 bg-white/20 hover:bg-white/30 text-white shadow-lg text-xs h-8 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                Agrandir
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
// ========== HELPERS POUR LES PUBLICATIONS ==========
const getTypeLabel = (type) => {
  const types = {
    announcement: "📢 Annonce",
    promotion: "🎉 Promotion",
    ad: "📰 Publicité",
    training: "🎓 Formation",
    event: "📅 Événement",
  };
  return types[type] || type;
};

const getTypeIcon = (type) => {
  const icons = {
    announcement: Megaphone,
    promotion: Gift,
    ad: TrendingUp,
    training: GraduationCap,
    event: Calendar,
  };
  const Icon = icons[type] || Megaphone;
  return <Icon className="h-4 w-4" />;
};

const getTypeColor = (type) => {
  const colors = {
    announcement: "from-blue-500 to-blue-600",
    promotion: "from-amber-500 to-amber-600",
    ad: "from-emerald-500 to-emerald-600",
    training: "from-purple-500 to-purple-600",
    event: "from-rose-500 to-rose-600",
  };
  return colors[type] || "from-primary to-primary/70";
};

const getTypeBadgeColor = (type) => {
  const colors = {
    announcement: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    promotion: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    ad: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    training: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    event: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };
  return colors[type] || "bg-primary/20 text-primary border-primary/30";
};

// ============================================
// COMPOSANT : PUBLICATION CARD AVEC MODAL
// ============================================
const PublicationCard = ({ publication, index, onViewFull }) => {
  const [isHovered, setIsHovered] = useState(false);
  const badgeColor = getTypeBadgeColor(publication.type);

  const isVideo =
    publication.video_url ||
    publication.link_url?.includes("youtube") ||
    publication.link_url?.includes("youtu.be") ||
    publication.link_url?.includes("vimeo");

  const videoSrc = publication.video_url || publication.link_url || null;

  const getVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(publication.link_url);
  const isYouTube =
    publication.link_url?.includes("youtube") ||
    publication.link_url?.includes("youtu.be");

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.1,
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        damping: 12,
      }}
      whileHover={{ y: -8, scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative group rounded-2xl overflow-hidden border transition-all duration-300 ${
        publication.is_highlighted
          ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10"
          : "hover:shadow-xl"
      }`}
    >
      {publication.is_highlighted && (
        <div className="absolute top-3 right-3 z-20">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-lg shadow-amber-500/30 px-3 py-1">
              <Sparkle className="h-3 w-3 mr-1" />
              Mis en avant
            </Badge>
          </motion.div>
        </div>
      )}

      {publication.image_url || isVideo ? (
        <div
          className="relative h-56 overflow-hidden cursor-pointer group/image"
          onClick={() => onViewFull(publication)}
        >
          {isVideo && publication.video_url ? (
            <div className="relative w-full h-full bg-black">
              <video
                src={publication.video_url}
                className="w-full h-full object-cover"
                muted
                loop={false}
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                  <Play className="h-10 w-10 text-white ml-1" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : isVideo && isYouTube && videoId ? (
            <>
              <div className="relative w-full h-full bg-black">
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt={publication.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <Play className="h-10 w-10 text-white ml-1" />
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </>
          ) : (
            <motion.img
              src={publication.image_url}
              alt={publication.title}
              className="w-full h-full object-cover"
              animate={{ scale: isHovered ? 1.08 : 1 }}
              transition={{ duration: 0.6 }}
            />
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 transform scale-75 group-hover/image:scale-100 transition-transform duration-300">
              {isVideo ? (
                <Play className="h-6 w-6 text-white" />
              ) : (
                <Eye className="h-6 w-6 text-white" />
              )}
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          <div className="absolute bottom-4 left-4 z-10">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge
                className={`${badgeColor} border shadow-lg backdrop-blur-sm`}
              >
                {getTypeIcon(publication.type)}
                <span className="ml-1">{getTypeLabel(publication.type)}</span>
              </Badge>
            </motion.div>
          </div>

          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            initial={{ x: "-100%" }}
            animate={{ x: isHovered ? "100%" : "-100%" }}
            transition={{ duration: 0.8 }}
          />
        </div>
      ) : null}

      <div className="p-5 space-y-3 bg-card">
        <div className="flex items-start justify-between gap-2">
          <motion.h3
            className="font-bold text-lg line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onViewFull(publication)}
            animate={{ color: isHovered ? "hsl(var(--primary))" : undefined }}
          >
            {publication.title}
          </motion.h3>
          {!publication.image_url && !isVideo && (
            <Badge className={`${badgeColor} shrink-0 text-xs`}>
              {getTypeIcon(publication.type)}
              <span className="ml-1 hidden sm:inline">
                {getTypeLabel(publication.type)}
              </span>
            </Badge>
          )}
          {isVideo && !publication.image_url && (
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 shrink-0 text-xs">
              <Video className="h-3 w-3 mr-1" />
              Vidéo
            </Badge>
          )}
        </div>

        {publication.description && (
          <motion.p
            className="text-sm text-muted-foreground line-clamp-2"
            animate={{ opacity: isHovered ? 1 : 0.8 }}
          >
            {publication.description}
          </motion.p>
        )}

        {publication.content && (
          <p className="text-sm text-muted-foreground/80 line-clamp-2">
            {publication.content}
          </p>
        )}

        {(publication.start_date || publication.end_date) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {publication.start_date && (
              <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                <Calendar className="h-3 w-3" />
                {format(new Date(publication.start_date), "dd MMM", {
                  locale: fr,
                })}
              </span>
            )}
            {publication.end_date && (
              <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" />
                {format(new Date(publication.end_date), "dd MMM", {
                  locale: fr,
                })}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {publication.link_url && !isVideo && (
            <motion.a
              href={publication.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline"
              whileHover={{ x: 5 }}
            >
              En savoir plus
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.a>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground hover:text-primary"
            onClick={() => onViewFull(publication)}
          >
            <Eye className="h-3.5 w-3.5" />
            Voir en grand
          </Button>
        </div>

        {publication.status === "scheduled" && (
          <div className="flex items-center gap-1 text-xs text-blue-400">
            <Clock className="h-3 w-3" />
            Programmé
          </div>
        )}
      </div>

      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        animate={{
          boxShadow: isHovered
            ? "inset 0 0 30px rgba(236, 72, 153, 0.05)"
            : "inset 0 0 0px transparent",
        }}
      />
    </motion.div>
  );
};

// ============================================
// MODAL DE VISUALISATION PLEIN ÉCRAN
// ============================================
const FullViewModal = ({ publication, isOpen, onClose }) => {
  if (!publication) return null;

  const isVideo =
    publication.video_url ||
    publication.link_url?.includes("youtube") ||
    publication.link_url?.includes("youtu.be") ||
    publication.link_url?.includes("vimeo");

  const videoSrc = publication.video_url || publication.link_url || null;

  const getVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(publication.link_url);
  const isYouTube =
    publication.link_url?.includes("youtube") ||
    publication.link_url?.includes("youtu.be");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 bg-black/95 border-none max-h-[95vh] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative w-full">
          {isVideo && publication.video_url ? (
            <div className="w-full aspect-video bg-black">
              <video
                src={publication.video_url}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>
          ) : isVideo && isYouTube && videoId ? (
            <div className="w-full aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title={publication.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <img
              src={publication.image_url}
              alt={publication.title}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Badge className="bg-primary/80 text-white border-none">
                {getTypeIcon(publication.type)}
                <span className="ml-1">{getTypeLabel(publication.type)}</span>
              </Badge>
              {publication.is_highlighted && (
                <Badge className="bg-amber-500 text-white border-none">
                  ⭐ Mis en avant
                </Badge>
              )}
              {publication.status === "scheduled" && (
                <Badge className="bg-blue-500 text-white border-none">
                  📅 Programmé
                </Badge>
              )}
              {publication.video_url && (
                <Badge className="bg-purple-500 text-white border-none">
                  <Video className="h-3 w-3 mr-1" />
                  Vidéo
                </Badge>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white">
              {publication.title}
            </h2>

            {publication.description && (
              <p className="text-white/80 mt-2">{publication.description}</p>
            )}

            {publication.content && (
              <p className="text-white/60 text-sm mt-1 line-clamp-3">
                {publication.content}
              </p>
            )}

            {(publication.start_date || publication.end_date) && (
              <div className="flex items-center gap-4 mt-3 text-sm text-white/60">
                {publication.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(publication.start_date), "dd MMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                )}
                {publication.end_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(publication.end_date), "dd MMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                )}
              </div>
            )}

            {publication.link_url && !isVideo && (
              <a
                href={publication.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                En savoir plus
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
// ========== COMPOSANT : SERVICE CARD (CORRIGÉ - IMAGE PLEINE) ==========
const ServiceCardWithTicket = ({ service, onTakeTicket, onViewDetails }) => {
  // ✅ Fonction pour récupérer l'image depuis différents champs possibles
  const getImageUrl = (service) => {
    if (!service) return null;

    return (
      service.image_url ||
      service.cover_image ||
      service.photo_url ||
      service.picture_url ||
      service.main_image ||
      service.images?.[0] ||
      service.image ||
      null
    );
  };

  const imageUrl = getImageUrl(service);
  const hasImage = !!imageUrl && imageUrl.trim() !== "";

  const serviceName = service?.name || "Service sans nom";
  const price = service?.price || service?.selling_price || 0;
  const duration = service?.duration || service?.estimated_duration || 30;
  const category = service?.category || "Service";
  const description = service?.description || service?.short_description || "";
  const iconEmoji = service?.icon_emoji || "✂️";

  return (
    <motion.div whileHover={{ y: -4 }} className="group h-full">
      <Card className="overflow-hidden border hover:shadow-xl transition-all duration-300 h-full flex flex-col">
        {/* ✅ Section image - Pleine hauteur avec l'image visible en entier */}
        <div
          className="relative h-56 w-full bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden cursor-pointer flex-shrink-0"
          onClick={onViewDetails}
        >
          {hasImage ? (
            <img
              src={imageUrl}
              alt={serviceName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = "none";
                const parent = e.target.parentElement;
                const fallback = document.createElement("div");
                fallback.className =
                  "w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20";
                fallback.innerHTML = `<span class="text-6xl opacity-60">${iconEmoji}</span>`;
                parent.appendChild(fallback);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-6xl opacity-60">{iconEmoji}</span>
            </div>
          )}
        </div>

        {/* ✅ Badges et contenu EN DESSOUS de l'image */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Badges sous l'image */}
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <Badge variant="outline" className="text-xs bg-primary/5">
              {category}
            </Badge>
            <Badge className="bg-primary/90 text-white border-none text-xs">
              {price?.toLocaleString()} FCFA
            </Badge>
          </div>

          {/* Contenu */}
          <div className="flex-1" onClick={onViewDetails}>
            <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors cursor-pointer">
              {serviceName}
            </h3>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {duration} min
              </Badge>
            </div>

            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
                {description}
              </p>
            )}
          </div>

          {/* ✅ Bouton d'action - Centré */}
          <div className="mt-3 pt-2 border-t border-muted/20">
            <Button
              size="sm"
              className="w-full gap-1.5 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onTakeTicket(service);
              }}
            >
              <Ticket className="h-4 w-4" />
              Prendre ticket
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
// ========== COMPOSANT : PRENDRE TICKET MODAL ==========
const TakeTicketModal = ({
  service,
  isOpen,
  onClose,
  tenantId,
  tenantName,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestSector, setGuestSector] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketTaken, setTicketTaken] = useState(false);
  const [ticketNumber, setTicketNumber] = useState(null);

  const handleTakeTicket = async () => {
    if (!guestName.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }

    setLoading(true);
    try {
      let clientId = null;
      let clientName = guestName.trim();

      if (isAuthenticated) {
        const profileId = currentUser?.profile?.id;
        if (!profileId) {
          toast.error("Profil non trouvé");
          return;
        }

        clientName = currentUser?.profile?.full_name || "Client";

        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("profile_id", profileId)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              profile_id: profileId,
              tenant_id: tenantId,
              name: clientName,
              email: currentUser?.profile?.email || currentUser?.email,
              loyalty_points: 0,
              total_visits: 0,
              total_spent: 0,
            })
            .select()
            .single();

          if (createError) throw createError;
          clientId = newClient.id;
        }
      } else {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("name", clientName)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const clientData = {
            tenant_id: tenantId,
            name: clientName,
            phone: guestPhone || null,
            loyalty_points: 0,
            total_visits: 0,
            total_spent: 0,
          };

          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              ...clientData,
              profile_id: null,
            })
            .select()
            .single();

          if (createError) {
            console.error("Erreur création client:", createError);
            toast.error("Impossible de créer le client");
            return;
          }
          clientId = newClient.id;
        }
      }

      if (!clientId) {
        throw new Error("Impossible de créer ou trouver le client");
      }

      const today = new Date().toISOString().split("T")[0];

      const { data: lastTicket } = await supabase
        .from("tickets")
        .select("ticket_number")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .neq("status", "archived")
        .order("ticket_number", { ascending: false })
        .limit(1);

      const newNumber = (lastTicket?.[0]?.ticket_number || 0) + 1;

      const ticketData = {
        tenant_id: tenantId,
        client_id: clientId,
        client_name: clientName,
        ticket_number: newNumber,
        status: "waiting",
        date: today,
        service_type: service.name,
        service_id: service.id,
        service_price: service.price || 0,
      };

      if (guestPhone) ticketData.client_phone = guestPhone;
      if (guestSector) ticketData.client_sector = guestSector;

      const { data, error } = await supabase
        .from("tickets")
        .insert(ticketData)
        .select()
        .single();

      if (error) {
        console.error("Erreur création ticket:", error);

        if (
          error.code === "42501" ||
          error.message?.includes("row-level security")
        ) {
          const { data: retryTicket, error: retryError } = await supabase
            .from("tickets")
            .insert({
              tenant_id: tenantId,
              client_name: clientName,
              ticket_number: newNumber,
              status: "waiting",
              date: today,
              service_type: service.name,
            })
            .select()
            .single();

          if (retryError) throw retryError;
          setTicketNumber(retryTicket.ticket_number);
        } else {
          throw error;
        }
      } else {
        setTicketNumber(data.ticket_number);
      }

      setTicketTaken(true);
      toast.success(`Ticket #${newNumber} pris avec succès !`);

      try {
        const audio = new Audio("/ticket.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    } catch (error) {
      console.error("Error taking ticket:", error);
      toast.error("Erreur lors de la prise du ticket. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const TicketReceived = () => (
    <div className="text-center py-6 space-y-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Ticket className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-2xl font-bold text-green-600">Ticket pris !</h3>

      <div className="bg-primary/5 border-2 border-primary rounded-2xl p-6 max-w-xs mx-auto">
        <p className="text-sm text-muted-foreground">Votre numéro</p>
        <p className="text-7xl font-bold text-primary">#{ticketNumber}</p>
      </div>

      <div className="bg-muted/20 rounded-xl p-4 text-left space-y-2 max-w-xs mx-auto">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Service</span>
          <span className="font-medium">{service?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Client</span>
          <span className="font-medium">
            {guestName || currentUser?.profile?.full_name}
          </span>
        </div>
        {guestPhone && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Téléphone</span>
            <span className="font-medium">{guestPhone}</span>
          </div>
        )}
        {guestSector && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Secteur</span>
            <span className="font-medium">{guestSector}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Statut</span>
          <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        📢 Soyez attentif à l'appel de votre numéro
      </p>

      <Button className="w-full max-w-xs" onClick={onClose}>
        Fermer
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {!ticketTaken ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Prendre un ticket
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Pour le service : <strong>{service?.name}</strong>
              </p>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="guestName" className="text-sm font-medium">
                  Nom complet <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Entrez votre nom complet"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="guestPhone" className="text-sm font-medium">
                  Numéro de téléphone
                </Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+226 54 32 92 99"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pour vous contacter si besoin
                </p>
              </div>

              <div>
                <Label htmlFor="guestSector" className="text-sm font-medium">
                  Quartier ou secteur
                </Label>
                <Input
                  id="guestSector"
                  value={guestSector}
                  onChange={(e) => setGuestSector(e.target.value)}
                  placeholder="Ex: Cocody, Plateau, Marcory..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pour faciliter votre localisation
                </p>
              </div>

              {isAuthenticated && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium">
                    👤 {currentUser?.profile?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentUser?.profile?.email}
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted/20 rounded-lg text-sm space-y-1">
                <p className="font-medium">Récapitulatif</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durée</span>
                  <span>{service?.duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix</span>
                  <span className="font-bold text-primary">
                    {service?.price?.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleTakeTicket}
                disabled={loading || !guestName.trim()}
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ticket className="h-4 w-4" />
                )}
                {loading ? "Prise en cours..." : "Prendre le ticket"}
              </Button>

              {!isAuthenticated && (
                <p className="text-xs text-center text-muted-foreground">
                  💡 Pas besoin de compte, entrez simplement votre nom
                </p>
              )}
            </div>
          </>
        ) : (
          <TicketReceived />
        )}
      </DialogContent>
    </Dialog>
  );
};

// ========== COMPOSANT : MES TICKETS ==========
const MyTicketsModal = ({ isOpen, onClose, tenantId }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [allTickets, setAllTickets] = useState([]);
  const [queuePosition, setQueuePosition] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const getTicketsAhead = () => {
    if (!tickets.length || !allTickets.length) return 0;

    const userTicketNumbers = tickets.map((t) => t.ticket_number);
    const maxUserTicket = Math.max(...userTicketNumbers);

    const ahead = allTickets.filter(
      (t) =>
        t.ticket_number < maxUserTicket &&
        (t.status === "waiting" || t.status === "called"),
    );

    return ahead.length;
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      setTickets([]);
      setFilteredTickets([]);
      setLoading(true);
      setInitialLoadDone(false);

      if (isAuthenticated && currentUser?.profile?.full_name) {
        const userName = currentUser.profile.full_name;
        setClientName(userName);
        setSearchTerm(userName);
        localStorage.setItem("guest_ticket_name", userName);
        fetchMyTickets(userName);
      } else {
        const storedName = localStorage.getItem("guest_ticket_name");
        if (storedName) {
          setClientName(storedName);
          setSearchTerm(storedName);
          fetchMyTickets(storedName);
        } else {
          fetchAllTicketsForDebug();
          setLoading(false);
        }
      }
    }
  }, [isOpen, tenantId, isAuthenticated, currentUser]);

  const fetchAllTicketsForDebug = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erreur récupération tous les tickets:", error);
      } else {
        setAllTickets(data || []);
        const filtered = (data || []).filter((t) => t.status !== "archived");
        setFilteredTickets(filtered);
        setTickets(filtered);
        setInitialLoadDone(true);
      }
    } catch (error) {
      console.error("❌ Erreur:", error);
    }
  };

  const fetchMyTickets = async (name) => {
    setLoading(true);
    setSearchError(false);
    setHasSearched(true);
    try {
      let nameFilter = name || clientName;

      if (!nameFilter) {
        setLoading(false);
        setSearchError(true);
        setInitialLoadDone(true);
        return;
      }

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .ilike("client_name", `%${nameFilter}%`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erreur requête:", error);
        throw error;
      }

      const visibleTickets = (data || []).filter(
        (t) => t.status !== "archived",
      );
      setTickets(visibleTickets);
      setFilteredTickets(visibleTickets);
      setStatusFilter("all");
      setInitialLoadDone(true);

      if (data && data.length > 0) {
        const { data: waitingTickets } = await supabase
          .from("tickets")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("status", ["waiting", "called", "in_progress"])
          .order("ticket_number", { ascending: true });

        const userTicket = data.find(
          (t) => t.status === "waiting" || t.status === "called",
        );
        if (userTicket && waitingTickets) {
          const position =
            waitingTickets.findIndex((t) => t.id === userTicket.id) + 1;
          setQueuePosition(position > 0 ? position : null);
        } else {
          setQueuePosition(null);
        }
      }

      if (data?.length === 0) {
        setSearchError(true);
        await fetchAllTicketsForDebug();
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Erreur lors du chargement de vos tickets");
      setSearchError(true);
      setInitialLoadDone(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      localStorage.setItem("guest_ticket_name", searchTerm.trim());
      setClientName(searchTerm.trim());
      fetchMyTickets(searchTerm.trim());
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setClientName("");
    setTickets([]);
    setFilteredTickets([]);
    setSearchError(false);
    setHasSearched(false);
    setQueuePosition(null);
    setStatusFilter("all");
    setInitialLoadDone(false);
    setShowArchived(false);
    localStorage.removeItem("guest_ticket_name");
    fetchAllTicketsForDebug();
    toast.info("Filtres réinitialisés");
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    applyFilters(status);
  };

  const applyFilters = (status = statusFilter) => {
    let filtered = [...tickets];

    if (status !== "all") {
      if (status === "completed") {
        filtered = filtered.filter(
          (t) => t.status === "completed" || t.status === "archived",
        );
      } else {
        filtered = filtered.filter((t) => t.status === status);
      }
    }

    if (!showArchived && status !== "archived" && status !== "completed") {
      filtered = filtered.filter((t) => t.status !== "archived");
    }

    setFilteredTickets(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [tickets, statusFilter, showArchived]);

  const handleClose = () => {
    onClose();
  };

  const getStatusCount = (status) => {
    return tickets.filter((t) => t.status === status).length;
  };

  const getStatusConfig = (status) => {
    const config = {
      waiting: {
        label: "⏳ En attente",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        icon: "⏳",
        badgeColor: "bg-amber-500",
      },
      called: {
        label: "🔔 Appelé",
        className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        icon: "🔔",
        badgeColor: "bg-blue-500",
      },
      in_progress: {
        label: "💆 En cours",
        className: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        icon: "💆",
        badgeColor: "bg-purple-500",
      },
      completed: {
        label: "✅ Terminé",
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: "✅",
        badgeColor: "bg-emerald-500",
      },
      cancelled: {
        label: "❌ Annulé",
        className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        icon: "❌",
        badgeColor: "bg-gray-500",
      },
      archived: {
        label: "📦 Archivé",
        className: "bg-gray-600/20 text-gray-400 border-gray-600/30",
        icon: "📦",
        badgeColor: "bg-gray-600",
      },
    };
    return config[status] || config.waiting;
  };

  const getStatusColor = (status) => {
    const colors = {
      waiting: "border-amber-500/30 bg-amber-950/30",
      called: "border-blue-500/30 bg-blue-950/30",
      in_progress: "border-purple-500/30 bg-purple-950/30",
      completed: "border-emerald-500/30 bg-emerald-950/30",
      cancelled: "border-gray-500/30 bg-gray-800/30",
      archived: "border-gray-600/30 bg-gray-900/30",
    };
    return colors[status] || colors.waiting;
  };

  const maskPhoneNumber = (phone) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length <= 4) return phone;
    const visible = cleaned.slice(0, 2) + "****" + cleaned.slice(-2);
    return visible;
  };

  const displayTickets = filteredTickets.length > 0 ? filteredTickets : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[90vh] overflow-y-auto bg-black border border-gray-700 text-white p-6">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl text-white">
            <div className="p-2 rounded-xl bg-primary/20">
              <ListChecks className="h-6 w-6 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Mes tickets
            </span>
            {displayTickets.length > 0 && (
              <Badge
                variant="default"
                className="ml-2 bg-primary/20 text-primary border-primary/30"
              >
                {displayTickets.length} ticket
                {displayTickets.length > 1 ? "s" : ""}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 flex items-center gap-2 mt-1">
            {isAuthenticated
              ? `👤 ${currentUser?.profile?.full_name}`
              : "Entrez votre nom pour voir vos tickets"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 h-[calc(90vh-200px)] overflow-y-auto">
          {!isAuthenticated && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Entrez votre nom pour voir vos tickets"
                    value={searchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchTerm(value);
                      localStorage.setItem("guest_ticket_name", value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchTerm.trim()) {
                        handleSearch();
                      }
                    }}
                    className="pl-10 bg-gray-900 border-gray-700 flex-1 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={!searchTerm.trim()}
                  className="gap-2 bg-primary hover:bg-primary/90 text-white"
                >
                  <Search className="h-4 w-4" />
                  Chercher
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {hasSearched && displayTickets.length === 0 && !searchError && (
                <p className="text-sm text-gray-400 text-center">
                  Aucun ticket trouvé pour{" "}
                  <strong className="text-white">"{searchTerm}"</strong>
                </p>
              )}
            </div>
          )}

          {isAuthenticated && (
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    👤 {currentUser?.profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {currentUser?.profile?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    ✅ Connecté
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary h-7 px-2 hover:bg-gray-800"
                    onClick={() => {
                      fetchMyTickets(currentUser?.profile?.full_name);
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Rafraîchir
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tickets.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-700">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleStatusFilter("all")}
              >
                📋 Tous ({tickets.length})
              </Button>
              {getStatusCount("waiting") > 0 && (
                <Button
                  variant={statusFilter === "waiting" ? "default" : "outline"}
                  size="sm"
                  className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-950/30"
                  onClick={() => handleStatusFilter("waiting")}
                >
                  ⏳ En attente ({getStatusCount("waiting")})
                </Button>
              )}
              {getStatusCount("called") > 0 && (
                <Button
                  variant={statusFilter === "called" ? "default" : "outline"}
                  size="sm"
                  className="text-xs border-blue-500/30 text-blue-300 hover:bg-blue-950/30"
                  onClick={() => handleStatusFilter("called")}
                >
                  🔔 Appelés ({getStatusCount("called")})
                </Button>
              )}
              {getStatusCount("in_progress") > 0 && (
                <Button
                  variant={
                    statusFilter === "in_progress" ? "default" : "outline"
                  }
                  size="sm"
                  className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-950/30"
                  onClick={() => handleStatusFilter("in_progress")}
                >
                  💆 En cours ({getStatusCount("in_progress")})
                </Button>
              )}
              {getStatusCount("completed") > 0 && (
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/30"
                  onClick={() => handleStatusFilter("completed")}
                >
                  ✅ Terminés ({getStatusCount("completed")})
                </Button>
              )}
              {getStatusCount("archived") > 0 && (
                <Button
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  📦 Archivés ({getStatusCount("archived")})
                </Button>
              )}
            </div>
          )}

          {tickets.length > 0 && queuePosition && (
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-xl border border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Position dans la file</p>
                  <p className="text-3xl font-bold text-primary">
                    #{queuePosition}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Devant vous</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {getTicketsAhead()}
                  </p>
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width:
                      allTickets.length > 0
                        ? `${((allTickets.length - getTicketsAhead()) / allTickets.length) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-gray-400">
                  Chargement de vos tickets...
                </p>
              </div>
            </div>
          ) : displayTickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-12 w-12 text-gray-500" />
              </div>
              <p className="text-lg font-medium text-white">
                {searchError ? "Aucun ticket trouvé" : "Aucun ticket"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {isAuthenticated
                  ? "Vous n'avez pas encore pris de ticket"
                  : "Prenez un ticket ou vérifiez le nom saisi"}
              </p>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  className="mt-4 border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => {
                    setSearchTerm("");
                    localStorage.removeItem("guest_ticket_name");
                    fetchAllTicketsForDebug();
                  }}
                >
                  Voir tous les tickets
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayTickets.map((ticket, index) => {
                const statusConfig = getStatusConfig(ticket.status);
                const isFirst = index === 0;
                const statusColor = getStatusColor(ticket.status);
                const isArchived = ticket.status === "archived";

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      group relative p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10
                      ${statusColor}
                      ${isFirst ? "ring-2 ring-primary/30" : ""}
                      ${ticket.status === "called" ? "animate-pulse" : ""}
                      ${isArchived ? "opacity-60" : ""}
                      cursor-pointer hover:scale-[1.02]
                    `}
                    onClick={() => {
                      toast.info(
                        `Ticket #${ticket.ticket_number} - ${ticket.client_name}`,
                      );
                    }}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`
                          flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold
                          ${isFirst ? "bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg shadow-primary/20" : isArchived ? "bg-gray-700/50 text-gray-400 border border-gray-600/30" : "bg-gray-800/50 text-primary border border-primary/20"}
                        `}
                        >
                          #{ticket.ticket_number}
                        </div>
                        <span
                          className={`text-xs font-medium px-3 py-1 rounded-full border ${statusConfig.className}`}
                        >
                          {ticket.status === "waiting" && "⏳ En attente"}
                          {ticket.status === "called" && "🔔 Votre tour !"}
                          {ticket.status === "in_progress" && "💆 En cours"}
                          {ticket.status === "completed" && "✅ Terminé"}
                          {ticket.status === "cancelled" && "❌ Annulé"}
                          {ticket.status === "archived" && "📦 Archivé"}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xl font-bold ${isFirst ? "text-primary" : isArchived ? "text-gray-400" : "text-white"}`}
                          >
                            {ticket.client_name || "Client"}
                          </span>
                          {isFirst && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                              ⭐ Plus récent
                            </Badge>
                          )}
                          {isArchived && ticket.archived_at && (
                            <Badge className="bg-gray-600/30 text-gray-400 border-gray-600/30 text-[10px]">
                              📅{" "}
                              {new Date(ticket.archived_at).toLocaleDateString(
                                "fr-FR",
                                {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {ticket.service_type && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${isArchived ? "border-gray-600 text-gray-400" : "border-gray-600 text-gray-300"}`}
                            >
                              {ticket.service_type}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                          {ticket.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(ticket.date).toLocaleDateString(
                                "fr-FR",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          )}
                          {ticket.created_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.created_at).toLocaleTimeString(
                                "fr-FR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          )}
                          {ticket.client_sector && (
                            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full text-gray-300">
                              📍 {ticket.client_sector}
                            </span>
                          )}
                          {ticket.client_phone && (
                            <span className="flex items-center gap-1 text-gray-400">
                              📞 {maskPhoneNumber(ticket.client_phone)}
                            </span>
                          )}
                        </div>
                      </div>

                      {ticket.status !== "completed" &&
                        ticket.status !== "cancelled" &&
                        ticket.status !== "archived" && (
                          <div className="mt-2 w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                ticket.status === "waiting"
                                  ? "w-1/3 bg-amber-500"
                                  : ticket.status === "called"
                                    ? "w-2/3 bg-blue-500"
                                    : ticket.status === "in_progress"
                                      ? "w-full bg-purple-500"
                                      : "w-0"
                              }`}
                            />
                          </div>
                        )}

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-primary/20 p-1 rounded-full">
                          <Eye className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4 mt-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Total: {displayTickets.length} ticket(s)
              {tickets.length !== displayTickets.length &&
                tickets.length > 0 &&
                ` (sur ${tickets.length})`}
              {statusFilter !== "all" && ` - Filtré: ${statusFilter}`}
              {showArchived && " - Archivés affichés"}
            </span>
            <div className="flex gap-2">
              {tickets.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ========== COMPOSANT : MES RENDEZ-VOUS ==========
const MyAppointmentsModal = ({ isOpen, onClose, tenantId, tenantName }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [searchMode, setSearchMode] = useState("name");
  const [hasSearched, setHasSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (isOpen && tenantId) {
      if (isAuthenticated && currentUser?.profile) {
        const userEmail = currentUser.profile.email;
        setClientEmail(userEmail);
        fetchAppointmentsByEmail(userEmail);
      } else {
        const storedEmail = localStorage.getItem("guest_appointment_email");
        const storedName = localStorage.getItem("guest_appointment_name");
        if (storedEmail) {
          setClientEmail(storedEmail);
          fetchAppointmentsByEmail(storedEmail);
        } else if (storedName) {
          setClientName(storedName);
          fetchAppointmentsByName(storedName);
        } else {
          setLoading(false);
          setHasSearched(false);
        }
      }
    }
  }, [isOpen, tenantId, isAuthenticated, currentUser]);

  const fetchAppointmentsByEmail = async (email) => {
    if (!email) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:service_id (
            id, name, duration, price
          ),
          employee:employee_id (
            id,
            profile:profile_id (
              full_name
            )
          ),
          tenant:tenant_id (
            id, name, address, phone
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .eq("client_email", email)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      setAppointments(data || []);
      applyFilters(data || []);
      localStorage.setItem("guest_appointment_email", email);

      if (data?.length === 0) {
        toast.info("Aucun rendez-vous trouvé pour cet email");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erreur lors du chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentsByName = async (name) => {
    if (!name) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:service_id (
            id, name, duration, price
          ),
          employee:employee_id (
            id,
            profile:profile_id (
              full_name
            )
          ),
          tenant:tenant_id (
            id, name, address, phone
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .ilike("client_name", `%${name}%`)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      setAppointments(data || []);
      applyFilters(data || []);
      localStorage.setItem("guest_appointment_name", name);

      if (data?.length === 0) {
        toast.info("Aucun rendez-vous trouvé pour ce nom");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erreur lors du chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data = appointments) => {
    let filtered = [...data];

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    setFilteredAppointments(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [appointments, statusFilter]);

  const handleSearch = () => {
    if (searchMode === "email" && clientEmail.trim()) {
      fetchAppointmentsByEmail(clientEmail.trim());
    } else if (searchMode === "name" && clientName.trim()) {
      fetchAppointmentsByName(clientName.trim());
    } else {
      toast.error("Veuillez entrer une recherche");
    }
  };

  const handleReset = () => {
    setClientName("");
    setClientEmail("");
    setAppointments([]);
    setFilteredAppointments([]);
    setHasSearched(false);
    setStatusFilter("all");
    localStorage.removeItem("guest_appointment_email");
    localStorage.removeItem("guest_appointment_name");
    toast.info("Filtres réinitialisés");
  };

  const getStatusConfig = (status) => {
    const config = {
      pending: {
        label: "En attente",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        icon: "⏳",
      },
      confirmed: {
        label: "Confirmé",
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: "✅",
      },
      in_progress: {
        label: "En cours",
        className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        icon: "💇",
      },
      completed: {
        label: "Terminé",
        className: "bg-green-500/20 text-green-300 border-green-500/30",
        icon: "🎉",
      },
      cancelled: {
        label: "Annulé",
        className: "bg-red-500/20 text-red-300 border-red-500/30",
        icon: "❌",
      },
      no_show: {
        label: "Non présent",
        className: "bg-gray-500/20 text-gray-300 border-gray-500/30",
        icon: "🚫",
      },
    };
    return config[status] || config.pending;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "border-amber-500/30 bg-amber-950/30",
      confirmed: "border-emerald-500/30 bg-emerald-950/30",
      in_progress: "border-blue-500/30 bg-blue-950/30",
      completed: "border-green-500/30 bg-green-950/30",
      cancelled: "border-red-500/30 bg-red-950/30",
      no_show: "border-gray-500/30 bg-gray-800/30",
    };
    return colors[status] || colors.pending;
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), "EEEE d MMMM yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const displayAppointments =
    filteredAppointments.length > 0 ? filteredAppointments : appointments;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[90vh] overflow-y-auto bg-black border border-gray-700 text-white p-6">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl text-white">
            <div className="p-2 rounded-xl bg-primary/20">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Mes rendez-vous
            </span>
            {displayAppointments.length > 0 && (
              <Badge
                variant="default"
                className="ml-2 bg-primary/20 text-primary border-primary/30"
              >
                {displayAppointments.length} rendez-vous
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 flex items-center gap-2 mt-1">
            {isAuthenticated
              ? `👤 ${currentUser?.profile?.full_name}`
              : "Entrez votre email ou nom pour voir vos rendez-vous"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 h-[calc(90vh-200px)] overflow-y-auto">
          {!isAuthenticated && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                  className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="name">Par nom</option>
                  <option value="email">Par email</option>
                </select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={
                      searchMode === "email"
                        ? "Entrez votre email"
                        : "Entrez votre nom"
                    }
                    value={searchMode === "email" ? clientEmail : clientName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (searchMode === "email") {
                        setClientEmail(value);
                        localStorage.setItem("guest_appointment_email", value);
                      } else {
                        setClientName(value);
                        localStorage.setItem("guest_appointment_name", value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    className="pl-10 bg-gray-900 border-gray-700 flex-1 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  className="gap-2 bg-primary hover:bg-primary/90 text-white"
                >
                  <Search className="h-4 w-4" />
                  Chercher
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {hasSearched && displayAppointments.length === 0 && (
                <p className="text-sm text-gray-400 text-center">
                  Aucun rendez-vous trouvé
                </p>
              )}
            </div>
          )}

          {isAuthenticated && (
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    👤 {currentUser?.profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {currentUser?.profile?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    ✅ Connecté
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary h-7 px-2 hover:bg-gray-800"
                    onClick={() => {
                      if (currentUser?.profile?.email) {
                        fetchAppointmentsByEmail(currentUser.profile.email);
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Rafraîchir
                  </Button>
                </div>
              </div>
            </div>
          )}

          {appointments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-700">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setStatusFilter("all")}
              >
                Tous ({appointments.length})
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-950/30"
                onClick={() => setStatusFilter("pending")}
              >
                ⏳ En attente (
                {appointments.filter((a) => a.status === "pending").length})
              </Button>
              <Button
                variant={statusFilter === "confirmed" ? "default" : "outline"}
                size="sm"
                className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/30"
                onClick={() => setStatusFilter("confirmed")}
              >
                ✅ Confirmés (
                {appointments.filter((a) => a.status === "confirmed").length})
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                className="text-xs border-green-500/30 text-green-300 hover:bg-green-950/30"
                onClick={() => setStatusFilter("completed")}
              >
                🎉 Terminés (
                {appointments.filter((a) => a.status === "completed").length})
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-gray-400">
                  Chargement de vos rendez-vous...
                </p>
              </div>
            </div>
          ) : displayAppointments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-12 w-12 text-gray-500" />
              </div>
              <p className="text-lg font-medium text-white">
                {hasSearched ? "Aucun rendez-vous trouvé" : "Aucun rendez-vous"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {isAuthenticated
                  ? "Vous n'avez pas encore de rendez-vous"
                  : "Entrez votre email ou nom pour voir vos rendez-vous"}
              </p>
              {!isAuthenticated && !hasSearched && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Utilisez l'email ou le nom utilisé lors de la réservation
                </p>
              )}
              <Button asChild className="w-full gap-2">
                <Link to={`/booking/tenant/${tenantId || "tenant"}`}>
                  <Calendar className="h-4 w-4" />
                  Prendre rendez-vous
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayAppointments.map((appointment, index) => {
                const statusConfig = getStatusConfig(appointment.status);
                const statusColor = getStatusColor(appointment.status);
                const isPast =
                  new Date(appointment.appointment_date) < new Date();
                const isToday =
                  new Date(appointment.appointment_date).toDateString() ===
                  new Date().toDateString();

                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      group relative p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10
                      ${statusColor}
                      ${isToday ? "ring-2 ring-primary/30" : ""}
                      ${isPast && appointment.status !== "completed" && appointment.status !== "cancelled" ? "opacity-70" : ""}
                    `}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Rendez-vous</p>
                            <p className="font-mono font-bold text-lg text-primary">
                              #
                              {appointment.booking_number ||
                                appointment.id?.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-3 py-1 rounded-full border ${statusConfig.className}`}
                        >
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="font-bold text-lg text-white">
                            {appointment.service?.name || "Service"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {tenantName || appointment.tenant?.name || "Salon"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-gray-300">
                            <Calendar className="h-4 w-4 text-primary" />
                            {formatDate(appointment.appointment_date)}
                          </span>
                          <span className="flex items-center gap-1 text-gray-300">
                            <Clock className="h-4 w-4 text-primary" />
                            {appointment.appointment_time ||
                              "Horaire non défini"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {appointment.employee?.profile?.full_name && (
                            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full">
                              <User className="h-3 w-3" />
                              {appointment.employee.profile.full_name}
                            </span>
                          )}
                          {appointment.service?.duration && (
                            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" />
                              {appointment.service.duration} min
                            </span>
                          )}
                          {appointment.service?.price && (
                            <span className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                              {appointment.service.price.toLocaleString()} FCFA
                            </span>
                          )}
                          {isToday && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                              Aujourd'hui
                            </Badge>
                          )}
                          {isPast && appointment.status !== "completed" && (
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">
                              Passé
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-700/50">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appointment.client_name || "Client"}
                          </span>
                          {appointment.client_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {appointment.client_email}
                            </span>
                          )}
                          {appointment.client_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {appointment.client_phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        {appointment.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-gray-700 text-gray-300 hover:bg-gray-800"
                            onClick={() => {
                              toast.info("Fonctionnalité à venir");
                            }}
                          >
                            Annuler
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                          asChild
                        >
                          <Link to={`/booking/tenant/${tenantId || "tenant"}`}>
                            <CalendarPlus className="h-3 w-3 mr-1" />
                            Nouveau RDV
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4 mt-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Total: {displayAppointments.length} rendez-vous
              {appointments.length !== displayAppointments.length &&
                appointments.length > 0 &&
                ` (sur ${appointments.length})`}
              {statusFilter !== "all" && ` - Filtré: ${statusFilter}`}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// PAGE PRINCIPALE
// ============================================
export default function TenantShowcase() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [settings, setSettings] = useState(null); // ✅ Ajout des settings
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedService, setSelectedService] = useState("services");
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMyTicketsModalOpen, setIsMyTicketsModalOpen] = useState(false);
  const [isMyAppointmentsModalOpen, setIsMyAppointmentsModalOpen] =
    useState(false);
  const [fullViewPublication, setFullViewPublication] = useState(null);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);

  // ✅ Fonction pour construire les horaires depuis les settings
  const getHoursFromSettings = () => {
    if (!settings) return null;

    const days = [
      { key: "monday", label: "Lundi" },
      { key: "tuesday", label: "Mardi" },
      { key: "wednesday", label: "Mercredi" },
      { key: "thursday", label: "Jeudi" },
      { key: "friday", label: "Vendredi" },
      { key: "saturday", label: "Samedi" },
      { key: "sunday", label: "Dimanche" },
    ];

    const hours = {};
    days.forEach((day) => {
      const hourKey = `footer_hours_${day.key}`;
      if (settings[hourKey]) {
        hours[day.label] = settings[hourKey];
      }
    });

    return hours;
  };

  // ✅ Fonction pour récupérer les réseaux sociaux depuis les settings
  const getSocialLinksFromSettings = () => {
    if (!settings) return [];

    const socials = [
      { key: "facebook", icon: Facebook, url: settings.footer_social_facebook },
      {
        key: "instagram",
        icon: Instagram,
        url: settings.footer_social_instagram,
      },
      { key: "tiktok", icon: SiTiktok, url: settings.footer_social_tiktok },
    ];

    return socials.filter((s) => s.url && s.url.trim() !== "");
  };

  const handleViewFull = (publication) => {
    setFullViewPublication(publication);
    setIsFullViewOpen(true);
  };

  useEffect(() => {
    if (slug) {
      fetchTenantData();
    }
  }, [slug]);

  useEffect(() => {
    if (tenant) {
      document.title = `${tenant.name} - BeautyFlow`;
    }
  }, [tenant]);

  const fetchTenantData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer le tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .eq("subscription_status", "active")
        .single();

      if (tenantError) throw tenantError;
      if (!tenantData) {
        toast.error("Salon non trouvé");
        setLoading(false);
        return;
      }

      setTenant(tenantData);

      // 2. Récupérer les settings du tenant
      const { data: settingsData, error: settingsError } = await supabase
        .from("tenant_home_settings")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .maybeSingle();

      if (settingsError && settingsError.code !== "PGRST116") {
        console.error("❌ Erreur settings:", settingsError);
      }

      setSettings(settingsData || {});

      // 3. Récupérer les services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name");

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // 4. Récupérer les employés
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(
          `
          *,
          profile:profile_id (
            full_name,
            avatar,
            phone
          )
        `,
        )
        .eq("tenant_id", tenantData.id)
        .eq("is_active", true)
        .order("average_rating", { ascending: false });

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // 5. Récupérer les publications
      try {
        const { data: publicationsData, error: publicationsError } =
          await supabase
            .from("publications")
            .select("*")
            .eq("tenant_id", tenantData.id)
            .in("status", ["published", "scheduled"])
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (publicationsError) {
          console.warn("Error fetching publications:", publicationsError);
          setPublications([]);
        } else {
          const now = new Date();
          const filtered = (publicationsData || []).filter((pub) => {
            if (pub.status === "published") return true;
            if (pub.status === "scheduled" && pub.start_date) {
              return new Date(pub.start_date) <= now;
            }
            return false;
          });
          setPublications(filtered);
        }
      } catch (pubErr) {
        console.warn("Error in publications fetch:", pubErr);
        setPublications([]);
      }

      // 6. Récupérer les avis
      try {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select(
            `
            *,
            client:client_id (
              profile:profile_id (
                full_name,
                avatar
              )
            ),
            employee:employee_id (
              profile:profile_id (
                full_name
              )
            ),
            service:service_id (
              name
            )
          `,
          )
          .eq("tenant_id", tenantData.id)
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(20);

        if (
          reviewsError &&
          reviewsError.code !== "PGRST116" &&
          reviewsError.code !== "PGRST205"
        ) {
          console.error("Error fetching reviews:", reviewsError);
        }

        const { data: appointmentsReviews, error: appointmentsError } =
          await supabase
            .from("appointments")
            .select(
              `
            id,
            rating,
            review,
            created_at,
            client_name,
            client_phone,
            client_email,
            service:service_id (
              name
            ),
            employee:employee_id (
              id,
              profile:profile_id (
                full_name
              )
            )
          `,
            )
            .eq("tenant_id", tenantData.id)
            .not("rating", "is", null)
            .not("review", "is", null)
            .order("created_at", { ascending: false })
            .limit(20);

        if (appointmentsError && appointmentsError.code !== "PGRST116") {
          console.error(
            "Error fetching appointments reviews:",
            appointmentsError,
          );
        }

        const formattedReviews = (reviewsData || []).map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          client_name: review.client?.profile?.full_name || "Client",
          client_phone: null,
          client_email: null,
          is_anonymous: false,
          service_name: review.service?.name,
          employee_name: review.employee?.profile?.full_name,
          source: "review",
        }));

        const formattedAnonymousReviews = (appointmentsReviews || []).map(
          (review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.review,
            created_at: review.created_at,
            client_name: review.client_name || "Client anonyme",
            client_phone: review.client_phone || null,
            client_email: review.client_email || null,
            is_anonymous: true,
            service_name: review.service?.name,
            employee_name: review.employee?.profile?.full_name,
            source: "appointment",
          }),
        );

        const allReviews = [...formattedReviews, ...formattedAnonymousReviews]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20);

        setReviews(allReviews);
      } catch (reviewErr) {
        console.warn("Reviews table not found, continuing without reviews");
        setReviews([]);
      }

      // Dans fetchTenantData, modifiez la partie galerie :

      // 7. Récupérer la galerie
      try {
        const { data: galleryData, error: galleryError } = await supabase
          .from("gallery")
          .select("*")
          .eq("tenant_id", tenantData.id)
          .eq("is_approved", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (galleryError && galleryError.code !== "PGRST116") {
          console.error("Error fetching gallery:", galleryError);
        }

        if (
          galleryError?.code === "PGRST116" ||
          !galleryData ||
          galleryData.length === 0
        ) {
          // ✅ Utiliser les images des services avec le service_id attaché
          const serviceImages =
            servicesData
              ?.filter((s) => s.image_url)
              .map((s) => ({
                id: `service-${s.id}`,
                image_url: s.image_url,
                title: s.name,
                description: s.description,
                category: "Service",
                service_id: s.id, // ✅ Ajout du service_id pour lier au service
              })) || [];
          setGallery(serviceImages);
        } else {
          // ✅ S'assurer que les images de la galerie ont un service_id si possible
          const galleryWithService = galleryData.map((img) => {
            // Chercher si l'image correspond à un service
            const matchedService = servicesData?.find(
              (s) => s.image_url === img.image_url || s.id === img.service_id,
            );
            return {
              ...img,
              service_id: matchedService?.id || img.service_id || null,
            };
          });
          setGallery(galleryWithService);
        }
      } catch (galleryErr) {
        console.warn("Gallery table not found, using service images");
        const serviceImages =
          servicesData
            ?.filter((s) => s.image_url)
            .map((s) => ({
              id: `service-${s.id}`,
              image_url: s.image_url,
              title: s.name,
              description: s.description,
              category: "Service",
              service_id: s.id, // ✅ Ajout du service_id
            })) || [];
        setGallery(serviceImages);
      }
    } catch (error) {
      console.error("Error fetching tenant data:", error);
      toast.error("Erreur lors du chargement du salon");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />,
      );
    }
    const remainingStars = 5 - fullStars;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }
    return stars;
  };

  const averageRating =
    employees.length > 0
      ? employees.reduce((sum, e) => sum + (e.average_rating || 0), 0) /
        employees.length
      : 0;

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleNext = () => {
    const currentIndex = gallery.findIndex(
      (img) => img.id === selectedImage.id,
    );
    const nextIndex = (currentIndex + 1) % gallery.length;
    setSelectedImage(gallery[nextIndex]);
  };

  const handlePrev = () => {
    const currentIndex = gallery.findIndex(
      (img) => img.id === selectedImage.id,
    );
    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    setSelectedImage(gallery[prevIndex]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "Escape") setSelectedImage(null);
  };

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, gallery]);

  const handleTakeTicket = (service) => {
    setSelectedService(service);
    setIsTicketModalOpen(true);
  };

  const handleViewDetails = (service) => {
    setSelectedService(service);
    setIsDetailModalOpen(true);
  };

  // ✅ Construction des données pour la sidebar
  const hours = getHoursFromSettings();
  const socialLinks = getSocialLinksFromSettings();
  const hasSocialLinks = socialLinks.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-xl mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Salon non trouvé</h2>
            <p className="text-muted-foreground mt-2">
              Ce salon n'existe pas ou n'est plus actif.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{tenant ? `${tenant.name} - BeautyFlow` : "BeautyFlow"}</title>
        <meta
          name="description"
          content={
            tenant?.description ||
            `Découvrez ${tenant?.name || "ce salon"}, votre salon de beauté. Prenez rendez-vous en ligne.`
          }
        />
        <meta
          property="og:title"
          content={tenant ? `${tenant.name} - BeautyFlow` : "BeautyFlow"}
        />
        <meta
          property="og:description"
          content={
            tenant?.description ||
            `Découvrez ${tenant?.name || "ce salon"}, votre salon de beauté.`
          }
        />
        {tenant?.cover_image && (
          <meta property="og:image" content={tenant.cover_image} />
        )}
        {tenant?.logo_url && (
          <meta property="og:image" content={tenant.logo_url} />
        )}
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero Section */}
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary/20 to-accent/20 overflow-hidden">
          {tenant.cover_image ? (
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-no-repeat animate-cover-slide"
                style={{
                  backgroundImage: `url(${tenant.cover_image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              <Building2 className="h-24 w-24 text-primary/40" />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-background shadow-xl border-4 border-background overflow-hidden flex-shrink-0">
                  {tenant.logo_url ? (
                    <img
                      src={tenant.logo_url}
                      alt={tenant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">
                        {tenant.name?.charAt(0) || "S"}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-foreground">
                    {tenant.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Actif
                    </Badge>
                    <div className="flex items-center gap-1">
                      {renderStars(averageRating)}
                      <span className="text-sm font-medium ml-1">
                        {averageRating.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({reviews.length} avis)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 md:ml-auto flex-wrap">
                <Button asChild className="gap-2">
                  <Link to={`/booking/tenant/${tenant.slug}`}>
                    <Calendar className="h-4 w-4" />
                    Prendre RDV
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setIsMyTicketsModalOpen(true)}
                >
                  <ListChecks className="h-4 w-4" />
                  Mes tickets
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setIsMyAppointmentsModalOpen(true)}
                >
                  <Calendar className="h-4 w-4" />
                  Mes rendez-vous
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-8">
              {tenant.description && (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-3">À propos</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {tenant.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* SECTION PUBLICATIONS */}
              {publications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Card className="border-none shadow-sm overflow-hidden">
                    <div className="relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent" />
                      <CardContent className="p-6 relative">
                        <div className="flex items-center justify-between mb-6">
                          <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3"
                          >
                            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                              <Megaphone className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                Annonces & Publications
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                Restez informé des actualités du salon
                              </p>
                            </div>
                          </motion.div>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                          >
                            <Badge
                              variant="outline"
                              className="gap-1.5 px-3 py-1.5 border-primary/30"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              {publications.length} publication
                              {publications.length > 1 ? "s" : ""}
                            </Badge>
                          </motion.div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                          {publications.map((pub, index) => (
                            <PublicationCard
                              key={pub.id}
                              publication={pub}
                              index={index}
                              onViewFull={handleViewFull}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* SECTION ONGLETS */}
              <Tabs
                defaultValue="services"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList
                  className="grid w-full grid-cols-4"
                  onValueChange={setActiveTab}
                >
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="team">Équipe</TabsTrigger>
                  <TabsTrigger value="reviews">Avis</TabsTrigger>
                  <TabsTrigger
                    value="gallery"
                    className="flex items-center gap-1"
                  >
                    <Camera className="h-4 w-4" />
                    Galerie
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="services" className="mt-4">
                  {services.length === 0 ? (
                    <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed">
                      <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground">
                        Aucun service disponible pour le moment
                      </p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-6">
                      {services.map((service) => (
                        <ServiceCardWithTicket
                          key={service.id}
                          service={service}
                          onTakeTicket={handleTakeTicket}
                          onViewDetails={() => handleViewDetails(service)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="team" className="mt-4">
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                      <TeamSection
                        employees={employees}
                        tenantId={tenant?.id}
                        onRateEmployee={fetchTenantData}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-4">
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                      {reviews.length === 0 ? (
                        <div className="text-center py-12">
                          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                          <p className="text-muted-foreground">
                            Aucun avis pour le moment
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Soyez le premier à donner votre avis !
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reviews.map((review) => (
                            <div
                              key={review.id}
                              className="border-b last:border-0 pb-4 last:pb-0"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-bold">
                                    {review.client_name?.charAt(0) || "C"}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold">
                                          {review.client_name || "Client"}
                                        </p>
                                        {review.is_anonymous && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] text-muted-foreground"
                                          >
                                            👤 Anonyme
                                          </Badge>
                                        )}
                                        {review.client_phone && (
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {review.client_phone}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex">
                                          {renderStars(review.rating)}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(
                                            review.created_at,
                                          ).toLocaleDateString("fr-FR", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                    {review.service_name && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {review.service_name}
                                      </Badge>
                                    )}
                                  </div>
                                  {review.comment && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      "{review.comment}"
                                    </p>
                                  )}
                                  {review.employee_name && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      💆 Pour {review.employee_name}
                                    </p>
                                  )}
                                  {review.source === "appointment" && (
                                    <p className="text-xs text-muted-foreground/60 mt-1">
                                      📋 Avis laissé après un rendez-vous
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="gallery" className="mt-4">
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                      {gallery.length === 0 ? (
                        <div className="text-center py-12">
                          <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                          <p className="text-muted-foreground">
                            Aucune photo disponible
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Ce salon n'a pas encore ajouté de photos
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {gallery.map((image) => {
                            // ✅ Trouver le service correspondant à l'image de la galerie
                            const matchedService = services.find(
                              (s) =>
                                s.id === image.service_id ||
                                s.image_url === image.image_url,
                            );

                            return (
                              <GalleryImage
                                key={image.id}
                                src={image.image_url}
                                alt={image.title || "Photo du salon"}
                                onClick={() => handleImageClick(image)}
                                service={matchedService || null}
                                onTakeTicket={handleTakeTicket}
                              />
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* TicketQueue et suivi en temps réel */}
              {isAuthenticated &&
                currentUser?.profile?.role === "client" &&
                tenant && (
                  <>
                    <div id="ticket-queue" className="mt-4">
                      <TicketQueue tenantId={tenant.id} />
                    </div>
                    <TicketStatusTrackerWithNotifications
                      tenantId={tenant.id}
                      currentUser={currentUser}
                      isAuthenticated={isAuthenticated}
                    />
                  </>
                )}
            </div>

            {/* Sidebar droite - Informations pratiques depuis les settings */}
            <div className="space-y-6">
              <Card className="border-none shadow-sm sticky top-24">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Informations pratiques
                  </h3>

                  {/* Adresse - Priorité aux settings */}
                  {(settings?.footer_address || tenant.address) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Adresse</p>
                        <p className="text-sm text-muted-foreground">
                          {settings?.footer_address || tenant.address}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Téléphone - Priorité aux settings */}
                  {(settings?.footer_phone || tenant.phone) && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Téléphone</p>
                        <a
                          href={`tel:${settings?.footer_phone || tenant.phone}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {settings?.footer_phone || tenant.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Email - Priorité aux settings */}
                  {(settings?.footer_email || tenant.email) && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Email</p>
                        <a
                          href={`mailto:${settings?.footer_email || tenant.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {settings?.footer_email || tenant.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Horaires - Uniquement depuis les settings */}
                  {hours && Object.keys(hours).length > 0 && (
                    <div className="flex items-start gap-3 pt-2 border-t">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Horaires</p>
                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                          {Object.entries(hours).map(([day, time]) => (
                            <div key={day} className="flex justify-between">
                              <span>{day}</span>
                              <span
                                className={
                                  time === "Fermé" ? "text-red-500" : ""
                                }
                              >
                                {time}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Réseaux sociaux - Depuis les settings */}
                  {hasSocialLinks && settings?.footer_show_social !== false && (
                    <div className="pt-2 border-t">
                      <p className="font-medium mb-2">Suivez-nous</p>
                      <div className="flex flex-wrap gap-3">
                        {socialLinks.map(({ key, icon: Icon, url }) => (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 border rounded-lg hover:bg-muted/30 transition-colors"
                            aria-label={key}
                          >
                            <Icon className="h-4 w-4" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    <Button asChild className="w-full gap-2">
                      <Link to={`/booking/tenant/${tenant.slug}`}>
                        <Calendar className="h-4 w-4" />
                        Prendre rendez-vous
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setIsMyTicketsModalOpen(true)}
                    >
                      <ListChecks className="h-4 w-4" />
                      Mes tickets
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => setIsMyAppointmentsModalOpen(true)}
                    >
                      <Calendar className="h-4 w-4" />
                      Mes rendez-vous
                    </Button>
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <Link to={`/gift-cards/tenant/${tenant.slug}`}>
                        <Gift className="h-4 w-4" />
                        Offrir une carte cadeau
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Modal de visualisation plein écran pour les publications */}
        <FullViewModal
          publication={fullViewPublication}
          isOpen={isFullViewOpen}
          onClose={() => {
            setIsFullViewOpen(false);
            setFullViewPublication(null);
          }}
        />

        {/* Modal d'agrandissement des images de la galerie */}
        {/* Modal d'agrandissement des images de la galerie */}
        <Dialog
          open={!!selectedImage}
          onOpenChange={() => setSelectedImage(null)}
        >
          <DialogContent className="max-w-6xl p-0 bg-black/95 border-none max-h-[95vh] overflow-hidden">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {selectedImage && (
              <div className="relative w-full h-full flex flex-col">
                {/* Image */}
                <div className="relative flex-1 flex items-center justify-center min-h-[60vh] max-h-[75vh]">
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.title || "Photo du salon"}
                    className="w-full h-full object-contain"
                  />

                  {/* Navigation */}
                  {gallery.length > 1 && (
                    <>
                      <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-10 backdrop-blur-sm"
                        aria-label="Précédent"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-10 backdrop-blur-sm"
                        aria-label="Suivant"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}

                  {/* Indicateur de progression */}
                  {gallery.length > 1 && (
                    <div className="absolute top-4 left-4 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-white text-xs z-10">
                      {gallery.findIndex((img) => img.id === selectedImage.id) +
                        1}{" "}
                      / {gallery.length}
                    </div>
                  )}
                </div>

                {/* ✅ Footer avec infos et bouton Prendre ticket */}
                <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 pt-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {selectedImage.title && (
                        <h3 className="text-xl font-bold text-white truncate">
                          {selectedImage.title}
                        </h3>
                      )}
                      {selectedImage.description && (
                        <p className="text-sm text-white/60 line-clamp-2">
                          {selectedImage.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {selectedImage.category && (
                          <Badge className="bg-white/20 text-white border-none text-xs">
                            {selectedImage.category}
                          </Badge>
                        )}
                        {selectedImage.service_id && (
                          <Badge className="bg-primary/30 text-primary-foreground border-none text-xs">
                            <Ticket className="h-3 w-3 mr-1" />
                            Service disponible
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* ✅ Bouton Prendre ticket */}
                    {(() => {
                      const matchedService = services.find(
                        (s) =>
                          s.id === selectedImage.service_id ||
                          s.image_url === selectedImage.image_url,
                      );
                      return (
                        <Button
                          className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg px-6 py-2.5 h-auto min-w-[140px]"
                          onClick={() => {
                            setSelectedImage(null);
                            if (matchedService) {
                              handleTakeTicket(matchedService);
                            } else if (services.length > 0) {
                              handleTakeTicket(services[0]);
                            } else {
                              toast.info("Aucun service disponible");
                            }
                          }}
                        >
                          <Ticket className="h-4 w-4" />
                          {matchedService
                            ? `Ticket ${matchedService.name}`
                            : "Prendre ticket"}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal pour prendre un ticket */}
        <TakeTicketModal
          service={selectedService}
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setSelectedService(null);
          }}
          tenantId={tenant?.id}
          tenantName={tenant?.name}
        />

        {/* Modal Mes tickets */}
        <MyTicketsModal
          isOpen={isMyTicketsModalOpen}
          onClose={() => setIsMyTicketsModalOpen(false)}
          tenantId={tenant?.id}
        />

        {/* Modal Mes rendez-vous */}
        <MyAppointmentsModal
          isOpen={isMyAppointmentsModalOpen}
          onClose={() => setIsMyAppointmentsModalOpen(false)}
          tenantId={tenant?.id}
          tenantName={tenant?.name}
        />

        <Footer />
      </div>
    </>
  );
}

// ========== COMPOSANT : TEAM SECTION ==========
// ========== COMPOSANT : TEAM SECTION (VERSION MOBILE-FIRST) ==========
const TeamSection = ({ employees, tenantId, onRateEmployee }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeReviews, setEmployeeReviews] = useState({});
  const [loadingReviews, setLoadingReviews] = useState({});
  const [reviewCounts, setReviewCounts] = useState({});

  const loadEmployeeReviews = async (employeeId) => {
    if (loadingReviews[employeeId]) return;

    setLoadingReviews((prev) => ({ ...prev, [employeeId]: true }));
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          client:client_id (
            profile:profile_id (
              full_name,
              avatar
            )
          )
        `,
        )
        .eq("employee_id", employeeId)
        .eq("tenant_id", tenantId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEmployeeReviews((prev) => ({
        ...prev,
        [employeeId]: data || [],
      }));

      setReviewCounts((prev) => ({
        ...prev,
        [employeeId]: data?.length || 0,
      }));
    } catch (error) {
      console.error("Error loading employee reviews:", error);
      toast.error("Erreur lors du chargement des avis");
    } finally {
      setLoadingReviews((prev) => ({ ...prev, [employeeId]: false }));
    }
  };

  useEffect(() => {
    if (employees.length > 0 && tenantId) {
      employees.forEach((emp) => {
        loadEmployeeReviews(emp.id);
      });
    }
  }, [employees, tenantId]);

  const handleRateClick = (employee) => {
    setSelectedEmployee(employee);
    setIsRateModalOpen(true);
  };

  const toggleExpand = (employeeId) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null);
    } else {
      setExpandedEmployee(employeeId);
      loadEmployeeReviews(employeeId);
    }
  };

  const renderStars = (rating, size = "h-4 w-4") => {
    const fullStars = Math.floor(rating || 0);
    const emptyStars = 5 - fullStars;

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${size} fill-yellow-400 text-yellow-400`}
          />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`${size} text-gray-300 dark:text-gray-600`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getReviewCount = (employeeId) => {
    return reviewCounts[employeeId] || 0;
  };

  // ========== MODAL DE NOTATION (VERSION MOBILE-FIRST) ==========
  const RateEmployeeModal = ({
    employee,
    isOpen,
    onClose,
    tenantId,
    onSuccess,
  }) => {
    const { currentUser, isAuthenticated } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [client, setClient] = useState(null);

    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);

    useEffect(() => {
      const fetchClient = async () => {
        if (!isAuthenticated || !currentUser?.profile?.id) return;

        try {
          const { data, error } = await supabase
            .from("clients")
            .select("id")
            .eq("profile_id", currentUser.profile.id)
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (error) throw error;
          setClient(data);
        } catch (error) {
          console.error("Error fetching client:", error);
        }
      };

      if (isOpen) {
        fetchClient();
        setRating(0);
        setHoverRating(0);
        setComment("");
        setGuestName("");
        setGuestPhone("");
        setIsAnonymous(false);
      }
    }, [isOpen, currentUser, tenantId]);

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (rating === 0) {
        toast.error("Veuillez sélectionner une note");
        return;
      }

      setLoading(true);
      try {
        let clientId = null;
        let clientName = "";

        if (isAuthenticated && client) {
          clientId = client.id;
          clientName = currentUser?.profile?.full_name || "Client";
        } else if (guestName.trim()) {
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("name", guestName.trim())
            .maybeSingle();

          if (existingClient) {
            clientId = existingClient.id;
          } else {
            const { data: newClient, error: createError } = await supabase
              .from("clients")
              .insert({
                tenant_id: tenantId,
                name: guestName.trim(),
                phone: guestPhone || null,
                profile_id: null,
                loyalty_points: 0,
                total_visits: 0,
                total_spent: 0,
              })
              .select()
              .single();

            if (createError) throw createError;
            clientId = newClient.id;
          }
          clientName = guestName.trim();
        } else {
          toast.error("Veuillez entrer votre nom pour laisser un avis");
          return;
        }

        if (!clientId) {
          throw new Error("Impossible de créer ou trouver le client");
        }

        const { data: existingReview, error: checkError } = await supabase
          .from("reviews")
          .select("id")
          .eq("employee_id", employee.id)
          .eq("client_id", clientId)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") throw checkError;

        if (existingReview) {
          const { error } = await supabase
            .from("reviews")
            .update({
              rating: rating,
              comment: comment.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingReview.id);

          if (error) throw error;
          toast.success("Votre avis a été mis à jour !");
        } else {
          const { error } = await supabase.from("reviews").insert({
            employee_id: employee.id,
            client_id: clientId,
            tenant_id: tenantId,
            rating: rating,
            comment: comment.trim() || null,
            is_approved: true,
          });

          if (error) throw error;
          toast.success("Merci pour votre évaluation !");
        }

        await updateEmployeeAverageRating(employee.id, tenantId);

        onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Error submitting review:", error);
        toast.error("Erreur lors de l'envoi de l'avis");
      } finally {
        setLoading(false);
      }
    };

    const updateEmployeeAverageRating = async (employeeId, tenantId) => {
      try {
        const { data: reviews, error } = await supabase
          .from("reviews")
          .select("rating")
          .eq("employee_id", employeeId)
          .eq("tenant_id", tenantId)
          .eq("is_approved", true);

        if (error) throw error;

        if (reviews && reviews.length > 0) {
          const total = reviews.reduce((sum, r) => sum + r.rating, 0);
          const average = total / reviews.length;

          try {
            await supabase
              .from("employees")
              .update({
                average_rating: average,
              })
              .eq("id", employeeId);
          } catch (updateError) {
            console.warn(
              "Could not update total_reviews column, updating only average_rating",
            );
            await supabase
              .from("employees")
              .update({
                average_rating: average,
              })
              .eq("id", employeeId);
          }
        }
      } catch (error) {
        console.error("Error updating employee rating:", error);
      }
    };

    const renderStars = () => {
      return (
        <div className="flex items-center justify-center gap-1 sm:gap-2 py-4 flex-wrap">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="transition-transform hover:scale-110 focus:outline-none touch-manipulation"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`
                  h-10 w-10 sm:h-12 sm:w-12 transition-colors
                  ${star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400 drop-shadow-lg"
                    : "text-gray-300 dark:text-gray-600"
                  }
                `}
              />
            </button>
          ))}
        </div>
      );
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md w-full mx-auto p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 flex-shrink-0" />
              <span className="truncate">Noter {employee?.profile?.full_name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Partagez votre expérience avec cet employé
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-2 sm:py-4">
            {/* Informations employé */}
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-base sm:text-lg font-bold text-primary">
                  {employee?.profile?.full_name?.charAt(0) || "E"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {employee?.profile?.full_name}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {employee?.position || "Employé"}
                </p>
              </div>
            </div>

            {/* Étoiles */}
            {renderStars()}

            {/* Message d'état */}
            <p className="text-center text-xs sm:text-sm text-muted-foreground min-h-[20px]">
              {rating === 0 && "👆 Cliquez sur une étoile pour noter"}
              {rating === 1 && "🌟 Pas satisfait"}
              {rating === 2 && "😕 Moyen"}
              {rating === 3 && "👍 Bien"}
              {rating === 4 && "🌟 Très bien"}
              {rating === 5 && "⭐ Excellent !"}
            </p>

            {/* Commentaire */}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium">
                Votre commentaire (optionnel)
              </Label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Décrivez votre expérience..."
                className="w-full min-h-[80px] sm:min-h-[100px] rounded-xl border border-gray-300 dark:border-gray-700 bg-background px-3 sm:px-4 py-2 sm:py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {comment.length}/500
              </p>
            </div>

            {/* Formulaire invité */}
            {!isAuthenticated && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
                  👤 Vous n'êtes pas connecté - Laisser un avis anonyme
                </p>
                <div>
                  <Label htmlFor="guestName" className="text-sm font-medium">
                    Votre nom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Entrez votre nom"
                    className="mt-1"
                    required={!isAuthenticated}
                  />
                </div>
                <div>
                  <Label htmlFor="guestPhone" className="text-sm font-medium">
                    Téléphone (optionnel)
                  </Label>
                  <Input
                    id="guestPhone"
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Votre numéro de téléphone"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Utilisateur connecté */}
            {isAuthenticated && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-xs sm:text-sm text-green-700 dark:text-green-400">
                <User className="h-4 w-4 inline mr-2" />
                Connecté en tant que {currentUser?.profile?.full_name}
              </div>
            )}

            {/* Boutons d'action - MOBILE FIRST */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  rating === 0 ||
                  (!isAuthenticated && !guestName.trim())
                }
                className="w-full sm:w-auto gap-2 order-1 sm:order-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
                {loading ? "Envoi..." : "Envoyer l'avis"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-4">
      {employees.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Aucun employé disponible
        </p>
      ) : (
        employees.map((employee) => {
          const reviews = employeeReviews[employee.id] || [];
          const isExpanded = expandedEmployee === employee.id;
          const isLoading = loadingReviews[employee.id];
          const reviewCount = getReviewCount(employee.id);

          return (
            <div
              key={employee.id}
              className="border rounded-xl overflow-hidden bg-card hover:shadow-md transition-all"
            >
              {/* Carte employé - MOBILE FIRST */}
              <div
                className="p-3 sm:p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => toggleExpand(employee.id)}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {employee.profile?.full_name?.charAt(0) || "E"}
                    </span>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <p className="font-semibold text-sm sm:text-lg truncate">
                        {employee.profile?.full_name}
                      </p>
                      {employee.position && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
                          {employee.position}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-1">
                      <div className="flex items-center gap-0.5">
                        {renderStars(employee.average_rating || 0, "h-3 w-3 sm:h-4 sm:w-4")}
                        <span className="text-xs sm:text-sm font-medium ml-0.5">
                          {(employee.average_rating || 0).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        ({reviewCount} avis)
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                        • {employee.total_clients_served || 0} clients
                      </span>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRateClick(employee);
                      }}
                    >
                      <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-white" />
                      <span className="hidden xs:inline">Noter</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground p-1 sm:p-2 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(employee.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section développée */}
              {isExpanded && (
                <div className="border-t p-3 sm:p-4 space-y-3 sm:space-y-4 bg-muted/5">
                  {employee.bio && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {employee.bio}
                    </p>
                  )}

                  {employee.skills && employee.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {employee.skills.map((skill, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px] sm:text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Avis clients */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="font-medium text-xs sm:text-sm flex items-center gap-2">
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        Avis clients ({reviews.length})
                      </h4>
                      {reviews.length === 0 && !isLoading && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          Aucun avis pour le moment
                        </span>
                      )}
                    </div>

                    {isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : reviews.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-60 overflow-y-auto pr-1 sm:pr-2">
                        {reviews.map((review) => (
                          <div
                            key={review.id}
                            className="bg-background rounded-lg p-2 sm:p-3 border"
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-bold">
                                  {review.client?.profile?.full_name?.charAt(0) || "C"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1">
                                  <span className="font-medium text-xs sm:text-sm truncate">
                                    {review.client?.profile?.full_name ||
                                      review.client?.name ||
                                      "Client"}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                                    {formatDate(review.created_at)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5 my-0.5 sm:my-1">
                                  {renderStars(review.rating, "h-2.5 w-2.5 sm:h-3 sm:w-3")}
                                </div>
                                {review.comment && (
                                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                                    {review.comment}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center py-2">
                        Cet employé n'a pas encore reçu d'avis.
                        <br />
                        <span className="text-[10px] sm:text-xs">
                          Soyez le premier à le noter !
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <RateEmployeeModal
        employee={selectedEmployee}
        isOpen={isRateModalOpen}
        onClose={() => {
          setIsRateModalOpen(false);
          setSelectedEmployee(null);
        }}
        tenantId={tenantId}
        onSuccess={() => {
          onRateEmployee?.();
          if (selectedEmployee) {
            loadEmployeeReviews(selectedEmployee.id);
          }
        }}
      />
    </div>
  );
};
