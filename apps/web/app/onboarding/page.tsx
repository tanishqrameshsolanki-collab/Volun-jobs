'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import type { CandidateProfile } from '@tanishq/shared';

const STEPS = [
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Education' },
  { id: 3, label: 'Experience' },
  { id: 4, label: 'Projects' },
  { id: 5, label: 'Skills' },
  { id: 6, label: 'Preferences' },
  { id: 7, label: 'Resume' },
  { id: 8, label: 'Review' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Candidate draft state conforming to CandidateProfile
  const [profile, setProfile] = useState<CandidateProfile>({
    schemaVersion: 1,
    personalInformation: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      status: 'KNOWN_FACT',
    },
    education: [
      {
        institution: '',
        degree: 'Bachelor of Science in Computer Science',
        expectedGraduationYear: 2026,
        relevantCoursework: ['Data Structures & Algorithms', 'Operating Systems', 'Distributed Systems'],
        status: 'KNOWN_FACT',
      },
    ],
    experience: [
      {
        company: '',
        title: '',
        location: 'Remote',
        startDate: '2024-01',
        endDate: 'Present',
        bullets: ['Architected scalable API endpoints with TypeScript and PostgreSQL.'],
        status: 'KNOWN_FACT',
      },
    ],
    projects: [
      {
        name: '',
        description: '',
        date: '2024',
        url: 'https://github.com',
        bullets: ['Built full-stack application with real-time streaming and high performance.'],
        status: 'KNOWN_FACT',
      },
    ],
    skills: {
      languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL'],
      frontend: ['React', 'Next.js', 'TailwindCSS', 'HTML5', 'CSS3'],
      backend: ['Node.js', 'Express', 'FastAPI', 'PostgreSQL', 'Redis'],
      dataAndAI: ['LLMs', 'Vector Embeddings', 'RAG', 'PyTorch'],
      cloudAndDevops: ['Docker', 'AWS', 'Git', 'GitHub Actions', 'Linux'],
    },
    links: [
      { label: 'LinkedIn', url: '', status: 'KNOWN_FACT' },
      { label: 'GitHub', url: '', status: 'KNOWN_FACT' },
      { label: 'Portfolio', url: '', status: 'KNOWN_FACT' },
    ],
    preferences: {
      targetRoles: ['Software Engineer', 'Full Stack Engineer', 'Backend Engineer', 'AI Engineer'],
      targetCompanies: [],
      targetLocations: ['Remote', 'Hybrid'],
      remotePreference: 'PREFERRED',
      status: 'KNOWN_FACT',
    },
    constraints: {
      workAuthorization: 'Authorized to work without restriction',
      sponsorship: 'No sponsorship required',
      status: 'KNOWN_FACT',
    },
  });

  // Resume status in onboarding
  const [resumeMode, setResumeMode] = useState<'template' | 'upload'>('template');
  const [resumeFileName, setResumeFileName] = useState('resume_master.docx (Verified Template)');

  // Auto-fill user email from active session
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res: { data?: { user?: { email?: string } } }) => {
      if (res?.data?.user?.email) {
        setProfile((prev) => ({
          ...prev,
          personalInformation: {
            ...prev.personalInformation,
            email: res.data?.user?.email ?? '',
          },
        }));
      }
    });
  }, []);

  function handleNext() {
    setError('');
    // Step validations
    if (step === 1) {
      if (!profile.personalInformation.fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!profile.personalInformation.email.trim()) {
        setError('Please enter your email address.');
        return;
      }
    }
    if (step === 2) {
      if (!profile.education[0]?.institution.trim()) {
        setError('Please enter your institution or university.');
        return;
      }
    }
    if (step < 8) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    setError('');

    // Clean up empty experience/projects
    const cleanProfile: CandidateProfile = {
      ...profile,
      education: profile.education.filter((e) => e.institution.trim().length > 0),
      experience: profile.experience.filter((e) => e.company.trim().length > 0),
      projects: profile.projects.filter((p) => p.name.trim().length > 0),
      links: profile.links.filter((l) => (l.url ?? '').trim().length > 0),
    };

    // Ensure at least 1 education entry
    if (cleanProfile.education.length === 0) {
      cleanProfile.education = [
        {
          institution: 'University',
          degree: 'Bachelor of Science',
          expectedGraduationYear: 2026,
          relevantCoursework: [],
          status: 'KNOWN_FACT',
        },
      ];
    }

    try {
      const res = await fetch('/api/candidate-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanProfile),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save profile');
      }

      // Redirection to command center
      router.push('/command-center');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error completing onboarding');
      setSubmitting(false);
    }
  }

  return (
    <main className="profile-page" style={{ maxWidth: '840px', margin: '0 auto', padding: '40px 24px' }}>
      <div className="profile-head">
        <div>
          <p className="eyebrow accent">Step {step} of 8 — Onboarding Wizard</p>
          <h1>Welcome to Volun jobs</h1>
          <p className="lead">
            Complete your candidate profile to enable deterministic job matching, auto-tailoring, and guarded application submission.
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          background: 'var(--surface)',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid var(--line)',
          overflowX: 'auto',
        }}
      >
        {STEPS.map((s) => (
          <div
            key={s.id}
            onClick={() => s.id < step && setStep(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: step === s.id ? 700 : 500,
              color: step === s.id ? 'var(--accent)' : step > s.id ? 'var(--ink)' : 'var(--muted)',
              cursor: s.id < step ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                display: 'inline-grid',
                placeItems: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                fontSize: '11px',
                background: step === s.id ? 'var(--accent)' : step > s.id ? 'var(--accent-soft)' : 'var(--wash)',
                color: step === s.id ? '#fff' : 'inherit',
              }}
            >
              {step > s.id ? '✓' : s.id}
            </span>
            {s.label}
          </div>
        ))}
      </div>

      {error && (
        <p style={{ color: '#dc2626', marginBottom: '20px', fontWeight: 500 }} role="alert">
          ⚠️ {error}
        </p>
      )}

      {/* STEP 1: Personal Information */}
      {step === 1 && (
        <section className="editor">
          <h2>Step 1: Personal Information</h2>
          <label>
            Full Name *
            <input
              type="text"
              required
              value={profile.personalInformation.fullName}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  personalInformation: { ...profile.personalInformation, fullName: e.target.value },
                })
              }
              placeholder="Alex Smith"
            />
          </label>
          <label>
            Email Address *
            <input
              type="email"
              required
              value={profile.personalInformation.email}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  personalInformation: { ...profile.personalInformation, email: e.target.value },
                })
              }
              placeholder="alex@example.com"
            />
          </label>
          <label>
            Phone Number
            <input
              type="tel"
              value={profile.personalInformation.phone}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  personalInformation: { ...profile.personalInformation, phone: e.target.value },
                })
              }
              placeholder="+1 (555) 000-0000"
            />
          </label>
          <label>
            Location (City, Country)
            <input
              type="text"
              value={profile.personalInformation.location}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  personalInformation: { ...profile.personalInformation, location: e.target.value },
                })
              }
              placeholder="San Francisco, CA or Remote"
            />
          </label>
          <label>
            LinkedIn Profile URL
            <input
              type="url"
              value={profile.links.find((l) => l.label === 'LinkedIn')?.url ?? ''}
              onChange={(e) => {
                const url = e.target.value;
                setProfile({
                  ...profile,
                  links: [
                    ...profile.links.filter((l) => l.label !== 'LinkedIn'),
                    { label: 'LinkedIn', url, status: 'KNOWN_FACT' },
                  ],
                });
              }}
              placeholder="https://www.linkedin.com/in/username"
            />
          </label>
          <label>
            GitHub Profile URL
            <input
              type="url"
              value={profile.links.find((l) => l.label === 'GitHub')?.url ?? ''}
              onChange={(e) => {
                const url = e.target.value;
                setProfile({
                  ...profile,
                  links: [
                    ...profile.links.filter((l) => l.label !== 'GitHub'),
                    { label: 'GitHub', url, status: 'KNOWN_FACT' },
                  ],
                });
              }}
              placeholder="https://github.com/username"
            />
          </label>
        </section>
      )}

      {/* STEP 2: Education */}
      {step === 2 && (
        <section className="editor">
          <h2>Step 2: Education</h2>
          <label>
            Institution / University *
            <input
              type="text"
              required
              value={profile.education[0]?.institution ?? ''}
              onChange={(e) => {
                const current = profile.education[0] ?? {
                  institution: '',
                  degree: '',
                  expectedGraduationYear: 2026,
                  relevantCoursework: [],
                  status: 'KNOWN_FACT',
                };
                setProfile({
                  ...profile,
                  education: [{ ...current, institution: e.target.value }],
                });
              }}
              placeholder="Stanford University / UC Berkeley"
            />
          </label>
          <label>
            Degree & Major
            <input
              type="text"
              value={profile.education[0]?.degree ?? ''}
              onChange={(e) => {
                const current = profile.education[0]!;
                setProfile({
                  ...profile,
                  education: [{ ...current, degree: e.target.value }],
                });
              }}
              placeholder="Bachelor of Science in Computer Science"
            />
          </label>
          <label>
            Graduation Year
            <input
              type="number"
              min={1990}
              max={2035}
              value={profile.education[0]?.expectedGraduationYear ?? 2026}
              onChange={(e) => {
                const current = profile.education[0]!;
                setProfile({
                  ...profile,
                  education: [{ ...current, expectedGraduationYear: parseInt(e.target.value, 10) || 2026 }],
                });
              }}
            />
          </label>
          <label>
            Relevant Coursework <small>(Comma-separated)</small>
            <input
              type="text"
              value={profile.education[0]?.relevantCoursework?.join(', ') ?? ''}
              onChange={(e) => {
                const current = profile.education[0]!;
                setProfile({
                  ...profile,
                  education: [
                    {
                      ...current,
                      relevantCoursework: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  ],
                });
              }}
              placeholder="Data Structures, Algorithms, Systems Programming, Machine Learning"
            />
          </label>
        </section>
      )}

      {/* STEP 3: Experience */}
      {step === 3 && (
        <section className="editor">
          <h2>Step 3: Work Experience</h2>
          <p className="lead" style={{ fontSize: '14px', marginBottom: '16px' }}>
            Add your recent software engineering or internship experience.
          </p>
          {profile.experience.map((exp, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--line)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Company Name
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => {
                      const updated = [...profile.experience];
                      updated[idx] = { ...updated[idx]!, company: e.target.value };
                      setProfile({ ...profile, experience: updated });
                    }}
                    placeholder="Acme Corp"
                  />
                </label>
                <label>
                  Job Title
                  <input
                    type="text"
                    value={exp.title}
                    onChange={(e) => {
                      const updated = [...profile.experience];
                      updated[idx] = { ...updated[idx]!, title: e.target.value };
                      setProfile({ ...profile, experience: updated });
                    }}
                    placeholder="Software Engineer Intern"
                  />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Start Date
                  <input
                    type="text"
                    value={exp.startDate}
                    onChange={(e) => {
                      const updated = [...profile.experience];
                      updated[idx] = { ...updated[idx]!, startDate: e.target.value };
                      setProfile({ ...profile, experience: updated });
                    }}
                    placeholder="2024-01"
                  />
                </label>
                <label>
                  End Date
                  <input
                    type="text"
                    value={exp.endDate ?? 'Present'}
                    onChange={(e) => {
                      const updated = [...profile.experience];
                      updated[idx] = { ...updated[idx]!, endDate: e.target.value };
                      setProfile({ ...profile, experience: updated });
                    }}
                    placeholder="Present"
                  />
                </label>
              </div>
              <label>
                Bullet Points / Impact <small>(One bullet per line)</small>
                <textarea
                  rows={4}
                  value={exp.bullets.join('\n')}
                  onChange={(e) => {
                    const updated = [...profile.experience];
                    updated[idx] = {
                      ...updated[idx]!,
                      bullets: e.target.value.split('\n').map((b) => b.trim()).filter(Boolean),
                    };
                    setProfile({ ...profile, experience: updated });
                  }}
                  placeholder="Architected streaming REST API endpoints reducing p95 latency by 35%."
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setProfile({
                ...profile,
                experience: [
                  ...profile.experience,
                  {
                    company: '',
                    title: '',
                    location: 'Remote',
                    startDate: '2023-01',
                    endDate: '2023-08',
                    bullets: [],
                    status: 'KNOWN_FACT',
                  },
                ],
              })
            }
          >
            + Add Another Experience
          </button>
        </section>
      )}

      {/* STEP 4: Projects */}
      {step === 4 && (
        <section className="editor">
          <h2>Step 4: Notable Projects</h2>
          <p className="lead" style={{ fontSize: '14px', marginBottom: '16px' }}>
            Highlight production projects, open-source work, or apps you have shipped.
          </p>
          {profile.projects.map((proj, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--line)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Project Name
                  <input
                    type="text"
                    value={proj.name}
                    onChange={(e) => {
                      const updated = [...profile.projects];
                      updated[idx] = { ...updated[idx]!, name: e.target.value };
                      setProfile({ ...profile, projects: updated });
                    }}
                    placeholder="Real-Time Engine"
                  />
                </label>
                <label>
                  Project URL / Repository
                  <input
                    type="url"
                    value={proj.url ?? ''}
                    onChange={(e) => {
                      const updated = [...profile.projects];
                      updated[idx] = { ...updated[idx]!, url: e.target.value };
                      setProfile({ ...profile, projects: updated });
                    }}
                    placeholder="https://github.com/username/project"
                  />
                </label>
              </div>
              <label>
                Description
                <input
                  type="text"
                  value={proj.description}
                  onChange={(e) => {
                    const updated = [...profile.projects];
                    updated[idx] = { ...updated[idx]!, description: e.target.value };
                    setProfile({ ...profile, projects: updated });
                  }}
                  placeholder="High concurrency event stream processor built with Go and Redis."
                />
              </label>
              <label>
                Key Highlights / Bullets <small>(One per line)</small>
                <textarea
                  rows={3}
                  value={proj.bullets.join('\n')}
                  onChange={(e) => {
                    const updated = [...profile.projects];
                    updated[idx] = {
                      ...updated[idx]!,
                      bullets: e.target.value.split('\n').map((b) => b.trim()).filter(Boolean),
                    };
                    setProfile({ ...profile, projects: updated });
                  }}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setProfile({
                ...profile,
                projects: [
                  ...profile.projects,
                  {
                    name: '',
                    description: '',
                    date: '2024',
                    url: 'https://github.com',
                    bullets: [],
                    status: 'KNOWN_FACT',
                  },
                ],
              })
            }
          >
            + Add Another Project
          </button>
        </section>
      )}

      {/* STEP 5: Skills */}
      {step === 5 && (
        <section className="editor">
          <h2>Step 5: Technical Skills</h2>
          <label>
            Programming Languages <small>(Comma-separated)</small>
            <input
              type="text"
              value={profile.skills.languages?.join(', ') ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  skills: {
                    ...profile.skills,
                    languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
          <label>
            Frontend Frameworks &amp; Libraries
            <input
              type="text"
              value={profile.skills.frontend?.join(', ') ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  skills: {
                    ...profile.skills,
                    frontend: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
          <label>
            Backend &amp; Databases
            <input
              type="text"
              value={profile.skills.backend?.join(', ') ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  skills: {
                    ...profile.skills,
                    backend: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
          <label>
            AI, Machine Learning &amp; Data
            <input
              type="text"
              value={profile.skills.dataAndAI?.join(', ') ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  skills: {
                    ...profile.skills,
                    dataAndAI: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
          <label>
            Cloud, DevOps &amp; Tools
            <input
              type="text"
              value={profile.skills.cloudAndDevops?.join(', ') ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  skills: {
                    ...profile.skills,
                    cloudAndDevops: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
        </section>
      )}

      {/* STEP 6: Preferences & Constraints */}
      {step === 6 && (
        <section className="editor">
          <h2>Step 6: Preferences &amp; Eligibility</h2>
          <label>
            Target Roles <small>(One per line)</small>
            <textarea
              rows={4}
              value={profile.preferences.targetRoles.join('\n')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  preferences: {
                    ...profile.preferences,
                    targetRoles: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
          <label>
            Target Locations <small>(One per line)</small>
            <textarea
              rows={3}
              value={profile.preferences.targetLocations.join('\n')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  preferences: {
                    ...profile.preferences,
                    targetLocations: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
          <label>
            Remote Preference
            <select
              value={profile.preferences.remotePreference}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  preferences: {
                    ...profile.preferences,
                    remotePreference: e.target.value as 'PREFERRED' | 'NEUTRAL' | 'AVOID',
                  },
                })
              }
            >
              <option value="PREFERRED">Preferred (Prioritize 100% remote roles)</option>
              <option value="NEUTRAL">Neutral (Open to remote, hybrid, or onsite)</option>
              <option value="AVOID">Avoid (Prefer strictly onsite)</option>
            </select>
          </label>
          <label>
            Work Authorization
            <input
              type="text"
              value={profile.constraints.workAuthorization ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  constraints: { ...profile.constraints, workAuthorization: e.target.value },
                })
              }
            />
          </label>
          <label>
            Visa Sponsorship Required
            <select
              value={profile.constraints.sponsorship?.includes('No') ? 'NO' : 'YES'}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  constraints: {
                    ...profile.constraints,
                    sponsorship:
                      e.target.value === 'NO'
                        ? 'No sponsorship required'
                        : 'Yes, will require visa sponsorship',
                  },
                })
              }
            >
              <option value="NO">No, I do not require sponsorship</option>
              <option value="YES">Yes, I will require sponsorship now or in the future</option>
            </select>
          </label>
        </section>
      )}

      {/* STEP 7: Master Resume */}
      {step === 7 && (
        <section className="editor">
          <h2>Step 7: Master Resume</h2>
          <p className="lead" style={{ fontSize: '14px', marginBottom: '20px' }}>
            Choose how your master resume is provided for tailoring variants across AI, Graphics, Backend, and Full-Stack roles.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div
              onClick={() => setResumeMode('template')}
              style={{
                border: resumeMode === 'template' ? '2px solid var(--accent)' : '1px solid var(--line)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                background: resumeMode === 'template' ? 'var(--accent-soft)' : 'var(--surface)',
              }}
            >
              <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Verified Master Template</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Use the verified standard DOCX template pre-calibrated for ATS parsing and deterministic scoring.
              </p>
            </div>
            <div
              onClick={() => setResumeMode('upload')}
              style={{
                border: resumeMode === 'upload' ? '2px solid var(--accent)' : '1px solid var(--line)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                background: resumeMode === 'upload' ? 'var(--accent-soft)' : 'var(--surface)',
              }}
            >
              <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Custom Resume Upload</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Upload your existing master resume (.docx or .pdf) to attach to all prepared applications.
              </p>
            </div>
          </div>

          {resumeMode === 'upload' ? (
            <label>
              Upload Master Resume (.docx or .pdf)
              <input
                type="file"
                accept=".docx,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setResumeFileName(e.target.files[0].name);
                  }
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                Selected: {resumeFileName}
              </span>
            </label>
          ) : (
            <div
              style={{
                padding: '14px',
                borderRadius: '6px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
              }}
            >
              <span style={{ fontWeight: 600 }}>Active Resume:</span> {resumeFileName}
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '6px 0 0 0' }}>
                Ready to generate role-specialized variants (AI, Systems, Full-Stack) during the scanning cycle.
              </p>
            </div>
          )}
        </section>
      )}

      {/* STEP 8: Review & Activation */}
      {step === 8 && (
        <section className="editor">
          <h2>Step 8: Review &amp; Activate</h2>
          <p className="lead" style={{ fontSize: '14px', marginBottom: '20px' }}>
            Review your candidate configuration. Once activated, your private workspace will be initialized.
          </p>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '20px',
              display: 'grid',
              gap: '12px',
              fontSize: '14px',
              marginBottom: '24px',
            }}
          >
            <div>
              <strong>Candidate:</strong> {profile.personalInformation.fullName} ({profile.personalInformation.email})
            </div>
            <div>
              <strong>Location:</strong> {profile.personalInformation.location || 'Remote'}
            </div>
            <div>
              <strong>Education:</strong> {profile.education[0]?.degree} from {profile.education[0]?.institution}
            </div>
            <div>
              <strong>Target Roles:</strong> {profile.preferences.targetRoles.join(', ')}
            </div>
            <div>
              <strong>Remote Preference:</strong> {profile.preferences.remotePreference}
            </div>
            <div>
              <strong>Master Resume:</strong> {resumeFileName}
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            disabled={submitting}
            onClick={handleComplete}
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            {submitting ? 'Activating your workspace…' : 'Complete Onboarding & Enter Command Center'} <span>→</span>
          </button>
        </section>
      )}

      {/* Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid var(--line)',
        }}
      >
        <button
          type="button"
          className="secondary-button"
          disabled={step === 1 || submitting}
          onClick={handleBack}
        >
          ← Back
        </button>
        {step < 8 && (
          <button type="button" className="primary-button" onClick={handleNext}>
            Continue to {STEPS[step]?.label} →
          </button>
        )}
      </div>
    </main>
  );
}
