import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Navigation, type TabId } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';
import { Dashboard } from './views/Dashboard';
import { HomeCompanion } from './components/HomeCompanion';

// Code-splitting: cada pantalla viaja en su propio chunk y carga al vuelo.
const mk = <T,>(load: () => Promise<{ [k: string]: T }>, key: string) =>
  lazy(() => load().then(m => ({ default: m[key] as React.ComponentType<any> })));

const Breathe = mk(() => import('./views/Breathe'), 'Breathe');
const BurnJournal = mk(() => import('./views/BurnJournal'), 'BurnJournal');
const Coping = mk(() => import('./views/Coping'), 'Coping');
const RetosView = mk(() => import('./views/RetosView'), 'RetosView');
const SosScreen = mk(() => import('./views/SosScreen'), 'SosScreen');
const ExploreView = mk(() => import('./views/ExploreView'), 'ExploreView');
const ChatView = mk(() => import('./views/ChatView'), 'ChatView');
const RadarView = mk(() => import('./views/RadarView'), 'RadarView');
const PlansView = mk(() => import('./views/PlansView'), 'PlansView');
const CommunityView = mk(() => import('./views/CommunityView'), 'CommunityView');
const LibraryView = mk(() => import('./views/LibraryView'), 'LibraryView');
const GuideView = mk(() => import('./views/GuideView'), 'GuideView');
const ConnectView = mk(() => import('./views/ConnectView'), 'ConnectView');
const WelcomeView = mk(() => import('./views/WelcomeView'), 'WelcomeView');
const OnboardingView = mk(() => import('./views/OnboardingView'), 'OnboardingView');
const ProfileView = mk(() => import('./views/ProfileView'), 'ProfileView');
const AdminView = mk(() => import('./views/AdminView'), 'AdminView');
const AssessmentView = mk(() => import('./views/AssessmentView'), 'AssessmentView');
const GamesView = mk(() => import('./views/GamesView'), 'GamesView');
const GameView = mk(() => import('./views/GameView'), 'GameView');
const NotFoundView = mk(() => import('./views/NotFoundView'), 'NotFoundView');
const OfficialResourcesView = mk(() => import('./views/OfficialResourcesView'), 'OfficialResourcesView');

const ROUTE_PATTERNS = [
  '/',
  '/breathe',
  '/journal',
  '/coping',
  '/retos',
  '/sos',
  '/explore',
  '/chat',
  '/radar',
  '/plans',
  '/community',
  '/library',
  '/library/:id',
  '/resources',
  '/games',
  '/games/:id',
  '/connect',
  '/assessment',
  '/profile',
  '/admin',
];

const isKnownRoute = (pathname: string): boolean =>
  ROUTE_PATTERNS.some((path) => matchPath({ path, end: true }, pathname) !== null);

import { getMe, getToken, setToken, type SafeUser } from './utils/auth';
import { syncSystemBarsTheme } from './utils/systemBars';
import { SyncToast } from './components/SyncToast';
import { AppLock } from './components/AppLock';
import { FirstRunSpotlight } from './components/FirstRunSpotlight';
import { FirstLockPrompt, shouldShowFirstLockPrompt } from './components/FirstLockPrompt';
import { LoadingBrand } from './components/LoadingBrand';
import { StartupReady } from './components/StartupReady';

