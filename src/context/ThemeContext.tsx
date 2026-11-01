import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  glassEffect: boolean;
  toggleGlassEffect: () => void;
}

const THEME_KEY = 'dashboard_theme_preference';
const GLASS_KEY = 'dashboard_glass_effect';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
  glassEffect: true,
  toggleGlassEffect: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {}
  return 'dark';
}

function getInitialGlass(): boolean {
  try {
    const saved = localStorage.getItem(GLASS_KEY);
    if (saved !== null) return saved === 'true';
  } catch {}
  return true;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [glassEffect, setGlassEffect] = useState<boolean>(getInitialGlass);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (glassEffect) {
      root.classList.add('glass-theme');
    } else {
      root.classList.remove('glass-theme');
    }
    try {
      localStorage.setItem(GLASS_KEY, String(glassEffect));
    } catch {}
  }, [glassEffect]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function toggleGlassEffect() {
    setGlassEffect((prev) => !prev);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isDark: theme === 'dark',
        glassEffect,
        toggleGlassEffect,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
