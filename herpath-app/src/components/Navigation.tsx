'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/lib/AppContext';
import {
  Home, BookOpen, Compass, Briefcase, User,
  LogOut, Sparkles, ChevronRight, Shield, Search, Users,
  TrendingUp, PanelLeftClose, PanelLeftOpen, MessageCircle
} from 'lucide-react';

const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 240;
const STORAGE_KEY = 'herpath.sidebar.width';
const HIDDEN_KEY = 'herpath.sidebar.hidden';

export function Sidebar() {
  const pathname = usePathname();
  const { user, currentRole, logout, toggleAIPanel, accessRequests } = useApp();
  const router = useRouter();

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [hidden, setHidden] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  /* ── restore saved width + hidden state ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedW = window.localStorage.getItem(STORAGE_KEY);
    if (savedW) {
      const n = parseInt(savedW, 10);
      if (!Number.isNaN(n)) {
        setSidebarWidth(Math.min(Math.max(n, MIN_WIDTH), MAX_WIDTH));
      }
    }
    const savedH = window.localStorage.getItem(HIDDEN_KEY);
    if (savedH === '1') setHidden(true);
  }, []);

  /* ── publish width to CSS var ── */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--sidebar-width',
      hidden ? '0px' : `${sidebarWidth}px`
    );
  }, [sidebarWidth, hidden]);

  /* ── persist width ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.requestAnimationFrame(() => {
      window.localStorage.setItem(STORAGE_KEY, String(sidebarWidth));
    });
    return () => window.cancelAnimationFrame(id);
  }, [sidebarWidth]);

  /* ── persist hidden ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
  }, [hidden]);

  /* ── keyboard shortcut: [ toggles ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (typing) return;
      if (e.key === '[') {
        e.preventDefault();
        setHidden((h) => !h);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── cleanup mid-drag ── */
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const clamp = (n: number) => Math.min(Math.max(n, MIN_WIDTH), MAX_WIDTH);

  const beginResize = (clientX: number) => {
    if (hidden) return;
    isResizing.current = true;
    setIsDragging(true);
    startX.current = clientX;
    startWidth.current = sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return;
      const x = 'touches' in ev ? ev.touches[0]?.clientX : (ev as MouseEvent).clientX;
      if (x == null) return;
      const delta = x - startX.current;
      setSidebarWidth(clamp(startWidth.current + delta));
    };

    const onEnd = () => {
      isResizing.current = false;
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      cleanupRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);

    cleanupRef.current = onEnd;
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    beginResize(e.clientX);
  };

  const startResizeTouch = (e: React.TouchEvent) => {
    const x = e.touches[0]?.clientX;
    if (x == null) return;
    beginResize(x);
  };

  const onHandleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth((w) => clamp(w - 16));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth((w) => clamp(w + 16));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSidebarWidth(MIN_WIDTH);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSidebarWidth(MAX_WIDTH);
    }
  };

  const resetWidth = () => setSidebarWidth(DEFAULT_WIDTH);
  const toggleHidden = () => setHidden((h) => !h);

  const handleLogout = () => {
    logout();
    router.push(currentRole === 'expert' ? '/login/expert' : '/');
  };

  const pendingCount = accessRequests.filter(r => r.status === 'PENDING').length;
  const approvedCount = accessRequests.filter(r => r.status === 'APPROVED').length;

  const learnerNavItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/community', label: 'Community', icon: MessageCircle },
    { href: '/learn', label: 'Learn', icon: BookOpen },
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/portfolio', label: 'Portfolio', icon: TrendingUp },
    { href: '/opportunities', label: 'Opportunities', icon: Briefcase },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/fraud-legal-help', label: 'Fraud & Legal Help', icon: Shield, badge: undefined },
  ];

  const expertNavItems = [
    { href: '/expert/dashboard', label: 'Expert Home', icon: Home },
    { href: '/community', label: 'Community', icon: MessageCircle },
    { href: '/expert/lookup', label: 'Look Up Learner', icon: Search },
    { href: '/expert/learners', label: 'My Learners', icon: Users, badge: approvedCount > 0 ? approvedCount : undefined },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const currentNavItems = currentRole === 'expert' ? expertNavItems : learnerNavItems;

  return (
    <>
      {/* ─── Sidebar ─── */}
      <aside
        className="sidebar"
        aria-hidden={hidden}
        style={{
          width: `${sidebarWidth}px`,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
          transform: hidden ? 'translateX(-100%)' : 'translateX(0)',
          transition: isDragging
            ? 'none'
            : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Logo Header with hide toggle */}
        <div style={{ padding: '20px 12px 16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href={currentRole === 'expert' ? '/expert/dashboard' : '/dashboard'}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '0.875rem', fontFamily: "'Plus Jakarta Sans'" }}>H</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: '1rem', color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                HerPath {currentRole === 'expert' ? 'Expert' : ''}
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', letterSpacing: '0.02em', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentRole === 'expert' ? 'Mentor Gateway' : 'Her Skills. Her Journey.'}
              </div>
            </div>
          </Link>

          <button
            onClick={toggleHidden}
            title="Hide sidebar  ["
            aria-label="Hide sidebar"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--transition), color var(--transition)',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'var(--bg-alt)';
              el.style.color = 'var(--primary)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'none';
              el.style.color = 'var(--text-muted)';
            }}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {currentNavItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || (href !== '/dashboard' && href !== '/expert/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                marginBottom: '3px',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                background: active ? 'var(--accent-light)' : 'transparent',
                fontWeight: active ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all var(--transition)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; } }}
              >
                <Icon size={18} />
                <span>{label}</span>
                {badge !== undefined && (
                  <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 7px' }}>
                    {badge}
                  </span>
                )}
                {active && badge === undefined && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </Link>
            );
          })}
        </nav>

        {/* AI Assistant Button */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={toggleAIPanel}
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', gap: '8px' }}
          >
            <Sparkles size={16} />
            AI Assistant
          </button>
        </div>

        {/* User Footer */}
        {user && (
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar-placeholder avatar-md" style={{ background: user.avatarColor, color: 'white', fontSize: '0.75rem' }}>
              {user.initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentRole === 'expert' ? 'Expert Account' : 'Learner Account'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 'var(--radius-sm)', display: 'flex', transition: 'color var(--transition)' }}
              title="Logout"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--error)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Resize handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onMouseDown={startResize}
          onTouchStart={startResizeTouch}
          onDoubleClick={resetWidth}
          onKeyDown={onHandleKeyDown}
          style={{
            position: 'absolute',
            top: 0,
            right: -2,
            width: '8px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 101,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            outline: 'none',
          }}
        >
          <div
            aria-hidden
            style={{
              width: isDragging ? '3px' : '2px',
              height: isDragging ? '100%' : '48px',
              borderRadius: '999px',
              background: isDragging ? 'var(--primary)' : 'var(--border)',
              opacity: isDragging ? 1 : 0.9,
              transition: isDragging ? 'none' : 'all 0.15s ease',
              pointerEvents: 'none',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'var(--primary)';
              el.style.height = '80px';
            }}
            onMouseLeave={e => {
              if (isDragging) return;
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'var(--border)';
              el.style.height = '48px';
            }}
          />
        </div>
      </aside>

      {/* ─── Floating reopen button (only when hidden) ─── */}
      <button
        onClick={toggleHidden}
        title="Show sidebar  ["
        aria-label="Show sidebar"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 102,
          width: 36,
          height: 36,
          borderRadius: '10px',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
          opacity: hidden ? 1 : 0,
          pointerEvents: hidden ? 'auto' : 'none',
          transform: hidden ? 'translateX(0)' : 'translateX(-12px)',
          transition: 'opacity 200ms ease, transform 200ms ease, background var(--transition), color var(--transition)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--accent-light)';
          el.style.color = 'var(--primary)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--card)';
          el.style.color = 'var(--text)';
        }}
      >
        <PanelLeftOpen size={18} />
      </button>
    </>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { currentRole } = useApp();

  const mobileItems = currentRole === 'expert'
    ? [
        { href: '/expert/dashboard', label: 'Home', icon: Home },
        { href: '/community', label: 'Feed', icon: MessageCircle },
        { href: '/expert/lookup', label: 'Look Up', icon: Search },
        { href: '/expert/learners', label: 'Learners', icon: Users },
        { href: '/profile', label: 'Profile', icon: User },
      ]
    : [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/community', label: 'Feed', icon: MessageCircle },
        { href: '/learn', label: 'Learn', icon: BookOpen },
        { href: '/discover', label: 'Discover', icon: Compass },
        { href: '/profile', label: 'Profile', icon: User },
      ];

  return (
    <nav className="mobile-nav">
      <div style={{ display: 'flex', width: '100%' }}>
        {mobileItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '8px 4px',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '0.625rem',
              fontWeight: active ? 600 : 500,
              transition: 'color var(--transition)',
              textDecoration: 'none',
            }}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { user, toggleAIPanel } = useApp();

  return (
    <div className="topbar">
      <div>
        {title && <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>{title}</h1>}
        {subtitle && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={toggleAIPanel}
          style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-mid)',
            color: 'var(--primary)',
            borderRadius: 'var(--radius)',
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
        >
          <Sparkles size={14} />
          <span className="hide-mobile">AI Assistant</span>
        </button>
        {user && (
          <div className="avatar-placeholder avatar-md" style={{ background: user.avatarColor, color: 'white', fontSize: '0.75rem', cursor: 'pointer' }}>
            {user.initials}
          </div>
        )}
      </div>
    </div>
  );
}
