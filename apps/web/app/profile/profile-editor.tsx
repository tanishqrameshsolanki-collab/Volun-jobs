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
  const update = (change: Partial<CandidateProfile['personalInformation']>) =>
    setDraft((current) => ({
      ...current,
      personalInformation: { ...current.personalInformation, ...change },
    }));
  const save = async () => {
    setStatus('Saving…');
    const response = await fetch('/api/candidate-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setStatus(response.ok ? 'Saved locally' : 'Could not save');
  };
  return (
    <div className="editor">
      <label>
        Full name
        <input
          value={draft.personalInformation.fullName}
          onChange={(event) => update({ fullName: event.target.value })}
        />
      </label>
      <label>
        Location
        <input
          value={draft.personalInformation.location}
          onChange={(event) => update({ location: event.target.value })}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={draft.personalInformation.email}
          onChange={(event) => update({ email: event.target.value })}
        />
      </label>
      <label>
        Phone
        <input
          value={draft.personalInformation.phone}
          onChange={(event) => update({ phone: event.target.value })}
        />
      </label>
      <label>
        Target roles <small>One role per line</small>
        <textarea
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
          placeholder="Software Engineering Intern\nAI/ML Intern"
        />
      </label>
      <label>
        Target locations <small>One location per line</small>
        <textarea
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
        />
      </label>
      <label>
        Target companies <small>One company per line</small>
        <textarea
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
          placeholder="Anthropic\nDatabricks"
        />
      </label>
      <label>
        Remote preference
        <select
          value={draft.preferences.remotePreference}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              preferences: {
                ...current.preferences,
                remotePreference: event.target
                  .value as CandidateProfile['preferences']['remotePreference'],
                status: 'KNOWN_FACT',
              },
            }))
          }
        >
          <option value="USER_INPUT_REQUIRED">Choose…</option>
          <option value="PREFERRED">Preferred</option>
          <option value="NEUTRAL">Neutral</option>
          <option value="AVOID">Avoid</option>
        </select>
      </label>
      <label>
        Work authorization <small>Use only your confirmed answer</small>
        <input
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
          placeholder="Example: Authorized to work in India"
        />
      </label>
      <label>
        Sponsorship requirement <small>Use only your confirmed answer</small>
        <input
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
          placeholder="Example: May require sponsorship"
        />
      </label>
      <label>
        Links{' '}
        <small>One label=url per line; URLs are optional until confirmed</small>
        <textarea
          value={draft.links
            .map((link) => `${link.label}=${link.url ?? ''}`)
            .join('\n')}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              links: splitLines(event.target.value).map((line) => {
                const separator = line.indexOf('=');
                const label =
                  separator === -1 ? line : line.slice(0, separator).trim();
                const url =
                  separator === -1
                    ? undefined
                    : line.slice(separator + 1).trim() || undefined;
                return {
                  label,
                  url,
                  status: url ? 'KNOWN_FACT' : 'USER_INPUT_REQUIRED',
                };
              }),
            }))
          }
        />
      </label>
      <button className="primary-button" onClick={save}>
        Save profile <span>→</span>
      </button>
      {status && <span className="save-status">{status}</span>}
    </div>
  );
}
