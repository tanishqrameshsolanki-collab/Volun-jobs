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
              >
                🏠 Overview Dashboard
              </Link>
              <Link
                href="/jobs"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/jobs') ? 'active' : ''}`}
              >
                💼 Discovered Jobs &amp; Search
              </Link>
              <Link
                href="/applications"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/applications') ? 'active' : ''}`}
              >
                📋 Application Tracker
              </Link>
              <Link
                href="/interviews"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/interviews') ? 'active' : ''}`}
              >
                📅 Interviews &amp; Reminders
              </Link>
              <Link
                href="/review"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/review') ? 'active' : ''}`}
              >
                ⚖️ Human Review Queue
              </Link>
              <Link
                href="/command-center"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/command-center') ? 'active' : ''}`}
              >
                ⚡ Command Center (Operations)
              </Link>
              <Link
                href="/analytics"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/analytics') ? 'active' : ''}`}
              >
                📊 Funnel Analytics
              </Link>
              <Link
                href="/profile"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/profile') ? 'active' : ''}`}
              >
                👤 Candidate Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setDrawerOpen(false)}
                className={`drawer-link ${isActive('/settings') ? 'active' : ''}`}
              >
                ⚙️ Application Settings
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
          <span className="tab-icon">🏠</span>
          <span className="tab-text">Overview</span>
        </Link>
        <Link
          href="/jobs"
          className={`bottom-tab ${isActive('/jobs') ? 'active' : ''}`}
        >
          <span className="tab-icon">💼</span>
          <span className="tab-text">Jobs</span>
        </Link>
        <Link
          href="/applications"
          className={`bottom-tab ${isActive('/applications') ? 'active' : ''}`}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-text">Applications</span>
        </Link>
        <Link
          href="/review"
          className={`bottom-tab ${isActive('/review') ? 'active' : ''}`}
        >
          <span className="tab-icon">⚖️</span>
          <span className="tab-text">Review</span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`bottom-tab ${drawerOpen ? 'active' : ''}`}
          aria-label="More navigation links"
        >
          <span className="tab-icon">⋯</span>
          <span className="tab-text">More</span>
        </button>
      </nav>
    </>
  );
}
