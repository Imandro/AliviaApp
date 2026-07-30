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

const ROUTE_MAP: Record<string, TabId> = {
  '/': 'dashboard',
  '/breathe': 'breathe',
  '/journal': 'journal',
  '/coping': 'coping',
};

function AppShell() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('alivia-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
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
        <Header theme={theme} setTheme={setTheme} onSosClick={handleSosClick} />

        <main className="app-content" ref={containerRef}>
          <ErrorBoundary>
            <div className="page-enter" key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/breathe" element={<Breathe />} />
                <Route path="/journal" element={<BurnJournal theme={theme} />} />
                <Route path="/coping" element={<Coping />} />
                <Route path="/sos" element={<SosScreen />} />
              </Routes>
            </div>
          </ErrorBoundary>
        </main>

        <Navigation activeTab={activeView} setActiveTab={handleTabChange} />
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}

export default App;
