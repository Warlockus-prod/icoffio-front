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
    // Простая инициализация при первой загрузке
    const savedTheme = (localStorage.getItem('theme') || 'system') as ThemeMode;
    
    setTheme(savedTheme);
    
    // Определяем должна ли быть темная тема
    let shouldBeDark = false;
    
    if (savedTheme === 'dark') {
      shouldBeDark = true;
    } else if (savedTheme === 'light') {
      shouldBeDark = false;
    } else { // system
      const hour = new Date().getHours();
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      shouldBeDark = prefersDark || (hour < 6 || hour >= 18);
    }
    
    applyTheme(shouldBeDark);
    setMounted(true);
  }, []); // Только при первой загрузке

  useEffect(() => {
    if (!mounted) return; // Не запускаем до монтирования

    // Автообновление каждую минуту для system режима
    const interval = setInterval(() => {
      if (theme === 'system') {
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
      if (theme === 'system') {
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
  }, [theme, isDarkMode, mounted]); // Зависимости для правильного обновления

  const toggleTheme = () => {
    if (!mounted) return; // Не переключаем до монтирования
    
    // Простое циклическое переключение: light → dark → system → light
    let nextTheme: ThemeMode;
    
    if (theme === 'light') {
      nextTheme = 'dark';
    } else if (theme === 'dark') {
      nextTheme = 'system';
    } else {
      nextTheme = 'light';
    }
    
    // Обновляем состояние
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    // Применяем тему с простой логикой
    let shouldBeDark = false;
    
    if (nextTheme === 'dark') {
      shouldBeDark = true;
    } else if (nextTheme === 'light') {
      shouldBeDark = false;
    } else { // system
      const hour = new Date().getHours();
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      shouldBeDark = prefersDark || (hour < 6 || hour >= 18);
    }
    
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
