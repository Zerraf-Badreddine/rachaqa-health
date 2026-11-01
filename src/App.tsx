import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './auth/AuthContext';
import { setRefreshFn } from './api/client';
import { LoginScreen } from './components/LoginScreen';
import { Layout } from './components/Layout';
import { DashboardGrid } from './components/DashboardGrid';
import { DateRangeProvider } from './context/DateRangeContext';
import { WidgetDataProvider } from './context/WidgetDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';

export default function App() {
  const { isAuthenticated, isLoading, error, refreshToken } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
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
          <Layout onNavigate={navigate}>
            <DashboardGrid />
          </Layout>
        </WidgetDataProvider>
      </DateRangeProvider>
    </ThemeProvider>
  );
}
