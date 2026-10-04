// /src/components/OrderCart.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, X, Trash2, Plus, Minus, 
  Send, User, Phone, Receipt, CheckCircle, Clock,
  Tag, Percent, Gift, Sparkles, TicketPercent
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export const OrderCart = ({ 
  isOpen, 
  onClose, 
  cart, 
  setCart,
  tenantId,
  onOrderPlaced 
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // ✅ États pour le code promo
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState(null); // 'percentage' or 'fixed'

  // ✅ Calcul du sous-total
  const getSubTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // ✅ Calcul du total avec réduction
  const getTotal = () => {
    const subTotal = getSubTotal();
    if (!appliedPromo || discountAmount === 0) return subTotal;
    
    if (discountType === 'percentage') {
      return subTotal - (subTotal * (discountAmount / 100));
    } else if (discountType === 'fixed') {
      return Math.max(0, subTotal - discountAmount);
    }
    return subTotal;
  };

  // ✅ Calcul du montant de la réduction
  const getDiscountAmountValue = () => {
    const subTotal = getSubTotal();
    if (!appliedPromo || discountAmount === 0) return 0;
    
    if (discountType === 'percentage') {
      return subTotal * (discountAmount / 100);
    } else if (discountType === 'fixed') {
      return Math.min(discountAmount, subTotal);
    }
    return 0;
  };

  // ✅ Vérifier et appliquer le code promo
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Veuillez entrer un code promo');
      return;
    }

    if (!tenantId) {
      toast.error('Salon non trouvé');
      return;
    }

    setIsCheckingPromo(true);
    setPromoError('');

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // ✅ Vérifier le code promo dans la base de données
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setPromoError('Code promo invalide ou expiré');
        } else {
          throw error;
        }
        return;
      }

      if (!data) {
        setPromoError('Code promo invalide ou expiré');
        return;
      }

      // ✅ Vérifier la limite d'utilisation
      if (data.max_uses && data.used_count >= data.max_uses) {
        setPromoError('Ce code promo a atteint sa limite d\'utilisation');
        return;
      }

      // ✅ Vérifier le montant minimum
      const subTotal = getSubTotal();
      if (data.min_purchase && subTotal < data.min_purchase) {
        setPromoError(`Montant minimum requis: ${data.min_purchase.toLocaleString()} FCFA`);
        return;
      }

      // ✅ Appliquer le code promo
      setAppliedPromo(data);
      setDiscountAmount(data.value);
      setDiscountType(data.type);
      
      // ✅ Formater le message de confirmation
      const discountText = data.type === 'percentage' 
        ? `${data.value}%` 
        : `${data.value.toLocaleString()} FCFA`;
      
      toast.success(`🎉 Code promo "${data.code}" appliqué ! Réduction de ${discountText}`);
      setPromoCode('');
      setPromoError('');

    } catch (error) {
      console.error('Error applying promo:', error);
      setPromoError('Erreur lors de l\'application du code');
      toast.error('Erreur lors de l\'application du code promo');
    } finally {
      setIsCheckingPromo(false);
    }
  };

  // ✅ Supprimer le code promo appliqué
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setDiscountType(null);
    setPromoCode('');
    setPromoError('');
    toast.info('Code promo supprimé');
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        if (item.stock_quantity && newQuantity > item.stock_quantity) {
          toast.error(`Stock insuffisant. Disponible: ${item.stock_quantity}`);
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
    toast.info('Produit retiré du panier');
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    handleRemovePromo();
  };

  // ✅ Réinitialiser le code promo quand le panier change
  useEffect(() => {
    if (appliedPromo) {
      const subTotal = getSubTotal();
      if (appliedPromo.min_purchase && subTotal < appliedPromo.min_purchase) {
        handleRemovePromo();
        toast.warning('Le montant minimum n\'est plus atteint, code promo supprimé');
      }
    }
  }, [cart]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }

    if (!customerPhone.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }

    const subTotal = getSubTotal();
    const discountAmountValue = getDiscountAmountValue();
    const total = getTotal();

    setSubmitting(true);

    try {
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('receipt_number')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);

      let lastNumber = 0;
      if (lastTx && lastTx.length > 0 && lastTx[0].receipt_number) {
        const match = lastTx[0].receipt_number.match(/RCP-(\d+)/);
        if (match) {
          lastNumber = parseInt(match[1], 10);
        }
      }
      const receiptNumber = `RCP-${String(lastNumber + 1).padStart(4, '0')}`;

      // ✅ Préparer les données de la transaction avec la réduction
      const transactionData = {
        tenant_id: tenantId,
        client_id: null,
        amount: subTotal,
        total_after_discount: total,
        discount_amount: discountAmountValue,
        discount_code: appliedPromo?.code || null,
        payment_method: 'pending',
        receipt_number: receiptNumber,
        status: 'pending',
        transaction_date: new Date().toISOString(),
        transaction_type: 'product_sale',
        source: 'gallery_order',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        promos_applied: appliedPromo ? [{
          code: appliedPromo.code,
          type: appliedPromo.type,
          value: appliedPromo.value,
          amount: discountAmountValue
        }] : null
      };

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (txError) throw txError;

      // ✅ Mettre à jour le compteur d'utilisations du code promo
      if (appliedPromo) {
        await supabase
          .from('promotions')
          .update({ 
            used_count: (appliedPromo.used_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', appliedPromo.id);
      }

      // ✅ Créer les lignes de transaction
      for (const item of cart) {
        await supabase
          .from('transaction_lines')
          .insert({
            transaction_id: txData.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
          });
      }

      // ✅ Message de confirmation avec la réduction
      let successMessage = `✅ Commande validée ! Total: ${total.toLocaleString()} FCFA`;
      if (appliedPromo) {
        const discountText = discountType === 'percentage' ? `${discountAmount}%` : `${discountAmountValue.toLocaleString()} FCFA`;
        successMessage += ` (Réduction de ${discountText} appliquée)`;
      }

      toast.success(successMessage);

      onOrderPlaced({
        ...txData,
        cart_items: cart,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        applied_promo: appliedPromo,
        discount_amount: discountAmountValue,
      });

      clearCart();
      onClose();

    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Erreur lors de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Votre commande
            <Badge variant="secondary" className="ml-2">
              {cart.length} articles
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Panier */}
        <div className="flex-1 overflow-y-auto py-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
              <p className="text-muted-foreground">Votre panier est vide</p>
              <p className="text-sm text-muted-foreground">
                Parcourez notre galerie et ajoutez des produits
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* ✅ Récapitulatif des produits */}
              <div className="bg-muted/10 rounded-xl p-3 border border-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Détail de votre commande</span>
                  <Badge variant="outline" className="text-xs">
                    {cart.length} article(s)
                  </Badge>
                </div>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-muted/10 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.quantity}×</span>
                        <span className="truncate max-w-[120px]">{item.name}</span>
                        {item.duration > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {item.duration} min
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-primary">
                        {(item.price * item.quantity).toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ✅ Section Code Promo */}
              <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-800/30">
                {appliedPromo ? (
                  // ✅ Code promo appliqué
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-green-700 dark:text-green-400">
                          Code "{appliedPromo.code}" appliqué
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {discountType === 'percentage' 
                            ? `${discountAmount}% de réduction` 
                            : `${discountAmount.toLocaleString()} FCFA de réduction`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePromo}
                      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  // ✅ Formulaire code promo
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-sm font-medium">Code promo</span>
                      <span className="text-xs text-muted-foreground">(si vous en avez un)</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Ex: ETE2026"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase());
                            setPromoError('');
                          }}
                          className="pl-9 h-10 bg-background uppercase"
                          disabled={isCheckingPromo}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || isCheckingPromo}
                        className="h-10 px-4 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      >
                        {isCheckingPromo ? (
                          <span className="flex items-center gap-1">
                            <span className="h-4 w-4 animate-spin border-2 border-amber-500 border-t-transparent rounded-full" />
                          </span>
                        ) : (
                          'Appliquer'
                        )}
                      </Button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {promoError}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      💡 Entrez votre code promo pour bénéficier d'une réduction
                    </p>
                  </div>
                )}
              </div>

              {/* ✅ Liste des produits avec actions */}
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-sm text-primary font-bold">
                        {item.price.toLocaleString()} FCFA
                      </p>
                      {item.stock_quantity !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.stock_quantity}
                        </p>
                      )}
                      {item.duration > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {item.duration} min
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 rounded-md"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3 text-primary" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 rounded-md"
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={item.stock_quantity !== undefined && item.quantity >= item.stock_quantity}
                      >
                        <Plus className="h-3 w-3 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Vider le panier
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ✅ Formulaire client et validation de la commande */}
        {cart.length > 0 && (
          <div className="border-t pt-4 space-y-4 bg-gradient-to-b from-background to-muted/5">
            {/* Informations client */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium">Vos coordonnées</h4>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Votre nom complet *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-9 h-11 bg-background"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Votre numéro de téléphone *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-9 h-11 bg-background"
                  />
                </div>
              </div>
            </div>

            {/* ✅ Total de la commande avec réduction */}
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{getSubTotal().toLocaleString()} FCFA</span>
                </div>
                
                {appliedPromo && discountAmount > 0 && (
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <span className="text-sm flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Réduction ({discountType === 'percentage' ? `${discountAmount}%` : `${discountAmount.toLocaleString()} FCFA`})
                    </span>
                    <span className="font-medium">-{getDiscountAmountValue().toLocaleString()} FCFA</span>
                  </div>
                )}

                <div className="border-t border-primary/10 pt-2 flex items-center justify-between">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {getTotal().toLocaleString()} FCFA
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Receipt className="h-3 w-3" />
                <span>{cart.length} article(s) dans le panier</span>
                {appliedPromo && (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Code promo appliqué
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs bg-blue-50 p-2 rounded-lg border border-blue-200">
                <span className="text-blue-700">ℹ️ Le paiement sera effectué à la caisse du salon</span>
              </div>
            </div>

            {/* ✅ Boutons d'action */}
            <SheetFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full h-11"
                disabled={submitting}
              >
                Continuer les achats
              </Button>
              <Button
                className="w-full gap-2 h-11 bg-primary hover:bg-primary/90 text-white text-base"
                onClick={handleSubmitOrder}
                disabled={
                  cart.length === 0 || 
                  submitting || 
                  !customerName.trim() ||
                  !customerPhone.trim()
                }
              >
                <CheckCircle className="h-5 w-5" />
                {submitting ? 'Commande en cours...' : 'Valider ma commande'}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};