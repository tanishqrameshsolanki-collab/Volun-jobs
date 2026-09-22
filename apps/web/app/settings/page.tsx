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
      <main className="profile-page">
        <p className="quiet-state">Loading user settings…</p>
      </main>
    );
  }

  return (
    <main className="profile-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link className="back" href="/command-center">
        ← Command Center
      </Link>
      <p className="eyebrow accent">Preferences &amp; Guardrails</p>
      <h1>Application Settings</h1>
      <p className="lead">
        Configure your match scoring criteria, volume limits, and job targeting filters.
      </p>

      <form className="editor" onSubmit={handleSave}>
        <section>
          <h2>Targeting Preferences</h2>
          <label>
            Target Job Roles <small>(One per line)</small>
            <textarea
              rows={4}
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

          <label>
            Preferred Locations <small>(One per line)</small>
            <textarea
              rows={3}
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

          <label>
            Remote Preference
            <select
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
        </section>

        <section style={{ marginTop: '24px' }}>
          <h2>Company Filters</h2>
          <label>
            Target Companies <small>(Optional whitelist — one per line)</small>
            <textarea
              rows={3}
              value={settings.targetCompanies.join('\n')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  targetCompanies: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="Leave empty to match all companies"
            />
          </label>

          <label>
            Excluded Companies <small>(Blacklist — one per line)</small>
            <textarea
              rows={3}
              value={settings.excludedCompanies.join('\n')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  excludedCompanies: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="Companies you never want to apply to"
            />
          </label>
        </section>

        <section style={{ marginTop: '24px' }}>
          <h2>Scoring &amp; Guardrails</h2>
          <label>
            Minimum Match Score: <strong>{settings.minimumMatchScore}%</strong>
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
            />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Jobs scoring below this threshold are marked as INELIGIBLE and skipped.
            </span>
          </label>

          <label style={{ marginTop: '16px' }}>
            Maximum Daily Applications: <strong>{settings.maximumApplicationsPerDay}</strong>
            <input
              type="number"
              min="1"
              max="25"
              value={settings.maximumApplicationsPerDay}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maximumApplicationsPerDay: parseInt(e.target.value, 10) || 5,
                })
              }
            />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Safety ceiling to avoid ATS rate-limiting and protect sender reputation.
            </span>
          </label>
        </section>

        <button className="primary-button" disabled={saving} type="submit" style={{ marginTop: '24px' }}>
          {saving ? 'Saving changes…' : 'Save Preferences'} <span>→</span>
        </button>

        {error && (
          <p style={{ marginTop: '16px', color: '#dc2626', fontWeight: 500 }} role="alert">
            ⚠️ {error}
          </p>
        )}
        {message && (
          <p className="save-status" role="status" style={{ marginTop: '16px' }}>
            ✓ {message}
          </p>
        )}
      </form>
    </main>
  );
}
