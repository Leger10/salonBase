// /src/pages/SettingsPage.jsx
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export function SettingsPage() {
  const { theme, setLightTheme, setDarkTheme, setSystemTheme } = useTheme();

  const themes = [
    { id: 'light', label: 'Clair', icon: Sun, action: setLightTheme },
    { id: 'dark', label: 'Sombre', icon: Moon, action: setDarkTheme },
    { id: 'system', label: 'Système', icon: Monitor, action: setSystemTheme },
  ];

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
    </div>
  );
}