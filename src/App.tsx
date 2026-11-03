import { useEffect, useState, useCallback } from 'react';
import { HeartPulse } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { setRefreshFn } from './api/client';
import { LoginScreen } from './components/LoginScreen';
import { Layout, type GoogleHealthTab } from './components/Layout';
import { DashboardGrid } from './components/DashboardGrid';
import { DateRangeProvider } from './context/DateRangeContext';
import { WidgetDataProvider } from './context/WidgetDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { AcrylicBackground } from './components/common/AcrylicBackground';

export default function App() {
  const { isAuthenticated, isLoading, error, refreshToken } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [activeTab, setActiveTab] = useState<GoogleHealthTab>('today');

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    setRefreshFn(refreshToken);
  }, [refreshToken]);

  // Public legal routes accessible without authentication
  if (currentPath === '/privacy') {
    return (
      <ThemeProvider>
        <PrivacyPolicy onBack={() => navigate('/')} />
      </ThemeProvider>
    );
  }

  if (currentPath === '/terms') {
    return (
      <ThemeProvider>
        <TermsOfService onBack={() => navigate('/')} />
      </ThemeProvider>
    );
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-slate-100 dark:bg-[#0A0E13] flex flex-col items-center justify-center p-6 overflow-hidden">
        <AcrylicBackground />
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00B0B9] flex items-center justify-center text-white shadow-xl shadow-teal-500/25 ring-1 ring-white/30 animate-pulse">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Rachaqa Health</h2>
            <p className="text-xs font-medium text-slate-400 mt-1">Connecting to Google Health...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen error={error} onNavigate={navigate} />;
  }

  return (
    <ThemeProvider>
      <DateRangeProvider>
        <WidgetDataProvider>
          <Layout activeTab={activeTab} onSelectTab={setActiveTab} onNavigate={navigate}>
            <DashboardGrid activeTab={activeTab} />
          </Layout>
        </WidgetDataProvider>
      </DateRangeProvider>
    </ThemeProvider>
  );
}
