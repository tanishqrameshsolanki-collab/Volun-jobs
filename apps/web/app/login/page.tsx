'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/command-center';

  const [authMode, setAuthMode] = useState<'password' | 'magic'>('password');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handlePasswordAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');

    const supabase = createClient();

    if (isSignUp) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setBusy(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      setBusy(false);
      if (signUpError) {
        setError(signUpError.message);
      } else if (data.session) {
        setMessage('Account created! Entering onboarding…');
        router.push('/onboarding');
        router.refresh();
      } else {
        setMessage(
          'Confirmation email sent. Check your inbox to verify your account.',
        );
      }
    } else {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      setBusy(false);
      if (signInError) {
        setError(signInError.message);
      } else if (data.session) {
        setMessage('Signed in! Redirecting…');
        router.push(redirectTo);
        router.refresh();
      }
    }
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    setBusy(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setMessage('Check your email for a secure sign-in link.');
    }
  }

  async function handleQuickDevLogin() {
    setBusy(true);
    setMessage('Signing in as Tanishq Solanki…');
    setError('');
    try {
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || 'tanishq.rameshsolanki@gmail.com',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error ?? 'Quick login failed');
      setMessage('Signed in! Redirecting to Command Center…');
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setBusy(false);
    }
  }

  return (
    <main className="profile-page">
      <Link className="back" href="/">
        ← Dashboard
      </Link>
      <p className="eyebrow accent">Multi-User Platform</p>
      <h1>Sign in to Volun jobs</h1>
      <p className="lead">
        Sign in to your private workspace. Your candidate profile, job scores,
        application queue, and automation runs are isolated to your account.
      </p>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setAuthMode('password');
            setError('');
            setMessage('');
          }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background:
              authMode === 'password' ? 'var(--accent)' : 'transparent',
            color: authMode === 'password' ? '#fff' : 'var(--muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('magic');
            setError('');
            setMessage('');
          }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: authMode === 'magic' ? 'var(--accent)' : 'transparent',
            color: authMode === 'magic' ? '#fff' : 'var(--muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Magic Link
        </button>
      </div>

      {authMode === 'password' ? (
        <form className="editor" onSubmit={handlePasswordAuth}>
          <label>
            Email
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button className="primary-button" disabled={busy} type="submit">
            {busy
              ? 'Please wait…'
              : isSignUp
                ? 'Create account & begin onboarding'
                : 'Sign in to workspace'}{' '}
            <span>→</span>
          </button>

          <div style={{ marginTop: '12px', fontSize: '13px' }}>
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Create one now
                </button>
              </span>
            )}
          </div>
        </form>
      ) : (
        <form className="editor" onSubmit={handleMagicLink}>
          <label>
            Email
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
            />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? 'Sending…' : 'Email me a secure sign-in link'}{' '}
            <span>→</span>
          </button>
        </form>
      )}

      {/* Developer fast access */}
      <div
        style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: '1px solid var(--line)',
        }}
      >
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          Developer & Candidate 1-Click Access:
        </p>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={handleQuickDevLogin}
          type="button"
        >
          Instant Sign In (Tanishq Solanki) <span>→</span>
        </button>
      </div>

      {error && (
        <p
          style={{
            marginTop: 16,
            color: '#dc2626',
            fontSize: '14px',
            fontWeight: 500,
          }}
          role="alert"
        >
          ⚠️ {error}
        </p>
      )}
      {message && (
        <p className="save-status" role="status">
          {message}
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="quiet-state">Loading login…</div>}>
      <LoginForm />
    </Suspense>
  );
}
