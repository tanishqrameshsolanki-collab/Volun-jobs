'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SettingsData {
  targetRoles: string[];
  targetCompanies: string[];
  excludedCompanies: string[];
  preferredLocations: string[];
  remotePreference: 'PREFERRED' | 'NEUTRAL' | 'AVOID';
  minimumMatchScore: number;
  maximumApplicationsPerDay: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    targetRoles: ['Software Engineer', 'Full Stack Engineer', 'Backend Engineer'],
    targetCompanies: [],
    excludedCompanies: [],
    preferredLocations: ['Remote', 'Hybrid'],
    remotePreference: 'PREFERRED',
    minimumMatchScore: 70,
    maximumApplicationsPerDay: 5,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then((data) => {
        setSettings({
          targetRoles: data.targetRoles ?? [],
          targetCompanies: data.targetCompanies ?? [],
          excludedCompanies: data.excludedCompanies ?? [],
          preferredLocations: data.preferredLocations ?? [],
          remotePreference: data.remotePreference ?? 'PREFERRED',
          minimumMatchScore: data.minimumMatchScore ?? 70,
          maximumApplicationsPerDay: data.maximumApplicationsPerDay ?? 5,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error loading settings');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update settings');
      }

      setMessage('Preferences saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="profile-page" style={{ maxWidth: '780px', margin: '0 auto', padding: '36px 32px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading settings…</p>
      </main>
    );
  }

  return (
    <main className="profile-page" style={{ maxWidth: '780px', margin: '0 auto', padding: '36px 32px 72px' }}>
      <div className="desk-briefing" style={{ paddingBottom: '24px', marginBottom: '32px' }}>
        <Link className="back" href="/" style={{ marginBottom: '14px' }}>
          ← Overview
        </Link>
        <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 6px' }}>
          Application settings
        </h1>
        <p className="desk-lead" style={{ margin: 0 }}>
          Configure match thresholds, daily submission guardrails, and role targeting preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="doc-form">
        {/* Section 1: Targeting */}
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            Targeting preferences
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <label className="doc-label">
              Target job roles <span className="doc-hint">One role per line</span>
              <textarea
                rows={3}
                className="doc-textarea"
                value={settings.targetRoles.join('\n')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    targetRoles: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Software Engineer&#10;Full Stack Developer&#10;Backend Engineer"
              />
            </label>

            <label className="doc-label">
              Preferred locations <span className="doc-hint">One location per line</span>
              <textarea
                rows={3}
                className="doc-textarea"
                value={settings.preferredLocations.join('\n')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preferredLocations: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Remote&#10;Hybrid&#10;San Francisco, CA"
              />
            </label>

            <label className="doc-label">
              Remote preference
              <select
                className="doc-select"
                value={settings.remotePreference}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    remotePreference: e.target.value as 'PREFERRED' | 'NEUTRAL' | 'AVOID',
                  })
                }
              >
                <option value="PREFERRED">Preferred (Prioritize remote opportunities)</option>
                <option value="NEUTRAL">Neutral (Open to all options)</option>
                <option value="AVOID">Avoid (Prefer strictly onsite)</option>
              </select>
            </label>
          </div>
        </section>

        {/* Section 2: Company Filters */}
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            Company filters
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <label className="doc-label">
              Target companies <span className="doc-hint">Optional whitelist — one company per line</span>
              <textarea
                rows={3}
                className="doc-textarea"
                value={settings.targetCompanies.join('\n')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    targetCompanies: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Leave empty to match all relevant companies"
              />
            </label>

            <label className="doc-label">
              Excluded companies <span className="doc-hint">Excluded blacklist — one company per line</span>
              <textarea
                rows={3}
                className="doc-textarea"
                value={settings.excludedCompanies.join('\n')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    excludedCompanies: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Companies you do not wish to apply to"
              />
            </label>
          </div>
        </section>

        {/* Section 3: Scoring & Guardrails */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            Scoring &amp; guardrails
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label className="doc-label">
              Minimum match score: <strong style={{ color: 'var(--ink)' }}>{settings.minimumMatchScore}%</strong>
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={settings.minimumMatchScore}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minimumMatchScore: parseInt(e.target.value, 10),
                  })
                }
                style={{ width: '100%', marginTop: '8px' }}
              />
              <span className="doc-hint" style={{ marginTop: '4px' }}>
                Jobs scoring below this threshold are marked ineligible and skipped during review generation.
              </span>
            </label>

            <label className="doc-label">
              Daily application ceiling: <strong style={{ color: 'var(--ink)' }}>{settings.maximumApplicationsPerDay} per day</strong>
              <input
                type="number"
                min="1"
                max="25"
                className="doc-input"
                style={{ maxWidth: '160px', marginTop: '6px' }}
                value={settings.maximumApplicationsPerDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maximumApplicationsPerDay: parseInt(e.target.value, 10) || 5,
                  })
                }
              />
              <span className="doc-hint" style={{ marginTop: '4px' }}>
                Hard safety limit to prevent ATS rate limits and maintain high application quality.
              </span>
            </label>
          </div>
        </section>

        {/* Action button & status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? 'Saving preferences…' : 'Save preferences'} <span>→</span>
          </button>

          {message && (
            <span style={{ fontSize: '13px', color: '#15803d' }}>
              ✓ {message}
            </span>
          )}
          {error && (
            <span style={{ fontSize: '13px', color: '#dc2626' }}>
              {error}
            </span>
          )}
        </div>
      </form>
    </main>
  );
}
