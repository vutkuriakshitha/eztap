import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/onboarding.css';

// Pages where a pop-up would get in the way.
const QUIET_PATHS = ['/reset-password', '/forgot-password', '/login', '/signup'];

const SIDES = {
  customer: {
    title: 'Get it done by someone nearby',
    steps: [
      ['Post what you need', 'Add a title, budget and your city. It takes about a minute.'],
      ['Compare who applied', 'Every applicant has a profile: rating, reviews, skills and badges.'],
      ['Hire, track and rate', 'Choose one person, follow the task to the end, then leave a review.'],
    ],
    cta: ['Post my first task', '/post-task'],
  },
  helper: {
    title: 'Turn your skills into local work',
    steps: [
      ['Find tasks in your city', 'Browse open tasks and look for the work you do best.'],
      ['Apply with a short note', 'Tell the customer why you are the right person.'],
      ['Build your reputation', 'Each finished task adds a review to your public profile.'],
    ],
    cta: ['Find work near me', '/browse-tasks'],
  },
};

const BADGES = [
  ['verified-b', '✔ Verified', 'Signed in with Google or a confirmed email.'],
  ['community-b', '🤝 Community trusted', 'Vouched for by other members or past customers.'],
  ['trusted-b', '★ Trusted', 'Reviewed by hand by the EZTAP team.'],
];

export default function Onboarding() {
  const { user, profile, setMode, saveProfile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [side, setSide] = useState('customer');
  const [dismissed, setDismissed] = useState(false); // this browser session
  const dialogRef = useRef(null);

  const total = 4;
  const needsTour = !!user && !!profile && profile.onboarded !== true && !dismissed;
  const quiet = QUIET_PATHS.includes(pathname);

  // Open automatically the first time; also open when "Replay the tour" is pressed.
  useEffect(() => {
    if (needsTour && !quiet) { setSide(profile.mode === 'helper' ? 'helper' : 'customer'); setOpen(true); }
  }, [needsTour, quiet, profile?.mode]);

  useEffect(() => {
    const replay = () => { setStep(0); setSide(profile?.mode === 'helper' ? 'helper' : 'customer'); setOpen(true); };
    window.addEventListener('eztap:tour', replay);
    return () => window.removeEventListener('eztap:tour', replay);
  }, [profile?.mode]);

  const close = useCallback(async (path) => {
    setOpen(false); setDismissed(true); setStep(0);
    try { await saveProfile({ onboarded: true, mode: side }); } catch { /* the tour just shows again next time */ }
    if (path) navigate(path);
  }, [saveProfile, side, navigate]);

  // Keyboard: Esc closes, focus moves into the dialog, page behind does not scroll.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, close]);

  if (!open) return null;

  const s = SIDES[side];
  const pick = (value) => { setSide(value); setMode(value).catch(() => {}); };

  return (
    <div className="ob-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="ob-dialog" role="dialog" aria-modal="true" aria-labelledby="ob-title" tabIndex={-1} ref={dialogRef}>
        <button className="ob-skip" onClick={() => close()}>Skip tour</button>

        <div className="ob-body" key={step}>
          {step === 0 && (
            <>
              <div className="ob-art ob-art-flow" aria-hidden="true">
                <div className="ob-node ob-n1"><span>📝</span>Post</div>
                <i className="ob-line ob-l1" />
                <div className="ob-node ob-n2"><span>👥</span>Applicants</div>
                <i className="ob-line ob-l2" />
                <div className="ob-node ob-n3"><span>✅</span>Done</div>
              </div>
              <h2 id="ob-title">welcome to eztap{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}.</h2>
              <p className="ob-text">EZTAP connects people who need an everyday task done with trusted neighbours who can do it. Plumbing, cleaning, tutoring, deliveries and more, all in your city.</p>
            </>
          )}

          {step === 1 && (
            <>
              <h2 id="ob-title">how will you use it?</h2>
              <p className="ob-text">You can do both with one account and switch any time from the top bar.</p>
              <div className="ob-choices">
                <button className={`ob-choice ${side === 'customer' ? 'on' : ''}`} onClick={() => pick('customer')} aria-pressed={side === 'customer'}>
                  <b>I need a hand</b><span>Post a task and hire someone nearby.</span>
                </button>
                <button className={`ob-choice ${side === 'helper' ? 'on' : ''}`} onClick={() => pick('helper')} aria-pressed={side === 'helper'}>
                  <b>I want to earn</b><span>Find tasks and get hired for your skills.</span>
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 id="ob-title">{s.title.toLowerCase()}.</h2>
              <ol className="ob-steps">
                {s.steps.map(([t, d], i) => (
                  <li key={t} style={{ '--i': i }}>
                    <span className="ob-num">{i + 1}</span>
                    <div><b>{t}</b><p>{d}</p></div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {step === 3 && (
            <>
              <h2 id="ob-title">know who you can trust.</h2>
              <p className="ob-text">Every helper shows badges, so you can see how much trust they have earned.</p>
              <ul className="ob-badges">
                {BADGES.map(([cls, label, desc], i) => (
                  <li key={label} style={{ '--i': i }}>
                    <span className={`badge ${cls}`}>{label}</span>
                    <p>{desc}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="ob-foot">
          <div className="ob-dots" aria-label={`Step ${step + 1} of ${total}`}>
            {Array.from({ length: total }).map((_, i) => <i key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />)}
          </div>
          <div className="ob-actions">
            {step > 0 && <button className="btn btn-outline" onClick={() => setStep(step - 1)}>Back</button>}
            {step < total - 1
              ? <button className="btn btn-solid" onClick={() => setStep(step + 1)}>Next</button>
              : <button className="btn btn-solid" onClick={() => close(s.cta[1])}>{s.cta[0]}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
