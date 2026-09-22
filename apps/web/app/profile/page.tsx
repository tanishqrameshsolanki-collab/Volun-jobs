import Link from 'next/link';
import { loadCandidateProfile } from '../../lib/candidate-profile';
import { getProfileCompleteness, listUserInputRequired } from '@tanishq/shared';
import ProfileEditor from './profile-editor';

export default async function ProfilePage() {
  const profile = await loadCandidateProfile();
  const completeness = getProfileCompleteness(profile);
  const missing = listUserInputRequired(profile);
  return (
    <main className="profile-page">
      <div className="profile-head">
        <div>
          <Link className="back" href="/">
            ← Dashboard
          </Link>
          <p className="eyebrow accent">Candidate intelligence</p>
          <h1>Your profile</h1>
          <p className="lead">
            Facts from your resume stay traceable. Add the missing inputs that
            affect eligibility and application quality.
          </p>
        </div>
        <div className="profile-stat">
          <strong>{completeness.knownFacts}</strong>
          <span>known facts</span>
          <strong>{completeness.userInputRequired}</strong>
          <span>inputs needed</span>
        </div>
      </div>
      <div className="profile-layout">
        <section className="profile-facts">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Source of truth</p>
              <h2>Resume facts</h2>
            </div>
            <span className="muted">Read from supplied resume</span>
          </div>
          <div className="fact-block">
            <h3>{profile.personalInformation.fullName}</h3>
            <p>
              {profile.personalInformation.location} ·{' '}
              {profile.personalInformation.email} ·{' '}
              {profile.personalInformation.phone}
            </p>
          </div>
          <div className="fact-block">
            <h3>Education</h3>
            {profile.education.map((item) => (
              <p key={item.institution}>
                {item.degree} · {item.institution} · Expected{' '}
                {item.expectedGraduationYear}
              </p>
            ))}
          </div>
          <div className="fact-block">
            <h3>Experience</h3>
            {profile.experience.map((item) => (
              <p key={`${item.company}-${item.startDate}`}>
                {item.title} · {item.company} · {item.startDate}–Present
              </p>
            ))}
          </div>
          <div className="fact-block">
            <h3>Projects</h3>
            {profile.projects.map((item) => (
              <p key={item.name}>
                {item.name} · {item.description}
              </p>
            ))}
          </div>
          <div className="fact-block">
            <h3>Skill groups</h3>
            <div className="skill-list">
              {Object.entries(profile.skills).flatMap(([group, skills]) =>
                skills.map((skill) => (
                  <span key={`${group}-${skill}`}>{skill}</span>
                )),
              )}
            </div>
          </div>
          <div className="fact-block">
            <h3>Application constraints</h3>
            <p>
              Work authorization:{' '}
              {profile.constraints.workAuthorization ?? 'Not provided'}
            </p>
            <p>
              Sponsorship: {profile.constraints.sponsorship ?? 'Not provided'}
            </p>
          </div>
        </section>
        <section className="profile-edit" id="settings">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your inputs</p>
              <h2>Complete the profile</h2>
            </div>
          </div>
          <div className="notice">
            <strong>Still needed</strong>
            {missing.map((item) => (
              <span key={item}>· {item}</span>
            ))}
          </div>
          <ProfileEditor profile={profile} />
        </section>
      </div>
    </main>
  );
}
