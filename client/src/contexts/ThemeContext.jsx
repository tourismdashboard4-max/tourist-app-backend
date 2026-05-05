// client/src/contexts/ThemeContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // ✅ تحميل الوضع المحفوظ من localStorage مع معالجة أفضل للقيم
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === null) return false;
    // معالجة القيم المخزنة كـ string أو JSON
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    try {
      return JSON.parse(saved);
    } catch {
      return false;
    }
  });

  const [autoTheme, setAutoTheme] = useState(() => {
    const saved = localStorage.getItem('autoTheme');
    if (saved === null) return false;
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    try {
      return JSON.parse(saved);
    } catch {
      return false;
    }
  });

  // ✅ تطبيق الوضع التلقائي حسب وقت النظام (مع منع التحديث غير الضروري)
  useEffect(() => {
    if (autoTheme) {
      const hour = new Date().getHours();
      const shouldBeDark = hour >= 18 || hour < 6;
      if (shouldBeDark !== darkMode) {
        setDarkMode(shouldBeDark);
      }
    }
  }, [autoTheme, darkMode]);

  // ✅ حفظ وتطبيق الوضع على كامل التطبيق
  useEffect(() => {
    // حفظ كـ string لتجنب مشاكل JSON
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
    localStorage.setItem('autoTheme', autoTheme ? 'true' : 'false');
    
    console.log('🎨 [ThemeContext] Theme saved:', { 
      darkMode: darkMode ? 'true' : 'false', 
      autoTheme: autoTheme ? 'true' : 'false' 
    });
    
    // تطبيق الكلاسات على عنصر HTML
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f3f4f6';
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f9fafb';
      document.body.style.color = '#111827';
    }
  }, [darkMode, autoTheme]);

  // ✅ تبديل الوضع الليلي
  const toggleDarkMode = () => {
    setAutoTheme(false);
    setDarkMode(prev => !prev);
    console.log('🎨 [ThemeContext] Toggle dark mode to:', !darkMode);
  };

  // ✅ تفعيل الوضع التلقائي
  const enableAutoTheme = () => {
    setAutoTheme(true);
    console.log('🎨 [ThemeContext] Auto theme enabled');
  };
  
  // ✅ إلغاء الوضع التلقائي
  const disableAutoTheme = () => {
    setAutoTheme(false);
    console.log('🎨 [ThemeContext] Auto theme disabled');
  };

  // ✅ إعادة تعيين الوضع إلى الافتراضي
  const resetTheme = () => {
    setAutoTheme(false);
    setDarkMode(false);
    console.log('🎨 [ThemeContext] Theme reset to light mode');
  };

  // نظام الألوان الموحد للتطبيق
  const colors = {
    light: {
      background: '#f9fafb',
      card: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      primary: '#16a34a',
      primaryDark: '#15803d',
      secondary: '#3b82f6',
      accent: '#8b5cf6',
      success: '#16a34a',
      warning: '#eab308',
      danger: '#dc2626',
      info: '#3b82f6',
      purple: '#9333ea',
      header: 'linear-gradient(135deg, #16a34a, #059669)',
      footer: '#1f2937',
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    dark: {
      background: '#111827',
      card: '#1f2937',
      text: '#f3f4f6',
      textSecondary: '#9ca3af',
      border: '#374151',
      primary: '#4ade80',
      primaryDark: '#22c55e',
      secondary: '#60a5fa',
      accent: '#c084fc',
      success: '#4ade80',
      warning: '#facc15',
      danger: '#f87171',
      info: '#60a5fa',
      purple: '#c084fc',
      header: 'linear-gradient(135deg, #1f2937, #111827)',
      footer: '#0f172a',
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.6)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.8)',
    }
  };

  const theme = darkMode ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{
      darkMode,
      autoTheme,
      theme,
      toggleDarkMode,
      enableAutoTheme,
      disableAutoTheme,
      resetTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
