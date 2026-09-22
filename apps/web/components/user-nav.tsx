'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserNavProps {
  initials?: string;
  fullName?: string;
  email?: string;
}

export function UserNav({
  initials: propInitials,
  fullName: propFullName,
  email: propEmail,
}: UserNavProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(propFullName || '');
  const [email, setEmail] = useState(propEmail || '');
  const [initials, setInitials] = useState(propInitials || 'TS');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If not provided as props, fetch candidate profile / session
    if (!propFullName || !propEmail) {
      fetch('/api/candidate-profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.personalInformation) {
            const name = data.personalInformation.fullName || 'Candidate';
            const mail = data.personalInformation.email || '';
            setFullName(name);
            setEmail(mail);
            const inits = name
              .split(' ')
              .map((part: string) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            setInitials(inits || 'CA');
          }
        })
        .catch(() => {});
    }
  }, [propFullName, propEmail]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  }

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        className="profile"
        onClick={() => setOpen(!open)}
        title={fullName ? `${fullName} (${email})` : 'User menu'}
        style={{ cursor: 'pointer' }}
      >
        {initials}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: '0',
            width: '220px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '8px 0',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {fullName && (
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--line)',
                marginBottom: '4px',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'var(--ink)',
                }}
              >
                {fullName}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {email}
              </div>
            </div>
          )}

          <Link
            href="/command-center"
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--ink)',
              display: 'block',
            }}
          >
            Command Center
          </Link>
          <Link
            href="/review"
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--ink)',
              display: 'block',
            }}
          >
            Review Queue
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--ink)',
              display: 'block',
            }}
          >
            My Profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--ink)',
              display: 'block',
            }}
          >
            Application Settings
          </Link>
          <Link
            href="/analytics"
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--ink)',
              display: 'block',
            }}
          >
            Analytics
          </Link>

          <div
            style={{
              borderTop: '1px solid var(--line)',
              margin: '4px 0',
              paddingTop: '4px',
            }}
          >
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 16px',
                fontSize: '13px',
                color: '#dc2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
