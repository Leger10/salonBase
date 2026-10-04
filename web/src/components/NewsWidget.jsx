import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Newspaper, ArrowRight, Clock } from 'lucide-react';
import { formatRelativeDate, getCategoryColor, getCategoryLabel } from '@/lib/utils.js';

export default function NewsWidget() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const fetchNews = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setArticles([]);
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'Published')
        .lte('published_at', now)
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Failed to fetch news widget:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [currentUser]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" /> Dernières Actualités
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" /> Dernières Actualités
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Découvrez nos offres, conseils et nouveautés.</p>
        </div>
        <Link 
          to="/news" 
          className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Tout voir <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link key={article.id} to={`/news/${article.id}`} className="group block h-full">
            <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl border-border/50">
              <div className="aspect-[16/9] overflow-hidden bg-muted relative">
                {article.image_url ? (
                  <img 
                    src={article.image_url} 
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/placeholder-image.jpg';
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-secondary/10">
                    <Newspaper className="h-10 w-10 text-secondary/40" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <Badge className={`font-semibold ${getCategoryColor(article.category)}`}>
                    {getCategoryLabel(article.category)}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-5">
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatRelativeDate(article.published_at || article.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <div className="mt-6 text-center sm:hidden">
        <Link 
          to="/news" 
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Voir toutes les actualités <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}