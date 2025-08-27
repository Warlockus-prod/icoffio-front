'use client'

import { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Инициализация темной темы при монтировании компонента
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    // Устанавливаем состояние
    setIsDarkMode(shouldBeDark);
    
    // Применяем класс к документу
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    
    // Обновляем состояние
    setIsDarkMode(newDarkMode);
    
    // Применяем изменения к DOM
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Рендерим детей даже до монтирования, чтобы избежать hydration mismatch
  // До монтирования используем значение по умолчанию
  return (
    <ThemeContext.Provider value={{ 
      isDarkMode: mounted ? isDarkMode : false, 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
