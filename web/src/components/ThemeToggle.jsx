// /src/components/ThemeToggle.jsx - Composant pour changer de thème
import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ThemeToggle() {
  const { 
    theme, 
    setLightTheme, 
    setDarkTheme, 
    setSystemTheme, 
    isDark, 
    isLight, 
    isSystem 
  } = useTheme();

  const getThemeIcon = () => {
    if (isLight) return <Sun className="h-4 w-4" />;
    if (isDark) return <Moon className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
    if (isLight) return 'Clair';
    if (isDark) return 'Sombre';
    return 'Système';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {getThemeIcon()}
          <span>{getThemeLabel()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={setLightTheme} 
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Clair</span>
          </div>
          {isLight && <span className="text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={setDarkTheme} 
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span>Sombre</span>
          </div>
          {isDark && <span className="text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={setSystemTheme} 
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>Système</span>
          </div>
          {isSystem && <span className="text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}