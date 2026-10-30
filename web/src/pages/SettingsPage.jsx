// /src/pages/SettingsPage.jsx
import React, { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor, Check, Bell, BellOff } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { disablePush, enablePush, isPushSupported } from '@/lib/push';

export function SettingsPage() {
  const { theme, setLightTheme, setDarkTheme, setSystemTheme } = useTheme();
  const { currentUser } = useAuth();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ enabled: false });

  const themes = [
    { id: 'light', label: 'Clair', icon: Sun, action: setLightTheme },
    { id: 'dark', label: 'Sombre', icon: Moon, action: setDarkTheme },
    { id: 'system', label: 'Système', icon: Monitor, action: setSystemTheme },
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supported = await isPushSupported();
        if (mounted) setPushSupported(supported);
        const cfg = await apiFetch('/api/push/config').catch(() => ({ enabled: false }));
        if (mounted) setConfig(cfg);
        if (currentUser?.id) {
          const devices = await apiFetch('/api/push/devices').catch(() => ({ count: 0 }));
          if (mounted) setPushEnabled((devices?.count ?? 0) > 0 || Notification?.permission === 'granted');
        }
      } catch {
        // mode degrade
      }
    })();
    return () => { mounted = false; };
  }, [currentUser?.id]);

  const handleTogglePush = async () => {
    setLoading(true);
    try {
      if (pushEnabled) {
        await disablePush({ apiFetch });
        setPushEnabled(false);
      } else {
        const result = await enablePush({ apiFetch });
        setPushEnabled(result.enabled);
      }
    } catch (error) {
      console.error('[push] bascule impossible :', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Personnalisez votre expérience</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thème</CardTitle>
          <CardDescription>Choisissez le thème de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map(({ id, label, icon: Icon, action }) => (
              <Button
                key={id}
                variant={theme === id ? 'default' : 'outline'}
                onClick={action}
                className="flex items-center justify-center gap-2 h-20"
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
                {theme === id && <Check className="h-4 w-4 ml-2" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {currentUser?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications push
            </CardTitle>
            <CardDescription>
              Rappels de rendez-vous (24h / 1h) et alerte « C'est votre tour » dans la file d'attente
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {!pushSupported && 'Ce navigateur ne prend pas en charge les notifications push.'}
              {pushSupported && !config.enabled && "Service d'envoi non configuré (mode dégradé)."}
              {pushSupported && config.enabled && 'Service d\'envoi disponible.'}
            </div>
            <Button
              variant={pushEnabled ? 'outline' : 'default'}
              onClick={handleTogglePush}
              disabled={loading || !pushSupported}
              className="flex items-center gap-2"
            >
              {pushEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {pushEnabled ? 'Désactiver les notifications' : 'Activer les notifications'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}