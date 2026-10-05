'use client';

import { useState } from 'react';
import type { CandidateProfile } from '@tanishq/shared';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfileEditor({
  profile,
}: {
  profile: CandidateProfile;
}) {
  const [draft, setDraft] = useState(profile);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (change: Partial<CandidateProfile['personalInformation']>) =>
    setDraft((current) => ({
      ...current,
      personalInformation: { ...current.personalInformation, ...change },
    }));

  const save = async () => {
    setSaving(true);
    setStatus('Saving…');
    try {
      const response = await fetch('/api/candidate-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      setStatus(response.ok ? 'Profile saved successfully' : 'Could not save profile');
    } catch {
      setStatus('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doc-form">
      {/* Contact Override */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <label className="doc-label">
          Full name
          <input
            className="doc-input"
            value={draft.personalInformation.fullName}
            onChange={(event) => update({ fullName: event.target.value })}
          />
        </label>
        <label className="doc-label">
          Location
          <input
            className="doc-input"
            value={draft.personalInformation.location}
            onChange={(event) => update({ location: event.target.value })}
          />
        </label>
        <label className="doc-label">
          Email
          <input
            type="email"
            className="doc-input"
            value={draft.personalInformation.email}
            onChange={(event) => update({ email: event.target.value })}
          />
        </label>
        <label className="doc-label">
          Phone
          <input
            className="doc-input"
            value={draft.personalInformation.phone}
            onChange={(event) => update({ phone: event.target.value })}
          />
        </label>
      </div>

      {/* Target Criteria */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <label className="doc-label">
          Target roles <span className="doc-hint">One role per line</span>
          <textarea
            rows={4}
            className="doc-textarea"
            value={draft.preferences.targetRoles.join('\n')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  targetRoles: splitLines(event.target.value),
                  status: 'KNOWN_FACT',
                },
              }))
            }
            placeholder="Software Engineer Intern&#10;Full Stack Developer&#10;AI Engineer"
          />
        </label>

        <label className="doc-label">
          Target locations <span className="doc-hint">One location per line</span>
          <textarea
            rows={4}
            className="doc-textarea"
            value={draft.preferences.targetLocations.join('\n')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  targetLocations: splitLines(event.target.value),
                  status: 'KNOWN_FACT',
                },
              }))
            }
            placeholder="Remote&#10;San Francisco, CA&#10;Bengaluru, India"
          />
        </label>

        <label className="doc-label">
          Target companies <span className="doc-hint">One company per line</span>
          <textarea
            rows={4}
            className="doc-textarea"
            value={draft.preferences.targetCompanies.join('\n')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  targetCompanies: splitLines(event.target.value),
                  status: 'KNOWN_FACT',
                },
              }))
            }
            placeholder="Anthropic&#10;Databricks&#10;Stripe"
          />
        </label>
      </div>

      {/* Work Authorization & Constraints */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <label className="doc-label">
          Remote preference
          <select
            className="doc-select"
            value={draft.preferences.remotePreference}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  remotePreference: event.target.value as CandidateProfile['preferences']['remotePreference'],
                  status: 'KNOWN_FACT',
                },
              }))
            }
          >
            <option value="USER_INPUT_REQUIRED">Choose…</option>
            <option value="PREFERRED">Preferred (Prioritize remote)</option>
            <option value="NEUTRAL">Neutral (Open to all)</option>
            <option value="AVOID">Avoid (Strictly onsite)</option>
          </select>
        </label>

        <label className="doc-label">
          Work authorization
          <input
            className="doc-input"
            value={draft.constraints.workAuthorization ?? ''}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                constraints: {
                  ...current.constraints,
                  workAuthorization: event.target.value || undefined,
                  status: 'KNOWN_FACT',
                },
              }))
            }
            placeholder="e.g. Authorized to work in India"
          />
        </label>

        <label className="doc-label">
          Sponsorship requirement
          <input
            className="doc-input"
            value={draft.constraints.sponsorship ?? ''}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                constraints: {
                  ...current.constraints,
                  sponsorship: event.target.value || undefined,
                  status: 'KNOWN_FACT',
                },
              }))
            }
            placeholder="e.g. None required / Will require F-1 OPT"
          />
        </label>
      </div>

      {/* Portfolio & Verified Links */}
      <label className="doc-label" style={{ marginBottom: '24px' }}>
        Profile &amp; portfolio links <span className="doc-hint">One per line, formatted as label=url</span>
        <textarea
          rows={3}
          className="doc-textarea"
          value={draft.links
            .map((link) => `${link.label}=${link.url ?? ''}`)
            .join('\n')}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              links: splitLines(event.target.value).map((line) => {
                const separator = line.indexOf('=');
                const label = separator === -1 ? line : line.slice(0, separator).trim();
                const url = separator === -1 ? undefined : line.slice(separator + 1).trim() || undefined;
                return {
                  label,
                  url,
                  status: url ? 'KNOWN_FACT' : 'USER_INPUT_REQUIRED',
                };
              }),
            }))
          }
          placeholder="GitHub=https://github.com/...&#10;LinkedIn=https://linkedin.com/in/..."
        />
      </label>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button className="primary-button" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save profile'} <span>→</span>
        </button>
        {status && (
          <span style={{ fontSize: '13px', color: status.includes('success') ? '#15803d' : 'var(--muted)' }}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
