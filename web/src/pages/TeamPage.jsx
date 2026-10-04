// /src/pages/TeamPage.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PublicHeader from '@/components/PublicHeader.jsx';
import PublicFooter from '@/components/PublicFooter.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { supabase } from '@/lib/supabase';
import { Users, AlertCircle, RefreshCcw, Star, Phone, Mail } from 'lucide-react';
import { useTenantId } from '@/hooks/useTenantId.js';

export default function TeamPage() {
  const { tenantId, loading: tenantLoading } = useTenantId();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeam = async () => {
    if (!tenantId) {
      setTeam([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          position,
          is_cashier,
          average_rating,
          total_clients_served,
          profile:profile_id (
            id,
            full_name,
            email,
            phone,
            avatar,
            is_active
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_available', true)
        .order('average_rating', { ascending: false });

      if (employeesError) throw employeesError;

      const formattedTeam = employees
        .filter(emp => emp.profile?.is_active === true)
        .map(emp => ({
          id: emp.id,
          name: emp.profile?.full_name || 'N/A',
          email: emp.profile?.email,
          phone: emp.profile?.phone,
          avatar: emp.profile?.avatar,
          position: emp.position || 'Styliste',
          employee_number: emp.employee_number,
          is_cashier: emp.is_cashier,
          average_rating: emp.average_rating || 0,
          total_clients: emp.total_clients_served || 0,
          tenant_id: tenantId,
        }));

      setTeam(formattedTeam);
    } catch (err) {
      console.error('Error fetching team:', err);
      setError('Impossible de charger l\'équipe. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantLoading) {
      fetchTeam();
    }
  }, [tenantId, tenantLoading]);

  const getAvatarColor = (name) => {
    const colors = [
      'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400',
      'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400',
      'bg-orange-400', 'bg-cyan-400', 'bg-rose-400', 'bg-emerald-400'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const StickFigureAvatar = ({ name }) => {
    const colors = getAvatarColor(name);
    const initials = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className={`w-full h-full flex items-center justify-center ${colors}`}>
        <svg width="100" height="140" viewBox="0 0 100 140" className="text-white/90">
          <circle cx="50" cy="25" r="20" fill="white" stroke="white" strokeWidth="2" />
          <circle cx="42" cy="22" r="3" fill={colors.replace('bg-', 'text-')} />
          <circle cx="58" cy="22" r="3" fill={colors.replace('bg-', 'text-')} />
          <path d="M 40 32 Q 50 38 60 32" stroke={colors.replace('bg-', 'text-')} strokeWidth="2" fill="none" strokeLinecap="round" />
          <line x1="50" y1="45" x2="50" y2="80" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="55" x2="20" y2="45" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="55" x2="80" y2="45" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="80" x2="30" y2="110" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="80" x2="70" y2="110" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <text x="50" y="130" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
            {initials}
          </text>
        </svg>
      </div>
    );
  };

  const TeamMemberCard = ({ member }) => {
    return (
      <Card className="group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="relative h-72 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <StickFigureAvatar name={member.name} />
          )}
          {member.is_cashier && (
            <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              Caisse
            </div>
          )}
          {member.average_rating > 0 && (
            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {member.average_rating.toFixed(1)}
            </div>
          )}
          <div className="absolute top-3 left-3 bg-primary/80 text-white text-xs font-medium px-2 py-1 rounded-full">
            {member.position || 'Styliste'}
          </div>
        </div>
        <CardContent className="p-5 text-center">
          <h3 className="text-xl font-bold mb-1">{member.name}</h3>
          <p className="text-sm text-primary font-medium mb-2">{member.position}</p>
          <p className="text-xs text-muted-foreground mb-3">
            #{member.employee_number} • {member.total_clients} clients servis
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 border-t">
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Téléphone"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="w-full mt-3 gap-1 hover:bg-primary hover:text-white transition-colors">
            <Link to={`/rate-employee/${member.id}`}>
              <Star className="h-3 w-3" />
              Noter ce professionnel
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (tenantLoading || loading) {
    return (
      <>
        <PublicHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <PublicFooter />
      </>
    );
  }

  const metaTags = {
    title: 'Notre Équipe - BeautyFlow',
    description: 'Rencontrez notre équipe talentueuse de stylistes et experts beauté.',
    keywords: 'équipe salon, stylistes, coiffeurs, experts beauté',
  };

  return (
    <>
      <Helmet>
        <title>{metaTags.title}</title>
        <meta name="description" content={metaTags.description} />
        <meta name="keywords" content={metaTags.keywords} />
      </Helmet>
      
      <PublicHeader />
      
      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
          <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                Rencontrez Notre Équipe
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Des professionnels talentueux dévoués à sublimer votre beauté
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            {error ? (
              <div className="text-center py-16 bg-muted/20 rounded-3xl border max-w-xl mx-auto">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-foreground mb-4">{error}</p>
                <Button onClick={fetchTeam} variant="outline" className="gap-2">
                  <RefreshCcw className="h-4 w-4" /> Réessayer
                </Button>
              </div>
            ) : team.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
                <Users className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-xl font-medium text-muted-foreground">
                  Aucun membre d'équipe disponible pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {team.map((member, idx) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <TeamMemberCard member={member} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
          <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold sm:text-4xl mb-6">Rejoindre Notre Équipe</h2>
              <p className="text-lg mb-8 opacity-90 leading-relaxed">
                Nous sommes toujours à la recherche de personnes passionnées et talentueuses 
                pour rejoindre notre famille grandissante.
              </p>
              <Button asChild size="lg" variant="secondary" className="px-8 hover:bg-white hover:text-primary transition-colors">
                <Link to="/contact">Postuler Maintenant</Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}