const ROUTE_MAP: Record<string, TabId> = {
  '/': 'dashboard',
  '/breathe': 'breathe',
  '/journal': 'journal',
  '/coping': 'coping',
  '/retos': 'retos',
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
    syncSystemBarsTheme(theme);
  }, [theme]);

  const activeView: TabId = ROUTE_MAP[location.pathname] || 'dashboard';

  /**
   * Pantalla de juego: el Header y la navbar se retiran.
   *
   * No es una cuestión estética. Entre los dos ocupan 184px, empujan el
   * escenario fuera de pantalla en teléfonos pequeños y obligan a desplazar; y
   * la navbar va en position:absolute CON pointer-events sobre el contenido,
   * así que al desplazar el escenario se queda debajo y los toques se los
   * come la barra. El juego ya tiene su propio botón de salida.
   */
  const isGameMode = /^\/games\/[^/]+\/?$/.test(location.pathname);

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
        {!isGameMode && (
          <Header theme={theme} setTheme={setTheme} onSosClick={handleSosClick} userName={user.name} />
        )}

        <main className={`app-content${isGameMode ? ' game-mode' : ''}`} ref={containerRef}>
          <ErrorBoundary>
            <Suspense fallback={<SplashScreen />}>
              <div className="page-enter" key={location.pathname}>
                <Routes location={location}>
                <Route path="/" element={<HomeCompanion><Dashboard user={user} /></HomeCompanion>} />
                <Route path="/breathe" element={<Breathe />} />
                <Route path="/journal" element={<BurnJournal theme={theme} />} />
                <Route path="/coping" element={<Coping />} />
                <Route path="/retos" element={<RetosView user={user} />} />
                <Route path="/sos" element={<SosScreen />} />
                <Route path="/explore" element={<ExploreView user={user} />} />
                <Route path="/chat" element={<ChatView />} />
                <Route path="/radar" element={<RadarView />} />
                <Route path="/plans" element={<PlansView />} />
                <Route path="/community" element={<CommunityView />} />
                <Route path="/library" element={<LibraryView />} />
                <Route path="/library/:id" element={<GuideView />} />
                <Route path="/resources" element={<OfficialResourcesView />} />
                <Route path="/games" element={<GamesView />} />
                <Route path="/games/:id" element={<GameView />} />
                <Route path="/connect" element={<ConnectView />} />
                <Route path="/assessment" element={<AssessmentView />} />
                <Route
                  path="/profile"
                  element={<ProfileView user={user} onEdit={onEditProfile} onLogout={onLogout} />}
                />
                {/* El panel re-valida el rol dentro de AdminView; aquí solo se
                    monta la ruta para quien ya tiene sesión iniciada. */}
                <Route path="/admin" element={<AdminView user={user} />} />
                <Route path="*" element={<NotFoundView />} />
              </Routes>
                <StartupReady />
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>

        {!isGameMode && <Navigation activeTab={activeView} setActiveTab={handleTabChange} />}
      </div>

      <InstallPrompt />
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="loading-screen">
      <LoadingBrand />
    </div>
  );
}

function localPreviewUser(): SafeUser {
  return {
    id: 'local-preview',
    username: 'preview',
    email: 'preview@local',
    phone: null,
    name: 'Preview',
    role: 'usuario',
    is_active: true,
    problems: [],
    situations: [],
    strategies: [],
    trusted_person: null,
    trusted_phone: null,
    wants_contact: false,
    changes: [],
    goals_text: null,
    onboarding_done: true,
    landing_seen: true,
    created_at: new Date().toISOString(),
  };
}

function Root() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SafeUser | null>(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      // En `npm run dev` se entra sin cuenta para poder ver Header, SOS y
      // el resto de la app. El login real sigue activo en producción.
      if (import.meta.env.DEV) {
        setUser(localPreviewUser());
        setStatus('app');
        return;
      }
      setStatus('welcome');
      return;
    }
    getMe()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        // El onboarding guardaba onboarding_done en la BD pero nunca se
        // consultaba al entrar, asi que el cuestionario inicial era inalcanzable
        // (solo se llegaba desde "Editar mi perfil"). Ahora un usuario que aún no
        // lo completó pasa por él al iniciar sesión.
        setStatus(u.onboarding_done ? 'app' : 'onboarding');
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

  if (!isKnownRoute(location.pathname)) {
    return (
      <div className="app-shell">
        <main className="app-content">
          <Suspense fallback={<SplashScreen />}>
            <NotFoundView />
            <StartupReady />
          </Suspense>
        </main>
      </div>
    );
  }

  if (status === 'welcome') {
    return (
      <>
        <WelcomeView
          onAuthenticated={(u: SafeUser) => {
            setUser(u);
            setStatus('app');
          }}
        />
        <StartupReady />
      </>
    );
  }

  if (status === 'onboarding') {
    return (
      <>
        <OnboardingView
          initial={user}
          onSaved={(u: SafeUser) => {
            setUser(u);
            setStatus('app');
          }}
          onClose={user?.onboarding_done ? () => setStatus('app') : undefined}
        />
        <StartupReady />
      </>
    );
  }

  return (
    <>
      <AppShell
        user={user!}
        onEditProfile={() => setStatus('onboarding')}
        onLogout={() => {
          setUser(null);
          setStatus('welcome');
        }}
      />
      {shouldShowFirstLockPrompt() ? <FirstLockPrompt onClose={() => {}} /> : null}
    </>
  );
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<SplashScreen />}>
        <Root />
      </Suspense>
      <SyncToast />
      <AppLock />
      <FirstRunSpotlight />
    </HashRouter>
  );
}

export default App;
