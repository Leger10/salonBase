import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from '@/lib/supabase';
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Search, LayoutGrid, List, Clock, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";

// Fonctions utilitaires
const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getCategoryColor = (category) => {
  const colors = {
    'Offre/Promotion': 'bg-amber-100 text-amber-800',
    'News': 'bg-blue-100 text-blue-800',
    'Post': 'bg-purple-100 text-purple-800'
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
};

const getCategoryLabel = (category) => {
  const labels = {
    'Offre/Promotion': '🎁 Offre',
    'News': '📰 Actualité',
    'Post': '📝 Article'
  };
  return labels[category] || category;
};

const truncateExcerpt = (text, maxLength = 120) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default function NewsListPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [tenantId, setTenantId] = useState(null);

  const categories = ["All", "Offre/Promotion", "News", "Post"];

  // Récupérer le tenant actif
  const fetchActiveTenant = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('subscription_status', 'active')
        .limit(1)
        .single();

      if (error) throw error;
      return data?.id;
    } catch (err) {
      console.error('Error fetching tenant:', err);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      const activeTenantId = await fetchActiveTenant();
      setTenantId(activeTenantId);
      if (activeTenantId) {
        fetchArticles(activeTenantId);
      }
    };
    init();
  }, [activeCategory]);

  const fetchArticles = async (activeTenantId) => {
    setLoading(true);
    try {
      let query = supabase
        .from('news')
        .select('*')
        .eq('tenant_id', activeTenantId)
        .eq('status', 'Published')
        .order('published_at', { ascending: false });

      if (activeCategory !== "All") {
        query = query.eq('category', activeCategory);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrer les articles dont la date de publication est passée
      const now = new Date().toISOString();
      const validArticles = data.filter(article => 
        !article.published_at || article.published_at <= now
      );

      setArticles(validArticles || []);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      toast.error("Erreur lors du chargement des actualités");
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredArticle = filteredArticles.length > 0 && activeCategory === "All" && !searchTerm
    ? filteredArticles[0]
    : null;
  const listArticles = featuredArticle ? filteredArticles.slice(1) : filteredArticles;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Actualités & Offres | BeautyFlow</title>
        <meta name="description" content="Découvrez nos dernières actualités, conseils beauté, et offres exclusives." />
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 md:py-20 border-b">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Le Journal
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Inspirations, conseils d'experts et nouveautés pour sublimer votre quotidien.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full ${activeCategory === cat ? "shadow-sm" : ""}`}
                >
                  {cat === "All" ? "Tout voir" : getCategoryLabel(cat)}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un article..."
                  className="pl-9 rounded-full bg-muted/50 border-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="hidden sm:flex border rounded-lg p-1 bg-muted/20">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-8">
              <Skeleton className="h-[400px] w-full rounded-3xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-80 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-24 bg-muted/10 rounded-3xl border-2 border-dashed">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-semibold">Aucun article trouvé</h3>
              <p className="text-muted-foreground mt-2">
                Essayez de modifier vos filtres ou votre recherche.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory("All");
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <>
              {/* Featured Article */}
              {featuredArticle && (
                <Link to={`/news/${featuredArticle.id}`} className="group block mb-16">
                  <div className="grid md:grid-cols-2 gap-8 items-center bg-card rounded-3xl overflow-hidden border shadow-sm transition-all hover:shadow-lg">
                    <div className="aspect-[4/3] md:aspect-auto md:h-full overflow-hidden relative bg-muted">
                      {featuredArticle.image_url ? (
                        <img
                          src={featuredArticle.image_url}
                          alt={featuredArticle.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutGrid className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-4 mb-4">
                        <Badge className={getCategoryColor(featuredArticle.category)}>
                          {getCategoryLabel(featuredArticle.category)}
                        </Badge>
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeDate(featuredArticle.published_at || featuredArticle.created_at)}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold leading-tight group-hover:text-primary transition-colors mb-4">
                        {featuredArticle.title}
                      </h2>
                      <p className="text-lg text-muted-foreground leading-relaxed mb-8 line-clamp-3">
                        {featuredArticle.excerpt || truncateExcerpt(featuredArticle.content)}
                      </p>
                      <div className="font-semibold text-primary inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        Lire l'article <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Articles list */}
              {listArticles.length > 0 && (
                <div className={viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  : "flex flex-col gap-6"
                }>
                  {listArticles.map((article) => (
                    <Link key={article.id} to={`/news/${article.id}`} className="group block h-full">
                      <Card className={`h-full overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl ${viewMode === "list" ? "flex flex-row items-center border-none shadow-none bg-transparent hover:bg-muted/50 p-3" : "border-border/50"}`}>
                        <div className={`${viewMode === "list" ? "w-48 shrink-0 aspect-[4/3] rounded-xl" : "aspect-[16/10]"} overflow-hidden relative bg-muted`}>
                          {article.image_url ? (
                            <img
                              src={article.image_url}
                              alt={article.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <LayoutGrid className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                          {viewMode === "grid" && (
                            <div className="absolute top-3 left-3">
                              <Badge className={getCategoryColor(article.category)}>
                                {getCategoryLabel(article.category)}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className={viewMode === "list" ? "p-0 pl-6 flex-1" : "p-6"}>
                          {viewMode === "list" && (
                            <Badge className={`mb-3 ${getCategoryColor(article.category)}`}>
                              {getCategoryLabel(article.category)}
                            </Badge>
                          )}
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                            <Calendar className="h-3 w-3" />
                            {formatRelativeDate(article.published_at || article.created_at)}
                          </div>
                          <h3 className="font-bold text-xl leading-snug group-hover:text-primary transition-colors mb-3 line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {article.excerpt || truncateExcerpt(article.content, 100)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}