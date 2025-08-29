'use client'

import { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Функция для определения темной темы по времени суток
  const isDarkByTime = () => {
    const hour = new Date().getHours();
    return hour < 6 || hour >= 18; // Темно с 18:00 до 6:00
  };

  // Функция для получения вычисленной темы
  const getComputedTheme = (currentTheme: ThemeMode): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches || isDarkByTime() ? 'dark' : 'light';
    }
    return currentTheme;
  };

  // Применить тему к DOM
  const applyTheme = (shouldBeDark: boolean) => {
    const html = document.documentElement;
    if (shouldBeDark) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
    setIsDarkMode(shouldBeDark);
  };

  useEffect(() => {
    // Инициализация при загрузке
    const savedTheme = localStorage.getItem('theme') as ThemeMode || 'system';
    setTheme(savedTheme);
    
    const computedTheme = getComputedTheme(savedTheme);
    const shouldBeDark = computedTheme === 'dark';
    
    applyTheme(shouldBeDark);
    setMounted(true);

    // Автообновление каждую минуту для system режима
    const interval = setInterval(() => {
      if (savedTheme === 'system') {
        const newComputedTheme = getComputedTheme('system');
        const newShouldBeDark = newComputedTheme === 'dark';
        if (newShouldBeDark !== isDarkMode) {
          applyTheme(newShouldBeDark);
        }
      }
    }, 60000); // Обновляем каждую минуту

    // Слушаем изменения системных предпочтений
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (savedTheme === 'system') {
        const newComputedTheme = getComputedTheme('system');
        const newShouldBeDark = newComputedTheme === 'dark';
        applyTheme(newShouldBeDark);
      }
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      clearInterval(interval);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [theme]);

  const toggleTheme = () => {
    // Циклическое переключение: light → dark → system → light
    const nextTheme: ThemeMode = 
      theme === 'light' ? 'dark' : 
      theme === 'dark' ? 'system' : 'light';
    
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    const computedTheme = getComputedTheme(nextTheme);
    const shouldBeDark = computedTheme === 'dark';
    applyTheme(shouldBeDark);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: mounted ? theme : 'system',
      isDarkMode: mounted ? isDarkMode : false, 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
