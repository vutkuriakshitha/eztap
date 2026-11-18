import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOpenTasks } from '../lib/data';
import { Stars } from './HelperProfile';
import '../styles/landing.css';

const CATEGORIES = [
  'Cleaning', 'Cooking help', 'Plumbing', 'Electrical', 'Tutoring', 'Beauty services', 'Gardening',
  'Tech support', 'Pet care', 'Delivery', 'Home repair', 'Carpentry', 'Appliance repair', 'Elderly care',
  'Babysitting', 'Event help', 'Photography', 'Car wash', 'Laundry & ironing', 'Fitness trainer',
];

const SIDES = {
  hire: {
    label: 'I need a hand',
    title: 'Get it done by someone nearby',
    steps: [
      ['Post what you need', 'A title, a budget and your city. It takes about a minute.'],
      ['Compare who applied', 'Each applicant brings a profile: rating, reviews, skills and a verified badge.'],
      ['Hire, track, rate', 'Pick one person, follow the task to completion, then leave a review.'],
    ],
    cta: ['Post a task', '/post-task'],
  },
  earn: {
    label: 'I want to earn',
    title: 'Turn your skills into local work',
    steps: [
      ['Find tasks in your city', 'Browse open tasks and filter by the work you do best.'],
      ['Apply with a short note', 'Say why you are a good fit. Verified helpers stand out first.'],
      ['Build your reputation', 'Every completed task adds a review to your public profile.'],
    ],
    cta: ['Find work', '/browse-tasks'],
  },
};

const ROADMAP = [
  ['live', 'Verified: Google or email', 'Sign in with Google or confirm your email to earn the Verified badge.'],
  ['live', 'Trusted: approved by a person', 'Helpers share a phone number and proof of work. An admin reviews it by hand.'],
  ['live', 'Community vouches', 'Verified members and past customers can vouch. Two vouches make a helper community trusted.'],
  ['soon', 'Phone OTP and ID check', 'Automatic phone and identity verification are planned next.'],
];

function useInView(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return seen;
}

