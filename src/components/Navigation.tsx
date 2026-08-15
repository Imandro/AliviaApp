import React, { useRef, useEffect, useState } from 'react';
import { Home, Wind, PenTool, Compass, LayoutGrid } from 'lucide-react';

export type TabId = 'dashboard' | 'breathe' | 'journal' | 'coping' | 'explore';

interface NavigationProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
}

const TAB_ORDER: TabId[] = ['dashboard', 'breathe', 'journal', 'coping', 'explore'];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'breathe', label: 'Respirar', icon: Wind },
    { id: 'journal', label: 'Desahogo', icon: PenTool },
    { id: 'coping', label: 'Apoyo', icon: Compass },
    { id: 'explore', label: 'Explorar', icon: LayoutGrid },
  ];

  useEffect(() => {
    if (!navRef.current) return;
    const activeIndex = TAB_ORDER.indexOf(activeTab);
    const buttons = navRef.current.querySelectorAll<HTMLButtonElement>('button');
    const activeBtn = buttons[activeIndex];
    if (activeBtn) {
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setIndicatorStyle({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
      });
    }
  }, [activeTab]);

  return (
    <nav style={styles.navContainer}>
      <div style={styles.navBar} ref={navRef}>
        <div style={{ ...styles.indicator, left: indicatorStyle.left, width: indicatorStyle.width }} />
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={styles.navBtn}
              title={item.label}
            >
              <div
                style={{
                  ...styles.iconWrapper,
                  color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)',
                  transform: isActive ? 'translateY(-1px)' : 'none',
                }}
              >
                <IconComponent
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(var(--accent-gold-rgb), 0.35))' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
              <span
                style={{
                  ...styles.label,
                  color: isActive ? 'var(--text-active)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    padding: '0 16px 20px 16px',
    zIndex: 10,
    pointerEvents: 'none',
  },
  navBar: {
    position: 'relative',
    width: '100%',
    height: '68px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: 'var(--bg-nav)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
    pointerEvents: 'auto',
  },
  indicator: {
    position: 'absolute',
    bottom: '28px',
    height: '32px',
    borderRadius: '16px',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.12)',
    transition: 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    zIndex: 0,
  },
  navBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 0',
    position: 'relative',
    zIndex: 1,
  },
  iconWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  label: {
    fontSize: '11px',
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.02em',
    transition: 'color 0.3s ease',
  },
};
