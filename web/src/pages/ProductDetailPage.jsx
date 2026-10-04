// /src/pages/ProductDetailPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, ArrowLeft, CheckCircle, Minus, Plus, XCircle, ChevronLeft, ChevronRight, Video, Play } from 'lucide-react';
import { toast } from 'sonner';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [tenantId, setTenantId] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const videoRef = useRef(null);

  // ✅ Détecter si c'est une vidéo
  useEffect(() => {
    const url = product?.images?.[0]?.url || '';
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    setIsVideo(videoExtensions.some(ext => url.toLowerCase().includes(ext)));
  }, [product]);

  // Récupérer le tenant actif pour la boutique
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

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const activeTenantId = await fetchActiveTenant();
      if (!activeTenantId) {
        setError("Aucun salon trouvé");
        setLoading(false);
        return;
      }

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', activeTenantId)
        .single();

      if (productError) throw productError;

      // ✅ Détecter si c'est une vidéo
      const isVideoFile = productData.image_url?.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);

      const formattedProduct = {
        id: productData.id,
        title: productData.name,
        description: productData.description || '',
        subtitle: productData.reference || '',
        price: productData.selling_price,
        purchasable: productData.stock_quantity > 0,
        images: productData.image_url ? [{ url: productData.image_url }] : [],
        ribbon_text: productData.stock_quantity < 5 ? 'Stock limité' : null,
        is_video: !!isVideoFile,
        variants: [{
          id: productData.id,
          title: productData.name,
          price_formatted: `${productData.selling_price.toLocaleString()} FCFA`,
          sale_price_formatted: null,
          inventory_quantity: productData.stock_quantity,
          manage_inventory: true,
          image_url: productData.image_url
        }]
      };

      setProduct(formattedProduct);
      setIsVideo(!!isVideoFile);
      
      if (formattedProduct.images && formattedProduct.images.length > 0) {
        setCurrentImageIndex(0);
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err.message || 'Impossible de charger le produit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleAddToCart = async () => {
    if (product) {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existingItem = cart.find(item => item.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          id: product.id,
          name: product.title,
          price: product.price,
          quantity: quantity,
          image: product.images[0]?.url
        });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      toast.success(`${quantity} x ${product.title} ajouté au panier !`);
    }
  };

  const handleQuantityChange = useCallback((amount) => {
    setQuantity(prevQuantity => {
      const newQuantity = prevQuantity + amount;
      if (newQuantity < 1) return 1;
      if (product && newQuantity > (product.variants[0]?.inventory_quantity || 99)) {
        return product.variants[0]?.inventory_quantity || 1;
      }
      return newQuantity;
    });
  }, [product]);

  const handlePrevImage = useCallback(() => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1);
    }
  }, [product?.images?.length]);

  const handleNextImage = useCallback(() => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1);
    }
  }, [product?.images?.length]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link to="/store" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6">
          <ArrowLeft size={16} />
          Retour à la boutique
        </Link>
        <div className="text-center text-red-400 p-8 glass-card rounded-2xl">
          <XCircle className="mx-auto h-16 w-16 mb-4" />
          <p className="mb-6">Erreur lors du chargement du produit: {error}</p>
        </div>
      </div>
    );
  }

  const price = product.price ? `${product.price.toLocaleString()} FCFA` : null;
  const availableStock = product.variants[0]?.inventory_quantity || 0;
  const isStockManaged = true;
  const canAddToCart = quantity <= availableStock && product.purchasable;

  const currentImage = product.images[currentImageIndex];
  const hasMultipleImages = product.images.length > 1;

  return (
    <>
      <Helmet>
        <title>{product.title} - BeautyFlow Store</title>
        <meta name="description" content={product.description?.substring(0, 160) || product.title} />
      </Helmet>
      <div className="max-w-5xl mx-auto">
        <Link to="/store" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6">
          <ArrowLeft size={16} />
          Retour à la boutique
        </Link>
        <div className="grid md:grid-cols-2 gap-8 glass-card p-8 rounded-2xl bg-card">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative">
            <div className="relative overflow-hidden rounded-lg shadow-2xl h-96 md:h-[500px] bg-muted">
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={currentImage?.url}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={product.poster_url || placeholderImage}
                />
              ) : (
                <img
                  src={currentImage?.url || placeholderImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = placeholderImage; }}
                />
              )}

              {/* Badge vidéo */}
              {isVideo && (
                <div className="absolute top-4 left-4 bg-purple-500/90 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Vidéo
                </div>
              )}

              {hasMultipleImages && !isVideo && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Image précédente"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Image suivante"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {product.ribbon_text && (
                <div className="absolute top-4 right-4 bg-primary/90 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                  {product.ribbon_text}
                </div>
              )}
            </div>

            {hasMultipleImages && !isVideo && (
              <div className="flex justify-center gap-2 mt-4">
                {product.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-primary' : 'bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Aller à l'image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col">
            <h1 className="text-4xl font-bold mb-2">{product.title}</h1>
            <p className="text-lg text-muted-foreground mb-4">{product.subtitle}</p>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-primary">{price}</span>
            </div>

            <div className="prose prose-invert text-muted-foreground mb-6">
              <p>{product.description}</p>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-border rounded-full p-1">
                <Button onClick={() => handleQuantityChange(-1)} variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted">
                  <Minus size={16} />
                </Button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <Button onClick={() => handleQuantityChange(1)} variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted">
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            <div className="mt-auto">
              <Button onClick={handleAddToCart} size="lg" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canAddToCart || !product.purchasable}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Ajouter au panier
              </Button>

              {isStockManaged && canAddToCart && product.purchasable && (
                <p className="text-sm text-green-400 mt-3 flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> {availableStock} en stock !
                </p>
              )}

              {isStockManaged && !canAddToCart && product.purchasable && (
                <p className="text-sm text-yellow-400 mt-3 flex items-center justify-center gap-2">
                  <XCircle size={16} /> Stock insuffisant. Seulement {availableStock} restant(s).
                </p>
              )}

              {!product.purchasable && (
                <p className="text-sm text-red-400 mt-3 flex items-center justify-center gap-2">
                  <XCircle size={16} /> Actuellement indisponible
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default ProductDetailPage;