function CountUp({ to, run }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || to === 0) { setN(to); return undefined; }
    let raf; const t0 = performance.now(); const dur = 1100;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{n}</>;
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [query, setQuery] = useState('');
  const [side, setSide] = useState('hire');
  const [openCount, setOpenCount] = useState(null);
  const numbersRef = useRef(null);
  const numbersSeen = useInView(numbersRef);

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  useEffect(() => {
    let active = true;
    getOpenTasks().then((t) => { if (active) setOpenCount(t.length); }).catch(() => {});
    return () => { active = false; };
  }, []);

  function search(e) {
    e.preventDefault();
    navigate('/browse-tasks' + (query ? `?q=${encodeURIComponent(query)}` : ''));
  }

  const s = SIDES[side];

  return (
    <div className="lp">
      {/* ---------- HERO ---------- */}
      <section className="lp-hero">
        <div className="lp-grain" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <h1>someone nearby can do&nbsp;that.</h1>
            <p className="lp-lede">Post a task in a minute. Verified neighbours apply with their ratings. You choose who to trust.</p>
            <form className="lp-search" onSubmit={search} role="search">
              <label htmlFor="lp-q" className="lp-sr">What do you need done?</label>
              <input id="lp-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Fix a leaking tap, deep clean a flat…" />
              <button type="submit">Find tasks</button>
            </form>
            <div className="lp-hero-links">
              <Link to={user ? '/post-task' : '/signup'} className="lp-link-strong">Post a task</Link>
              <span>or</span>
              <Link to="/browse-tasks" className="lp-link">browse open work</Link>
            </div>
          </div>

          <div className="lp-stage" aria-label="Example of a task being posted, applied to and hired">
            <div className="lp-ticket">
              <div className="lp-ticket-tag">sample task</div>
              <div className="lp-ticket-head">
                <h2>Fix leaking kitchen tap</h2>
                <div className="lp-ticket-meta">Plumbing · Hyderabad</div>
                <div className="lp-ticket-price">₹500</div>
              </div>
              <ul className="lp-applicants">
                <li style={{ '--d': '1.3s' }}>
                  <span className="lp-av">RK</span>
                  <span className="lp-who"><b>Ravi K.</b><i><Stars value={5} size=".7rem" /> 4.9 · 23 tasks</i></span>
                  <span className="lp-ver">✔ verified</span>
                </li>
                <li style={{ '--d': '2.1s' }} className="lp-picked">
                  <span className="lp-av">MS</span>
                  <span className="lp-who"><b>Meena S.</b><i><Stars value={5} size=".7rem" /> 4.8 · 11 tasks</i></span>
                  <span className="lp-ver">✔ verified</span>
                  <span className="lp-hired">hired</span>
                </li>
                <li style={{ '--d': '2.9s' }}>
                  <span className="lp-av">AP</span>
                  <span className="lp-who"><b>Arjun P.</b><i>new helper</i></span>
                </li>
              </ul>
            </div>
            <div className="lp-sticker" aria-hidden="true">tap.</div>
          </div>
        </div>
      </section>

      {/* ---------- CATEGORY MARQUEE ---------- */}
      <div className="lp-marquee" aria-label="Task categories">
        <div className="lp-marquee-track">
          {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
            <Link key={i} to={`/browse-tasks?q=${encodeURIComponent(c)}`} tabIndex={i >= CATEGORIES.length ? -1 : 0}>
              {c}<span aria-hidden="true">✦</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ---------- TWO SIDES ---------- */}
      <section className="lp-section lp-sides" id="how-it-works">
        <div className="lp-wrap lp-sides-grid">
          <div>
            <h2 className="lp-h2">one account.<br />two sides.</h2>
            <p className="lp-sub">Switch between hiring and earning from the same login, any time.</p>
            <div className="lp-toggle" role="tablist" aria-label="Choose how you use EZTAP">
              {Object.entries(SIDES).map(([key, v]) => (
                <button key={key} role="tab" aria-selected={side === key} className={side === key ? 'on' : ''} onClick={() => setSide(key)}>{v.label}</button>
              ))}
            </div>
          </div>
          <div className={`lp-panel lp-panel-${side}`} role="tabpanel" key={side}>
            <h3>{s.title}</h3>
            <ol>
              {s.steps.map(([t, d], i) => (
                <li key={t}><span className="lp-step-n">{i + 1}</span><div><b>{t}</b><p>{d}</p></div></li>
              ))}
            </ol>
            <Link to={user ? s.cta[1] : '/signup'} className="lp-btn">{s.cta[0]}</Link>
          </div>
        </div>
      </section>

      {/* ---------- KNOW WHO YOU HIRE ---------- */}
      <section className="lp-section lp-know">
        <div className="lp-wrap lp-know-grid">
          <div className="lp-profile-card" aria-label="Sample helper profile">
            <div className="lp-pc-sample">sample profile</div>
            <div className="lp-pc-head">
              <span className="lp-av lp-av-lg">MS</span>
              <div><b>Meena S.</b><span className="lp-ver">✔ verified</span><i>Hyderabad · plumbing, tap and pipe repair</i></div>
            </div>
            <div className="lp-pc-score">
              <strong>4.8</strong>
              <div><Stars value={5} size="1.1rem" /><span>11 reviews · 11 tasks completed</span></div>
            </div>
            <div className="lp-pc-bars">
              {[[5, 9], [4, 2], [3, 0], [2, 0], [1, 0]].map(([n, c]) => (
                <div key={n}><span>{n}★</span><div><i style={{ width: `${(c / 9) * 100}%` }} /></div><span>{c}</span></div>
              ))}
            </div>
            <blockquote>“Arrived on time, fixed it in 20 minutes and cleaned up after.”</blockquote>
          </div>
          <div>
            <h2 className="lp-h2">every applicant<br />has a profile.</h2>
            <p className="lp-sub">You see who applied before you hire. Open any name to read their reviews, skills and history on EZTAP.</p>
            <ul className="lp-points">
              <li><b>Ratings from real tasks.</b> Only the customer of a completed task can leave a review.</li>
              <li><b>Three layers of trust.</b> ✔ Verified, 🤝 vouched by the community, and ★ Trusted after a manual review. None can be self-assigned.</li>
              <li><b>Skills in their own words.</b> Plus the message they wrote for your task.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- TRUST ROADMAP ---------- */}
      <section className="lp-section lp-trust">
        <div className="lp-wrap">
          <h2 className="lp-h2">trust, built in layers.</h2>
          <p className="lp-sub">What works today, and what we are adding next.</p>
          <div className="lp-road">
            {ROADMAP.map(([state, t, d]) => (
              <div key={t} className={`lp-road-item ${state}`}>
                <span className="lp-state">{state === 'live' ? 'Live' : 'Planned'}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- NUMBERS ---------- */}
      <section className="lp-numbers" ref={numbersRef}>
        <div className="lp-wrap lp-numbers-grid">
          {openCount === null ? (
            <div><strong>1</strong><span>account, two sides</span></div>
          ) : (
            <div>
              <strong><CountUp to={openCount} run={numbersSeen} /></strong>
              <span>{openCount === 1 ? 'task open right now' : 'tasks open right now'}</span>
            </div>
          )}
          <div><strong><CountUp to={CATEGORIES.length} run={numbersSeen} /></strong><span>task categories</span></div>
          <div><strong><CountUp to={5} run={numbersSeen} /></strong><span>cities supported</span></div>
          <div><strong>₹0</strong><span>to post a task</span></div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="lp-cta">
        <div className="lp-wrap">
          <h2>ready when you are.</h2>
          <div className="lp-cta-actions">
            <Link to={user ? '/post-task' : '/signup'} className="lp-btn lp-btn-ink">Post a task</Link>
            <Link to="/browse-tasks" className="lp-btn lp-btn-ghost">Find work</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
