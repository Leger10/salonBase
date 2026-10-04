// /src/hooks/useCart.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext();

const CART_STORAGE_KEY = 'salon-cart';

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
      return [];
    }
  });

  // Sauvegarder le panier dans localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du panier:', error);
    }
  }, [cartItems]);

  // Ajouter un produit au panier
  const addToCart = useCallback((product, quantity = 1) => {
    return new Promise((resolve) => {
      setCartItems(prevItems => {
        // Vérifier si le produit existe déjà dans le panier
        const existingItem = prevItems.find(item => item.id === product.id);
        
        if (existingItem) {
          // Mettre à jour la quantité si le produit existe déjà
          return prevItems.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        
        // Ajouter le nouveau produit
        return [...prevItems, { 
          id: product.id,
          name: product.name || product.title || 'Produit',
          price: product.price || product.sale_price || 0,
          quantity: quantity,
          image: product.image || product.image_url || null,
          category: product.category || null,
          description: product.description || null,
          type: 'product'
        }];
      });
      resolve();
    });
  }, []);

  // Ajouter un service au panier
  const addServiceToCart = useCallback((service, quantity = 1) => {
    return new Promise((resolve) => {
      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === service.id && item.type === 'service');
        
        if (existingItem) {
          return prevItems.map(item =>
            item.id === service.id && item.type === 'service'
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        
        return [...prevItems, { 
          id: service.id,
          name: service.name || service.title || 'Service',
          price: service.price || service.sale_price || 0,
          quantity: quantity,
          type: 'service',
          duration: service.duration || null,
          description: service.description || null,
          category: service.category || 'Service'
        }];
      });
      resolve();
    });
  }, []);

  // Ajouter un forfait au panier
  const addPackageToCart = useCallback((pkg, quantity = 1) => {
    return new Promise((resolve) => {
      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === pkg.id && item.type === 'package');
        
        if (existingItem) {
          return prevItems.map(item =>
            item.id === pkg.id && item.type === 'package'
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        
        return [...prevItems, { 
          id: pkg.id,
          name: pkg.name || pkg.title || 'Forfait',
          price: pkg.price || pkg.sale_price || 0,
          quantity: quantity,
          type: 'package',
          services: pkg.services || [],
          description: pkg.description || null,
          category: 'Forfait'
        }];
      });
      resolve();
    });
  }, []);

  // Retirer un article du panier
  const removeFromCart = useCallback((itemId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  // Mettre à jour la quantité d'un article
  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      // Si la quantité est 0 ou négative, retirer l'article
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  // Vider le panier
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Calculer le total du panier
  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const price = item.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [cartItems]);

  // Calculer le nombre total d'articles
  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => {
      return total + item.quantity;
    }, 0);
  }, [cartItems]);

  // Vérifier si le panier est vide
  const isCartEmpty = useCallback(() => {
    return cartItems.length === 0;
  }, [cartItems]);

  // Formater le total avec la devise
  const getFormattedTotal = useCallback((currency = 'XOF') => {
    const total = getCartTotal();
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(total);
  }, [getCartTotal]);

  // Obtenir le nombre d'articles par type
  const getItemsByType = useCallback((type) => {
    return cartItems.filter(item => item.type === type);
  }, [cartItems]);

  // Calculer le total par type
  const getTotalByType = useCallback((type) => {
    return cartItems
      .filter(item => item.type === type)
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    addServiceToCart,
    addPackageToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getTotalItems,
    isCartEmpty,
    getFormattedTotal,
    getItemsByType,
    getTotalByType,
  }), [
    cartItems, 
    addToCart, 
    addServiceToCart,
    addPackageToCart,
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getCartTotal,
    getTotalItems,
    isCartEmpty,
    getFormattedTotal,
    getItemsByType,
    getTotalByType
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};