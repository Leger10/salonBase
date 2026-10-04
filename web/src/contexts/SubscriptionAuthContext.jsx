import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const SubscriptionAuthContext = createContext(null);

export function SubscriptionAuthProvider({ children }) {
  const { currentUser, isAuthenticated } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollingExhausted, setPollingExhausted] = useState(false);

  const fetchSubscriptions = async () => {
    if (!isAuthenticated || !currentUser?.profile?.tenant_id) {
      setSubscriptions([]);
      setHasValidSubscription(false);
      return [];
    }

    try {
      // Requête directe à Supabase
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('subscription_plan, subscription_status, subscription_start, subscription_end')
        .eq('id', currentUser.profile.tenant_id)
        .single();

      if (error) throw error;

      const subscription = tenant ? [{
        id: currentUser.profile.tenant_id,
        plan: tenant.subscription_plan,
        status: tenant.subscription_status,
        start_date: tenant.subscription_start,
        end_date: tenant.subscription_end,
      }] : [];

      setSubscriptions(subscription);
      
      const hasActive = tenant?.subscription_status === 'active' && 
                       new Date(tenant.subscription_end) > new Date();
      setHasValidSubscription(hasActive);
      
      return subscription;
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setSubscriptions([]);
      setHasValidSubscription(false);
      return [];
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentUser?.profile?.tenant_id) {
      fetchSubscriptions();
    }
  }, [isAuthenticated, currentUser]);

  // Polling post-paiement
  useEffect(() => {
    const pendingFlag = sessionStorage.getItem('subscriptionPending');
    if (!pendingFlag || !isAuthenticated) return;

    setPolling(true);
    let attempts = 0;
    const maxAttempts = 15;

    const checkSubscription = setInterval(async () => {
      attempts++;
      await fetchSubscriptions();
      
      if (hasValidSubscription || attempts >= maxAttempts) {
        clearInterval(checkSubscription);
        sessionStorage.removeItem('subscriptionPending');
        setPolling(false);
        if (attempts >= maxAttempts && !hasValidSubscription) {
          setPollingExhausted(true);
        }
      }
    }, 2000);

    return () => clearInterval(checkSubscription);
  }, [isAuthenticated, hasValidSubscription]);

  const refreshSubscriptions = () => fetchSubscriptions();

  const value = {
    currentUser,
    isAuthenticated,
    subscriptions,
    hasValidSubscription,
    refreshSubscriptions,
    polling,
    pollingExhausted,
  };

  return (
    <SubscriptionAuthContext.Provider value={value}>
      {children}
    </SubscriptionAuthContext.Provider>
  );
}

export function useSubscriptionAuth() {
  const context = useContext(SubscriptionAuthContext);
  if (!context) {
    throw new Error('useSubscriptionAuth must be used within <SubscriptionAuthProvider>');
  }
  return context;
}