import { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Navigation, type TabId } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './views/Dashboard';
import { Breathe } from './views/Breathe';
import { BurnJournal } from './views/BurnJournal';
import { Coping } from './views/Coping';
import { SosScreen } from './views/SosScreen';
import { ExploreView } from './views/ExploreView';
import { ChatView } from './views/ChatView';
import { RadarView } from './views/RadarView';
import { PlansView } from './views/PlansView';
import { CommunityView } from './views/CommunityView';
import { LibraryView } from './views/LibraryView';
import { ConnectView } from './views/ConnectView';
import { WelcomeView } from './views/WelcomeView';
import { OnboardingView } from './views/OnboardingView';
import { ProfileView } from './views/ProfileView';
import { getMe, getToken, setToken, type SafeUser } from './utils/auth';
import logoVertical from './assets/logo-vertical.png';

const ROUTE_MAP: Record<string, TabId> = {
  '/': 'dashboard',
  '/breathe': 'breathe',
  '/journal': 'journal',
  '/coping': 'coping',
  '/explore': 'explore',
};

type AuthStatus = 'loading' | 'welcome' | 'onboarding' | 'app';

function AppShell({
  user,
  onEditProfile,
  onLogout,
}: {
  user: SafeUser;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'mono'>(() => {
    const saved = localStorage.getItem('alivia-theme');
    return (saved === 'light' || saved === 'dark' || saved === 'mono') ? saved : 'dark';
  });

  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('alivia-theme', theme);
  }, [theme]);

  const activeView: TabId = ROUTE_MAP[location.pathname] || 'dashboard';

  const handleTabChange = useCallback((tab: TabId) => {
    const path = tab === 'dashboard' ? '/' : `/${tab}`;
    navigate(path);
  }, [navigate]);

  const handleSosClick = useCallback(() => {
    navigate('/sos');
  }, [navigate]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <div className="bg-blobs" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      <div className="app-container">
        <Header theme={theme} setTheme={setTheme} onSosClick={handleSosClick} userName={user.name} />

        <main className="app-content" ref={containerRef}>
          <ErrorBoundary>
            <div className="page-enter" key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/breathe" element={<Breathe />} />
                <Route path="/journal" element={<BurnJournal theme={theme} />} />
                <Route path="/coping" element={<Coping />} />
                <Route path="/sos" element={<SosScreen />} />
                <Route path="/explore" element={<ExploreView user={user} />} />
                <Route path="/chat" element={<ChatView />} />
                <Route path="/radar" element={<RadarView />} />
                <Route path="/plans" element={<PlansView />} />
                <Route path="/community" element={<CommunityView />} />
                <Route path="/library" element={<LibraryView />} />
                <Route path="/connect" element={<ConnectView />} />
                <Route
                  path="/profile"
                  element={<ProfileView user={user} onEdit={onEditProfile} onLogout={onLogout} />}
                />
              </Routes>
            </div>
          </ErrorBoundary>
        </main>

        <Navigation activeTab={activeView} setActiveTab={handleTabChange} />
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="app-shell auth-shell">
      <div className="bg-blobs" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>
      <div className="auth-centered" style={{
        padding: '24px 20px',
        position: 'relative',
        zIndex: 1,
        gap: '16px',
        alignItems: 'center',
      }}>
        <img
          className="fade-in"
          src={logoVertical}
          alt="ALIVIA"
          style={{
            height: '110px',
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.35))',
          }}
        />
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.3em',
          margin: 0,
          color: 'var(--text-muted)',
          animation: 'fadeIn 1s ease forwards',
        }}>
          CARGANDO...
        </h1>
      </div>
    </div>
  );
}

function Root() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setStatus('welcome');
      return;
    }
    getMe()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus('app');
      })
      .catch(() => {
        if (cancelled) return;
        setToken(null);
        setStatus('welcome');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return <SplashScreen />;
  }

  if (status === 'welcome') {
    return (
      <WelcomeView
        onAuthenticated={(u) => {
          setUser(u);
          setStatus('app');
        }}
      />
    );
  }

  if (status === 'onboarding') {
    return (
      <OnboardingView
        initial={user}
        onSaved={(u) => {
          setUser(u);
          setStatus('app');
        }}
        onClose={user?.onboarding_done ? () => setStatus('app') : undefined}
      />
    );
  }

  return (
    <AppShell
      user={user!}
      onEditProfile={() => setStatus('onboarding')}
      onLogout={() => {
        setUser(null);
        setStatus('welcome');
      }}
    />
  );
}

function App() {
  return (
    <HashRouter>
      <Root />
    </HashRouter>
  );
}

export default App;