// /src/pages/public/PublicDisplayPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, Bell, Clock, MapPin, 
  ChevronLeft, ChevronRight, Package, Loader2, Tv,
  Megaphone, Gift, TrendingUp, GraduationCap, Calendar as CalendarIcon,
  Star, Sparkles, Play, Volume2, VolumeX, Volume1, Volume
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// ✅ CATÉGORIES AVEC LABELS FRANÇAIS
// ============================================
const CATEGORY_MAPPING = {
  'Hair Care': { label: 'Soins Cheveux', icon: '💇' },
  'Skincare': { label: 'Soins Visage', icon: '🧴' },
  'Makeup': { label: 'Maquillage', icon: '💄' },
  'Accessories': { label: 'Accessoires', icon: '💍' },
  'Nail Care': { label: 'Soins Ongles', icon: '💅' },
  'Body Care': { label: 'Soins Corps', icon: '🧖' },
  'Other': { label: 'Autre', icon: '📦' },
};

// ============================================
// ✅ HELPERS POUR LES PUBLICATIONS
// ============================================
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
    event: CalendarIcon,
  };
  const Icon = icons[type] || Megaphone;
  return Icon;
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

const getCategoryLabel = (value) => {
  if (!value) return 'Non défini';
  return CATEGORY_MAPPING[value]?.label || value;
};

const getCategoryIcon = (value) => {
  if (!value) return '📦';
  return CATEGORY_MAPPING[value]?.icon || '📦';
};

