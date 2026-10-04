// /src/hooks/use-theme.js
import { useContext } from 'react';
import ThemeContext from '@/contexts/ThemeContext';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    console.warn('useTheme must be used within a ThemeProvider, using default values');
    return {
      theme: 'system',
      setTheme: () => {},
      toggleTheme: () => {},
      setLightTheme: () => {},
      setDarkTheme: () => {},
      setSystemTheme: () => {},
      isDark: false,
      isLight: true,
      isSystem: true,
      mounted: true,
      getSystemTheme: () => 'light',
    };
  }
  return context;
};

export default useTheme;