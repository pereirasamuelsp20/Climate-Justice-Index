import { useEffect, useState, useCallback } from 'react';
import { Layout } from './components/layout/Layout';
import { WelcomeModal } from './components/onboarding/WelcomeModal';
import { useUserStore } from './store/useUserStore';
import { useAppStore } from './store/useAppStore';
import { supabase } from './lib/supabase';
import AuthPage from './components/auth/AuthPage';
import StormTransition from './components/auth/StormTransition';

// Screens
import DashboardScreen from './components/screens/DashboardScreen';
import RankingStatisticalScreen from './components/screens/RankingStatisticalScreen';
import RankingGraphicalScreen from './components/screens/RankingGraphicalScreen';
import InitiativesScreen from './components/screens/InitiativesScreen';
import CompletedInitiativesScreen from './components/screens/CompletedInitiativesScreen';
import HotspotMapScreen from './components/screens/HotspotMapScreen';

type AppPhase = 'auth' | 'transition' | 'dashboard';

function App() {
  const { session, isLoadingAuth, setSession, setLoadingAuth } = useUserStore();
  const currentScreen = useAppStore((state) => state.currentScreen);
  const [phase, setPhase] = useState<AppPhase>('auth');
  const [prevSession, setPrevSession] = useState(session);

  useEffect(() => {
    // Handle initial session + email verification callback
    // Supabase automatically exchanges the URL hash tokens from email verification links
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
      // If already logged in on load, skip transition
      if (session) {
        setPhase('dashboard');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Keep localStorage token in sync for any components that read it directly
      if (session?.access_token) {
        localStorage.setItem('supabase-auth-token', session.access_token);
      } else {
        localStorage.removeItem('supabase-auth-token');
      }

      // Handle email verification callback — user clicked confirm link and was redirected
      if (event === 'SIGNED_IN' && session) {
        // Clean up the URL hash that Supabase appends after email verification
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoadingAuth]);

  // Detect fresh login (session transitions from null → valid)
  useEffect(() => {
    if (!prevSession && session) {
      // Fresh login → show storm transition and reset to dashboard
      setPhase('transition');
      useUserStore.getState().setHasSeenOnboarding(false);
      useAppStore.getState().setCurrentScreen('dashboard');
    } else if (!session) {
      setPhase('auth');
      // Reset to dashboard so next login starts fresh
      useAppStore.getState().setCurrentScreen('dashboard');
    }
    setPrevSession(session);
  }, [session, prevSession]);

  const handleTransitionComplete = useCallback(() => {
    setPhase('dashboard');
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm text-slate-500 tracking-wide">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session || phase === 'auth') {
    return <AuthPage />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen />;
      case 'ranking-statistical': return <RankingStatisticalScreen />;
      case 'ranking-graphical': return <RankingGraphicalScreen />;
      case 'initiatives': return <InitiativesScreen />;
      case 'completed-initiatives': return <CompletedInitiativesScreen />;
      case 'hotspot-map': return <HotspotMapScreen />;
      default: return <DashboardScreen />;
    }
  };

  if (phase === 'transition') {
    return (
      <>
        <StormTransition onComplete={handleTransitionComplete} />
        {/* Pre-render dashboard behind the overlay for instant reveal */}
        <div className="opacity-0 pointer-events-none">
          <Layout>
            <DashboardScreen />
          </Layout>
        </div>
      </>
    );
  }

  return (
    <Layout>
      <WelcomeModal />
      {renderScreen()}
    </Layout>
  );
}

export default App;
