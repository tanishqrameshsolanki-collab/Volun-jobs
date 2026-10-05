'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="brand">
          <span className="brand-mark">V</span>
          <b>Volun jobs</b>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          aria-expanded={drawerOpen}
        >
          {drawerOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile Slide-up Drawer for Secondary Links */}
      {drawerOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="drawer-header">
              <h3>Navigation &amp; Workspace</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="drawer-nav">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Overview Dashboard
              </Link>
              <Link
                href="/jobs"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/jobs') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                Discovered Jobs &amp; Search
              </Link>
              <Link
                href="/applications"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/applications') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                Application Tracker
              </Link>
              <Link
                href="/interviews"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/interviews') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Interviews &amp; Reminders
              </Link>
              <Link
                href="/review"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/review') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                Human Review Queue
              </Link>
              <Link
                href="/command-center"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/command-center') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                Command Center (Operations)
              </Link>
              <Link
                href="/analytics"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/analytics') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                Funnel Analytics
              </Link>
              <Link
                href="/profile"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/profile') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Candidate Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/settings') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Application Settings
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <Link
          href="/"
          className={`bottom-tab ${isActive('/') ? 'active' : ''}`}
        >
          <span className="tab-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </span>
          <span className="tab-text">Overview</span>
        </Link>
        <Link
          href="/jobs"
          className={`bottom-tab ${isActive('/jobs') ? 'active' : ''}`}
        >
          <span className="tab-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
          </span>
          <span className="tab-text">Jobs</span>
        </Link>
        <Link
          href="/applications"
          className={`bottom-tab ${isActive('/applications') ? 'active' : ''}`}
        >
          <span className="tab-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </span>
          <span className="tab-text">Applications</span>
        </Link>
        <Link
          href="/review"
          className={`bottom-tab ${isActive('/review') ? 'active' : ''}`}
        >
          <span className="tab-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          </span>
          <span className="tab-text">Review</span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`bottom-tab ${drawerOpen ? 'active' : ''}`}
          aria-label="More navigation links"
        >
          <span className="tab-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </span>
          <span className="tab-text">More</span>
        </button>
      </nav>
    </>
  );
}