// ============================================
// ✅ COMPOSANT : LECTEUR VIDÉO AVEC SON
// ============================================
const VideoPlayer = ({ src, title, autoPlay = true, muted = false, onEnded, onPlay, onPause }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(1);
  const playAttemptRef = useRef(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.preload = 'auto';
      videoRef.current.load();
    }
  }, [src]);

  useEffect(() => {
    if (videoRef.current && autoPlay && isReady) {
      const playVideo = async () => {
        try {
          if (playAttemptRef.current) return;
          playAttemptRef.current = true;
          
          if (videoRef.current) {
            videoRef.current.volume = 1;
            videoRef.current.muted = false;
          }
          
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
            setIsLoading(false);
            setIsMuted(false);
          }
        } catch (err) {
          console.log('⚠️ Auto-play bloqué:', err);
          setIsLoading(false);
          try {
            if (videoRef.current) {
              videoRef.current.muted = true;
              await videoRef.current.play();
              setIsPlaying(true);
              setIsLoading(false);
              setIsMuted(true);
            }
          } catch (e) {
            console.log('⚠️ Auto-play même en muet bloqué');
          }
        }
      };
      
      setTimeout(playVideo, 200);
    }
  }, [autoPlay, isReady, src]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (video.duration > 0) {
        const progress = (video.currentTime / video.duration) * 100;
        setProgress(progress);
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
    if (onPlay) onPlay();
  };
  
  const handlePause = () => {
    setIsPlaying(false);
    if (onPause) onPause();
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const handleLoadedData = () => {
    setIsReady(true);
    setIsLoading(false);
  };

  const handleCanPlay = () => {
    setIsReady(true);
    setIsLoading(false);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handleCanPlayThrough = () => {
    setIsLoading(false);
  };

  const handleError = (e) => {
    console.error('❌ Erreur vidéo:', e);
    setError('Impossible de charger la vidéo');
    setIsLoading(false);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (!newMutedState) {
        videoRef.current.volume = 1;
        setVolume(1);
      }
    }
  };

  const handleVolumeChange = (e) => {
    if (videoRef.current) {
      const newVolume = parseFloat(e.target.value);
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const isYouTube = src?.includes('youtube.com') || src?.includes('youtu.be');
  const getYouTubeEmbedUrl = (url) => {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0&mute=0&controls=0&modestbranding=1&showinfo=0&iv_load_policy=3&playsinline=1&loop=1&playlist=${match[1]}&enablejsapi=1`;
    }
    return null;
  };

  const youtubeEmbedUrl = isYouTube ? getYouTubeEmbedUrl(src) : null;

  if (isYouTube && youtubeEmbedUrl) {
    return (
      <div className="relative w-full h-full bg-black">
        <iframe
          src={youtubeEmbedUrl}
          title={title || 'Vidéo'}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white/60 text-xs">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            LIVE
          </span>
          <span>YouTube</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-white animate-spin mx-auto" />
            <p className="text-white/60 text-xs mt-2">Chargement...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-center text-white">
            <Play className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 text-red-400" />
            <p className="text-xs sm:text-sm">{error}</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        preload="auto"
        loop={false}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onLoadedData={handleLoadedData}
        onCanPlay={handleCanPlay}
        onCanPlayThrough={handleCanPlayThrough}
        onWaiting={handleWaiting}
        onError={handleError}
      />
      
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/20">
        <button
          onClick={togglePlay}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110"
        >
          {isPlaying ? (
            <div className="w-0 h-0 border-l-[8px] sm:border-l-[12px] border-l-white border-r-[8px] sm:border-r-[12px] border-r-transparent border-t-[14px] sm:border-t-[20px] border-t-transparent border-b-[14px] sm:border-b-[20px] border-b-transparent ml-1"></div>
          ) : (
            <Play className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          )}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white/60 text-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={togglePlay}
            className="text-white hover:text-white/80 transition-colors"
          >
            {isPlaying ? (
              <div className="w-0 h-0 border-l-[4px] sm:border-l-[6px] border-l-white border-r-[4px] sm:border-r-[6px] border-r-transparent border-t-[7px] sm:border-t-[10px] border-t-transparent border-b-[7px] sm:border-b-[10px] border-b-transparent ml-0.5"></div>
            ) : (
              <Play className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </button>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggleMute}
              className="text-white hover:text-white/80 transition-colors"
              title={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted ? (
                <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-12 sm:w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              title="Volume"
            />
          </div>
          
          <span className="text-white/40 hidden sm:inline">
            {Math.floor(progress)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-white/40 hidden sm:inline">HD</span>
          {!isMuted && (
            <span className="text-white/40 hidden sm:inline">🔊</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// ✅ COMPOSANT : ANNONCE TICKET (OVERLAY)
// ============================================
const TicketAnnouncementOverlay = ({ ticket, employee, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Animation en 3 étapes
    const timer1 = setTimeout(() => setCurrentStep(1), 500);
    const timer2 = setTimeout(() => setCurrentStep(2), 1500);
    const timer3 = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (!visible || !ticket) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="relative max-w-4xl w-full mx-4">
        {/* Fond avec effet de lumière */}
        <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-pink-500/20 to-purple-500/20 blur-3xl animate-pulse"></div>
        
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
          
          {/* Animation de scan */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent"
                 style={{
                   animation: 'scanMove 2s linear infinite',
                   transform: 'translateY(-100%)'
                 }}>
            </div>
          </div>

          {/* Icône de notification */}
          <div className="absolute top-4 right-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Bell className="h-6 w-6 text-emerald-400 animate-bounce" />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/20"></div>
            </div>
          </div>

          <div className="relative z-10 text-center">
            {/* Titre */}
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-4xl font-bold text-white/80 mb-2"
            >
              📢 NOUVEL APPEL
            </motion.h2>

            <div className="my-4 sm:my-6">
              {/* Numéro du ticket en grand */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  textShadow: [
                    '0 0 20px rgba(16, 185, 129, 0.3)',
                    '0 0 40px rgba(16, 185, 129, 0.6)',
                    '0 0 20px rgba(16, 185, 129, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl sm:text-8xl md:text-9xl font-extrabold text-emerald-400 tracking-tight"
                style={{ fontFamily: 'monospace' }}
              >
                #{String(ticket.ticket_number).padStart(2, '0')}
              </motion.div>

              <p className="text-sm sm:text-base text-white/60 mt-2 font-mono">
                TICKET NUMÉRO
              </p>
            </div>

            {/* Ligne de séparation */}
            <div className="flex items-center justify-center gap-4 my-3 sm:my-4">
              <div className="h-0.5 w-12 sm:w-24 bg-gradient-to-r from-transparent to-emerald-500/50"></div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Volume className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">APPEL EN COURS</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0s' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                </div>
              </div>
              <div className="h-0.5 w-12 sm:w-24 bg-gradient-to-l from-transparent to-emerald-500/50"></div>
            </div>

            {/* Informations supplémentaires */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-white/70 mt-3 sm:mt-4"
            >
              {employee && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-sm">
                    Place <span className="font-bold text-white">{employee.employee_number || '?'}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                <Clock className="h-3 w-3 text-emerald-400" />
                <span className="text-xs sm:text-sm">
                  {format(new Date(), 'HH:mm:ss')}
                </span>
              </div>
            </motion.div>

            {/* Message d'instruction */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-4 sm:mt-6 p-3 sm:p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"
            >
              <p className="text-base sm:text-xl font-medium text-emerald-300">
                {employee ? (
                  <>📋 Veuillez vous présenter à la <span className="font-bold text-white">place {employee.employee_number || '?'}</span></>
                ) : (
                  <>📋 Veuillez vous présenter à votre place</>
                )}
              </p>
            </motion.div>

            {/* Barre de progression de l'annonce */}
            <div className="mt-4 sm:mt-6 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: "linear" }}
                className="h-full bg-gradient-to-r from-emerald-500 to-pink-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// ✅ COMPOSANT PRINCIPAL
// ============================================
export default function PublicDisplayPage() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [publications, setPublications] = useState([]);
  const [displayItems, setDisplayItems] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [calledTicket, setCalledTicket] = useState(null);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);
  const slideIntervalRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementTicket, setAnnouncementTicket] = useState(null);
  const [announcementEmployee, setAnnouncementEmployee] = useState(null);

  // Récupérer les infos du tenant
  useEffect(() => {
    const fetchTenantInfo = async () => {
      const id = currentUser?.profile?.tenant_id;
      if (!id) {
        const params = new URLSearchParams(window.location.search);
        const tenantParam = params.get('tenant');
        if (tenantParam) {
          try {
            const { data, error } = await supabase
              .from('tenants')
              .select('id, name, logo_url, address, phone, email')
              .eq('id', tenantParam)
              .single();
            if (!error && data) {
              setTenantInfo(data);
              setTenantId(data.id);
            }
          } catch (e) {
            console.error('Error fetching tenant:', e);
          }
        }
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, logo_url, address, phone, email')
          .eq('id', id)
          .single();
        
        if (!error && data) {
          setTenantInfo(data);
          setTenantId(data.id);
        }
      } catch (error) {
        console.error('Error fetching tenant info:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenantInfo();
  }, [currentUser]);

  // Récupérer les produits actifs
  const fetchProducts = useCallback(async () => {
    const id = tenantId || currentUser?.profile?.tenant_id;
    if (!id) {
      setProducts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [tenantId, currentUser]);

  // Récupérer les publications actives
  const fetchPublications = useCallback(async () => {
    const id = tenantId || currentUser?.profile?.tenant_id;
    if (!id) {
      setPublications([]);
      return;
    }

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .eq('tenant_id', id)
        .in('status', ['published', 'scheduled'])
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data) {
        const filtered = data.filter(pub => {
          if (pub.status === 'published') return true;
          if (pub.status === 'scheduled' && pub.start_date) {
            return new Date(pub.start_date) <= new Date();
          }
          return false;
        });
        setPublications(filtered);
      }
    } catch (error) {
      console.error('Error fetching publications:', error);
    }
  }, [tenantId, currentUser]);

  // Vérifier si c'est une vidéo
  const isVideoPublication = (pub) => {
    return pub.video_url || 
           pub.link_url?.includes('youtube.com') || 
           pub.link_url?.includes('youtu.be') ||
           pub.link_url?.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i);
  };

  const getVideoSource = (pub) => {
    if (pub.video_url) return pub.video_url;
    if (pub.link_url) return pub.link_url;
    return null;
  };

  // Fusionner produits et publications pour le diaporama
  const buildDisplayItems = useCallback(() => {
    const items = [];
    
    products.forEach(product => {
      items.push({
        type: 'product',
        id: product.id,
        title: product.name,
        description: product.description,
        image_url: product.image_url,
        price: product.selling_price,
        category: product.category,
        data: product
      });
    });

    publications.forEach(pub => {
      const isVideo = isVideoPublication(pub);
      const videoSrc = getVideoSource(pub);
      
      items.push({
        type: 'publication',
        id: pub.id,
        title: pub.title,
        description: pub.description,
        content: pub.content,
        image_url: pub.image_url,
        video_url: pub.video_url,
        link_url: pub.link_url,
        pub_type: pub.type,
        is_highlighted: pub.is_highlighted,
        is_video: !!isVideo,
        video_src: videoSrc,
        data: pub
      });
    });

    const highlighted = items.filter(item => item.is_highlighted);
    const others = items.filter(item => !item.is_highlighted);
    
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }

    const finalItems = [...highlighted, ...others];
    setDisplayItems(finalItems);
    
    if (finalItems.length > 0) {
      setCurrentSlide(0);
    }
  }, [products, publications]);

  // Récupérer le ticket appelé avec l'employé
  const fetchCalledTicket = useCallback(async () => {
    const id = tenantId || currentUser?.profile?.tenant_id;
    if (!id) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          ticket_number,
          status,
          assigned_employee_id,
          called_at,
          client_name
        `)
        .eq('tenant_id', id)
        .eq('date', today)
        .eq('status', 'called')
        .order('called_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const ticket = data[0];
        setCalledTicket(ticket);
        
        // Récupérer l'employé assigné
        if (ticket.assigned_employee_id) {
          const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('id, employee_number, profile:profile_id (full_name)')
            .eq('id', ticket.assigned_employee_id)
            .single();
          
          if (!empError && empData) {
            setEmployeeInfo(empData);
            
            // ✅ Déclencher l'overlay d'annonce
            setAnnouncementTicket(ticket);
            setAnnouncementEmployee(empData);
            setShowAnnouncement(true);
          }
        } else {
          setEmployeeInfo(null);
          // ✅ Déclencher l'overlay même sans employé
          setAnnouncementTicket(ticket);
          setAnnouncementEmployee(null);
          setShowAnnouncement(true);
        }
      } else {
        setCalledTicket(null);
        setEmployeeInfo(null);
      }
    } catch (error) {
      console.error('Error fetching called ticket:', error);
    }
  }, [tenantId, currentUser]);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      if (tenantId) {
        await Promise.all([fetchProducts(), fetchPublications(), fetchCalledTicket()]);
        setLoading(false);
      }
    };
    loadData();
  }, [tenantId, fetchProducts, fetchPublications, fetchCalledTicket]);

  // Construire les items du diaporama
  useEffect(() => {
    if (products.length > 0 || publications.length > 0) {
      buildDisplayItems();
    }
  }, [products, publications, buildDisplayItems]);

  // Souscription aux changements en temps réel
  useEffect(() => {
    const id = tenantId || currentUser?.profile?.tenant_id;
    if (!id) return;

    const ticketSubscription = supabase
      .channel('public_tickets_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tickets', filter: `tenant_id=eq.${id}` },
        () => {
          fetchCalledTicket();
        }
      )
      .subscribe();

    const productSubscription = supabase
      .channel('public_products_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${id}` },
        () => fetchProducts()
      )
      .subscribe();

    const publicationSubscription = supabase
      .channel('public_publications_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'publications', filter: `tenant_id=eq.${id}` },
        () => fetchPublications()
      )
      .subscribe();

    return () => {
      ticketSubscription.unsubscribe();
      productSubscription.unsubscribe();
      publicationSubscription.unsubscribe();
    };
  }, [tenantId, currentUser, fetchProducts, fetchPublications, fetchCalledTicket]);

  // Auto-slide avec pause si vidéo
  useEffect(() => {
    if (displayItems.length <= 1) return;

    const startInterval = () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
      slideIntervalRef.current = setInterval(() => {
        if (!isVideoPlaying && !showAnnouncement) {
          setCurrentSlide((prev) => (prev + 1) % displayItems.length);
        }
      }, 8000);
    };

    startInterval();

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, [displayItems.length, isVideoPlaying, showAnnouncement]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = setInterval(() => {
        if (!isVideoPlaying && !showAnnouncement) {
          setCurrentSlide((prev) => (prev + 1) % displayItems.length);
        }
      }, 8000);
    }
  };

  const goToPrevSlide = () => {
    goToSlide((currentSlide - 1 + displayItems.length) % displayItems.length);
  };

  const goToNextSlide = () => {
    goToSlide((currentSlide + 1) % displayItems.length);
  };

  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
    setTimeout(() => {
      if (displayItems.length > 1 && !showAnnouncement) {
        setCurrentSlide((prev) => (prev + 1) % displayItems.length);
      }
    }, 1500);
  };

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
  };

  const handleVideoPause = () => {
    setIsVideoPlaying(false);
  };

  const handleAnnouncementComplete = () => {
    setShowAnnouncement(false);
    setAnnouncementTicket(null);
    setAnnouncementEmployee(null);
  };

  // Rendre le contenu du slide
  const renderSlideContent = (item) => {
    if (!item) return null;

    if (item.type === 'product') {
      return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="h-full flex flex-col"
        >
          <div className="relative flex-1 min-h-[150px] sm:min-h-[250px] bg-gray-100 flex items-center justify-center">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                <Package className="h-12 w-12 sm:h-24 sm:w-24 text-pink-300" />
              </div>
            )}
            
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-pink-500 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full font-bold shadow-lg text-xs sm:text-base">
              {item.price?.toLocaleString()} FCFA
            </div>
          </div>
          
          <div className="p-2 sm:p-4 bg-white">
            <h2 className="text-sm sm:text-xl font-bold text-gray-800 line-clamp-1">
              {item.title}
            </h2>
            <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1 flex items-center gap-0.5 sm:gap-1">
              <span>{getCategoryIcon(item.category)}</span>
              {getCategoryLabel(item.category)}
            </p>
            {item.description && (
              <p className="text-gray-600 mt-1 sm:mt-2 text-[10px] sm:text-sm line-clamp-1 sm:line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        </motion.div>
      );
    }

    if (item.type === 'publication') {
      const pubType = item.pub_type || 'announcement';
      const TypeIcon = getTypeIcon(pubType);
      const typeColor = getTypeColor(pubType);
      const isVideo = item.is_video && item.video_src;

      return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="h-full flex flex-col"
        >
          <div className="relative flex-1 min-h-[150px] sm:min-h-[250px] bg-gray-100 flex items-center justify-center">
            {isVideo && item.video_src ? (
              <VideoPlayer
                src={item.video_src}
                title={item.title}
                autoPlay={true}
                muted={false}
                onEnded={handleVideoEnded}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
              />
            ) : item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${typeColor} flex items-center justify-center`}>
                <TypeIcon className="h-12 w-12 sm:h-24 sm:w-24 text-white/60" />
              </div>
            )}
            
            <div className={`absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/60 backdrop-blur-sm text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full font-bold shadow-lg text-[8px] sm:text-xs flex items-center gap-1 z-10`}>
              <TypeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              {getTypeLabel(pubType)}
            </div>

            {item.is_highlighted && (
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                <div className="bg-amber-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold shadow-lg text-[8px] sm:text-xs flex items-center gap-1">
                  <Star className="h-2 w-2 sm:h-3 sm:w-3 fill-white" />
                  <span className="hidden sm:inline">Mis en avant</span>
                  <span className="sm:hidden">⭐</span>
                </div>
              </div>
            )}

            {isVideo && (
              <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-[8px] sm:text-xs text-white flex items-center gap-1">
                <Play className="h-3 w-3" />
                Vidéo 🔊
              </div>
            )}
          </div>
          
          <div className="p-2 sm:p-4 bg-white">
            <h2 className="text-sm sm:text-xl font-bold text-gray-800 line-clamp-1">
              {item.title}
            </h2>
            {item.description && (
              <p className="text-[10px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2">
                {item.description}
              </p>
            )}
            {item.content && (
              <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2">
                {item.content}
              </p>
            )}
            {item.link_url && !isVideo && (
              <div className="mt-1 sm:mt-2">
                <span className="text-[8px] sm:text-xs text-primary hover:underline flex items-center gap-1">
                  En savoir plus →
                </span>
              </div>
            )}
          </div>
        </motion.div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto" />
          <p className="mt-4 text-white/60 text-sm">Chargement de l'écran...</p>
        </div>
      </div>
    );
  }

  const currentItem = displayItems[currentSlide] || null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-2 sm:p-4 relative">
      {/* Cadre TV extérieur */}
      <div className="relative w-full max-w-7xl">
        <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-emerald-500/20 via-purple-500/20 to-emerald-500/20 blur-2xl sm:blur-3xl rounded-2xl sm:rounded-3xl"></div>
        
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl sm:rounded-3xl p-2 sm:p-4 shadow-2xl shadow-black/50">
          
          {/* LED d'alimentation */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-4 flex items-center gap-1 sm:gap-2 z-20">
            <div className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
            <span className="text-[8px] sm:text-[10px] text-gray-500 font-mono uppercase tracking-wider hidden sm:block">LIVE</span>
          </div>
          
          {/* Boutons TV factices */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-4 flex items-center gap-1 sm:gap-1.5 z-20">
            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-600"></div>
            </div>
            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-600"></div>
            </div>
            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-red-600/80 border border-red-500 flex items-center justify-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400"></div>
            </div>
          </div>

          {/* Écran TV */}
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-pink-50 via-white to-purple-50 min-h-[400px] sm:min-h-[600px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            
            {/* En-tête avec le nom du salon */}
            <header className="relative bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100 z-10">
              <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  {tenantInfo?.logo_url ? (
                    <img 
                      src={tenantInfo.logo_url} 
                      alt={tenantInfo.name} 
                      className="h-8 sm:h-12 w-auto object-contain"
                    />
                  ) : (
                    <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm sm:text-xl">
                      {tenantInfo?.name?.charAt(0) || 'B'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm sm:text-xl font-bold text-gray-800">
                      {tenantInfo?.name || 'BeautyFlow'}
                    </h1>
                    {tenantInfo?.address && (
                      <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-0.5 sm:gap-1 truncate max-w-[100px] sm:max-w-none">
                        <MapPin className="h-2.5 sm:h-3 w-2.5 sm:w-3 flex-shrink-0" />
                        <span className="truncate">{tenantInfo.address}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">
                    {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400">
                    {format(new Date(), 'HH:mm')}
                  </p>
                </div>
              </div>
            </header>

            {/* Contenu principal : 2 colonnes */}
            <div className="container mx-auto px-1 sm:px-4 py-2 sm:py-4 h-[calc(100vh-200px)] sm:h-[calc(100vh-180px)] min-h-[300px] sm:min-h-[400px]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 h-full">
                
                {/* Colonne de gauche : Diaporama */}
                <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-pink-100">
                  {displayItems.length > 0 ? (
                    <>
                      <AnimatePresence mode="wait">
                        {renderSlideContent(currentItem)}
                      </AnimatePresence>

                      {displayItems.length > 1 && !isVideoPlaying && !showAnnouncement && (
                        <>
                          <button
                            onClick={goToPrevSlide}
                            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 sm:p-2 shadow-lg transition-all hover:scale-110 z-20"
                          >
                            <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6 text-gray-700" />
                          </button>
                          <button
                            onClick={goToNextSlide}
                            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 sm:p-2 shadow-lg transition-all hover:scale-110 z-20"
                          >
                            <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6 text-gray-700" />
                          </button>

                          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2 z-20">
                            {displayItems.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`h-1.5 sm:h-2 rounded-full transition-all ${
                                  index === currentSlide
                                    ? 'w-4 sm:w-8 bg-pink-500'
                                    : 'w-1.5 sm:w-2 bg-gray-300 hover:bg-gray-400'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-gray-400">
                      <Package className="h-8 w-8 sm:h-16 sm:w-16 mb-2 sm:mb-4 opacity-30" />
                      <p className="text-sm sm:text-lg">Aucun contenu disponible</p>
                      <p className="text-[10px] sm:text-sm">Les produits et publications apparaîtront ici</p>
                    </div>
                  )}
                </div>

                {/* Colonne de droite : TICKET N° */}
                <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-200">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent" 
                         style={{
                           animation: 'scanMove 4s linear infinite',
                           transform: 'translateY(-100%)'
                         }}>
                    </div>
                  </div>
                  
                  <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-3 sm:px-6 py-2 sm:py-4 text-white z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="p-1 sm:p-1.5 rounded-full bg-white/20">
                          <Ticket className="h-3 w-3 sm:h-5 sm:w-5" />
                        </div>
                        <h2 className="font-bold text-xs sm:text-lg tracking-wider">EN COURS D'APPEL</h2>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-[8px] sm:text-sm bg-white/10 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full">
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-400 animate-pulse"></div>
                        <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                        <span>{format(new Date(), 'HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center p-2 sm:p-6 min-h-[150px] sm:min-h-[300px] relative z-10">
                    {calledTicket ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="w-full text-center"
                      >
                        <motion.p
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                          className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold text-emerald-600 tracking-tight"
                          style={{ 
                            textShadow: '0 0 40px rgba(16, 185, 129, 0.3), 0 4px 20px rgba(16, 185, 129, 0.2)',
                            fontFamily: 'monospace'
                          }}
                        >
                          TICKET N°
                        </motion.p>
                        <motion.p
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: 0.2
                          }}
                          className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-extrabold text-emerald-600 tracking-tight mt-1 sm:mt-2"
                          style={{ 
                            textShadow: '0 0 40px rgba(16, 185, 129, 0.3), 0 4px 20px rgba(16, 185, 129, 0.2)',
                            fontFamily: 'monospace'
                          }}
                        >
                          {String(calledTicket.ticket_number).padStart(2, '0')}
                        </motion.p>
                        
                        {/* Affichage de la place */}
                        {employeeInfo && (
                          <div className="mt-2 sm:mt-4 flex items-center justify-center gap-2">
                            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                              Place {employeeInfo.employee_number}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 sm:mt-6 flex items-center justify-center gap-2 sm:gap-4 text-[8px] sm:text-xs text-gray-400 font-mono">
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            LIVE
                          </span>
                          <span>|</span>
                          <span className="hidden sm:inline">HD</span>
                          <span className="hidden sm:inline">|</span>
                          <span>16:9</span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <div className="p-3 sm:p-6 rounded-full bg-gray-100 w-16 h-16 sm:w-28 sm:h-28 flex items-center justify-center mx-auto mb-2 sm:mb-4">
                          <Bell className="h-8 w-8 sm:h-14 sm:w-14 text-gray-300" />
                        </div>
                        <p className="text-base sm:text-xl font-medium text-gray-500">Aucun appel</p>
                        <p className="text-[10px] sm:text-sm text-gray-400 mt-0.5 sm:mt-1 font-mono">
                          En attente du prochain client
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-2 sm:mt-3">
            <div className="w-24 sm:w-48 h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-gray-600 to-transparent rounded-full"></div>
          </div>
          
          <div className="hidden sm:flex justify-between px-12 mt-2">
            <div className="w-8 h-3 bg-gray-700 rounded-b-lg"></div>
            <div className="w-8 h-3 bg-gray-700 rounded-b-lg"></div>
          </div>
        </div>
      </div>

      {/* ✅ OVERLAY D'ANNONCE */}
      <AnimatePresence>
        {showAnnouncement && announcementTicket && (
          <TicketAnnouncementOverlay
            ticket={announcementTicket}
            employee={announcementEmployee}
            onComplete={handleAnnouncementComplete}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scanMove {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}