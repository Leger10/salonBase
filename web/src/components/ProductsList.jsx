// /src/components/ProductsList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Star, Clock, Package, AlertCircle, Plus, Search, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

// Hook de panier localStorage
const useCart = () => {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  const saveCart = (items) => {
    localStorage.setItem('cart', JSON.stringify(items));
    setCartItems(items);
  };

  const addToCart = (product, quantity = 1) => {
    const existing = cartItems.find(item => item.id === product.id);
    if (existing) {
      const updated = cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      saveCart(updated);
    } else {
      saveCart([...cartItems, { ...product, quantity }]);
    }
  };

  const removeFromCart = (productId) => {
    saveCart(cartItems.filter(item => item.id !== productId));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.selling_price * item.quantity), 0);
  };

  const clearCart = () => {
    saveCart([]);
  };

  return { cartItems, addToCart, removeFromCart, getCartTotal, clearCart };
};

const ProductCard = ({ product, index, isAdmin = false }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [isVideo, setIsVideo] = useState(false);
  const videoRef = React.useRef(null);

  // ✅ Détecter si c'est une vidéo
  useEffect(() => {
    const url = product.image_url || '';
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    setIsVideo(videoExtensions.some(ext => url.toLowerCase().includes(ext)));
  }, [product.image_url]);

  const displayPrice = product.selling_price || product.price || 0;
  const originalPrice = product.purchase_price || null;
  const hasSale = originalPrice && originalPrice > displayPrice;
  const stockQuantity = product.stock_quantity || 0;
  const isInStock = stockQuantity > 0;
  const isLowStock = stockQuantity > 0 && stockQuantity < 5;

  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isInStock) {
      toast.error('Ce produit est actuellement en rupture de stock');
      return;
    }

    addToCart(product, 1);
    toast.success(`${product.name} ajouté au panier !`);
  }, [product, addToCart, isInStock]);

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/admin/products/${product.id}/edit`);
  };

  const handleVideoMouseEnter = (e) => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoMouseLeave = (e) => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <Link to={`/product/${product.id}`}>
          <div className="relative">
            {isVideo ? (
              <video
                ref={videoRef}
                src={product.image_url}
                className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                muted
                loop
                playsInline
                onMouseEnter={handleVideoMouseEnter}
                onMouseLeave={handleVideoMouseLeave}
                poster={product.poster_url || placeholderImage}
              />
            ) : (
              <img
                src={product.image_url || placeholderImage}
                alt={product.name}
                className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => { e.target.src = placeholderImage; }}
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
            
            {/* Badge vidéo */}
            {isVideo && (
              <div className="absolute top-3 left-3 bg-purple-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Video className="h-3 w-3" />
                Vidéo
              </div>
            )}
            
            {/* Badges */}
            {product.reference && !isVideo && (
              <div className="absolute top-3 left-3 bg-primary/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                {product.reference}
              </div>
            )}
            
            {!isInStock && (
              <div className="absolute top-3 right-3 bg-red-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Rupture de stock
              </div>
            )}
            
            {isLowStock && isInStock && (
              <div className="absolute top-3 right-3 bg-yellow-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                Stock faible
              </div>
            )}

            {/* Prix */}
            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm font-bold px-3 py-1 rounded-full flex items-baseline gap-1.5">
              {hasSale && (
                <span className="line-through opacity-70 text-xs">
                  {originalPrice.toLocaleString()} FCFA
                </span>
              )}
              <span>{displayPrice.toLocaleString()} FCFA</span>
            </div>

            {/* Badge admin */}
            {isAdmin && (
              <div className="absolute bottom-3 left-3 bg-blue-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                ✏️ Admin
              </div>
            )}
          </div>
        </Link>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold truncate">{product.name}</h3>
            {product.category && (
              <span className="text-xs bg-muted/30 px-2 py-0.5 rounded-full">
                {product.category}
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground h-10 overflow-hidden line-clamp-2">
            {product.description || 'Produit de qualité professionnelle'}
          </p>
          
          <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {product.unit || 'pièce'}
            </span>
            <span className={isInStock ? 'text-green-600' : 'text-red-600'}>
              {isInStock ? `${stockQuantity} en stock` : 'Indisponible'}
            </span>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleAddToCart} 
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold"
              disabled={!isInStock}
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> 
              {isInStock ? 'Ajouter' : 'Indisponible'}
            </Button>
            
            {isAdmin && (
              <Button 
                onClick={handleEdit}
                variant="outline"
                className="px-3"
              >
                ✏️
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function ProductsList({ 
  isAdmin = false, 
  limit = null, 
  category = null,
  showFilters = true 
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setProducts([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProducts(data || []);

      const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des produits');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-8 bg-red-50/10 rounded-lg">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
        <p>Erreur lors du chargement des produits : {error}</p>
        <Button onClick={fetchProducts} variant="outline" className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-12 bg-muted/20 rounded-lg border-2 border-dashed">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">
          {isAdmin ? 'Aucun produit ajouté' : 'Aucun produit disponible'}
        </p>
        <p className="text-sm mt-1">
          {isAdmin 
            ? 'Commencez par ajouter vos produits dans la section administration.'
            : 'Revenez plus tard pour découvrir nos nouveautés.'}
        </p>
        {isAdmin && (
          <Button asChild className="mt-4">
            <Link to="/admin/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un produit
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {isAdmin && (
            <Button asChild className="gap-2">
              <Link to="/admin/products/new">
                <Plus className="h-4 w-4" />
                Ajouter
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product, index) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            index={index}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center text-muted-foreground p-8">
          <p>Aucun produit ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}