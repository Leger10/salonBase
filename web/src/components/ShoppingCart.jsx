import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart as ShoppingCartIcon, X, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Hook de panier localStorage
const useCart = () => {
  const [cartItems, setCartItems] = React.useState([]);

  React.useEffect(() => {
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

  const addToCart = (product, variant, quantity) => {
    const existing = cartItems.find(item => item.variant.id === variant.id);
    if (existing) {
      const updated = cartItems.map(item =>
        item.variant.id === variant.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      saveCart(updated);
    } else {
      saveCart([...cartItems, { product, variant, quantity }]);
    }
  };

  const removeFromCart = (variantId) => {
    saveCart(cartItems.filter(item => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    saveCart(cartItems.map(item =>
      item.variant.id === variantId ? { ...item, quantity } : item
    ));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.variant.sale_price || item.variant.price || 0;
      return total + price * item.quantity;
    }, 0);
  };

  const clearCart = () => {
    saveCart([]);
  };

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    clearCart
  };
};

const ShoppingCart = ({ isCartOpen, setIsCartOpen }) => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    try {
      // Simuler un checkout
      toast.success('Commande validée !');
      clearCart();
      setIsCartOpen(false);
    } catch (error) {
      toast.error('Erreur lors du checkout');
    }
  }, [cartItems, clearCart, setIsCartOpen]);

  const formatPrice = (price) => {
    return `${price.toLocaleString()} FCFA`;
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/60 z-50"
          onClick={() => setIsCartOpen(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-card text-card-foreground shadow-2xl flex flex-col rounded-l-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-card-foreground">Panier</h2>
              <Button onClick={() => setIsCartOpen(false)} variant="ghost" size="icon" className="text-card-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                  <ShoppingCartIcon size={48} className="mb-4 opacity-30" />
                  <p>Votre panier est vide.</p>
                </div>
              ) : (
                cartItems.map(item => {
                  const price = item.variant.sale_price || item.variant.price || 0;
                  return (
                    <div key={item.variant.id} className="flex items-center gap-4 bg-card border border-border p-3 rounded-lg">
                      <img 
                        src={item.product.images?.[0]?.url || '/placeholder.png'} 
                        alt={item.product.title} 
                        className="w-20 h-20 object-cover rounded-md bg-muted"
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                      />
                      <div className="flex-grow">
                        <h3 className="font-semibold text-card-foreground">{item.product.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.variant.title}</p>
                        <p className="text-sm text-primary font-bold">{formatPrice(price)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center border border-border rounded-md">
                          <Button 
                            onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))} 
                            size="sm" 
                            variant="ghost" 
                            className="px-2 text-card-foreground hover:bg-muted h-8 w-8"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="px-2 text-card-foreground min-w-[20px] text-center">{item.quantity}</span>
                          <Button 
                            onClick={() => updateQuantity(item.variant.id, item.quantity + 1)} 
                            size="sm" 
                            variant="ghost" 
                            className="px-2 text-card-foreground hover:bg-muted h-8 w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button 
                          onClick={() => removeFromCart(item.variant.id)} 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive/90 text-xs h-8"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-border bg-muted/10">
                <div className="flex justify-between items-center mb-4 text-card-foreground">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold">{formatPrice(getCartTotal())}</span>
                </div>
                <Button onClick={handleCheckout} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 text-base">
                  Commander
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Frais de livraison calculés à l'étape suivante
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShoppingCart;
export { useCart };