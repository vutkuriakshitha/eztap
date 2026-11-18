import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Badges from '../components/Badges';
import {
  getPublicHelperProfile, findCompletedTaskWith, addVouch, removeVouch, notify,
} from '../lib/data';

export function Stars({ value, size = '1rem' }) {
  const full = Math.round(value || 0);
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value ? value.toFixed(1) : 'No'} out of 5`}>
      {'★'.repeat(full)}<span className="stars-off">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function formatDate(ts) {
  if (!ts?.seconds) return '';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export default function HelperProfile() {
  const { uid } = useParams();
  const { user, profile: me } = useAuth();
  const [data, setData] = useState(null);
  const [workedTask, setWorkedTask] = useState(null); // a completed task where I hired this helper
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await getPublicHelperProfile(uid);
      setData(d);
      if (user && user.uid !== uid) setWorkedTask(await findCompletedTaskWith(user.uid, uid));
    } catch {
      setError('Could not load this profile.');
    } finally {
      setLoading(false);
    }
  }, [uid, user]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  async function handleVouch(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(''); setError('');
    try {
      await addVouch({
        voucherUid: user.uid,
        voucherName: me?.name || user.displayName || 'A member',
        helperUid: uid,
        type: workedTask ? 'worked' : 'verified',
        taskId: workedTask?.id,
        note: note.trim().slice(0, 200),
      });
      notify(uid, user.uid, `${me?.name || 'Someone'} vouched for you`, '', `/helpers/${uid}`);
      setNote('');
      setMsg('Thanks, your vouch is now on their profile.');
      await load();
    } catch {
      setError('Could not save your vouch. Please try again.');
    } finally { setBusy(false); }
  }

  async function handleUnvouch() {
    if (busy) return;
    setBusy(true); setMsg(''); setError('');
    try {
      await removeVouch(user.uid, uid);
      setMsg('Your vouch was removed.');
      await load();
    } catch {
      setError('Could not remove your vouch.');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="loading-wrap">Loading profile…</div>;
  if (!data) return <div className="app-shell">{error ? <div className="form-error">{error}</div> : <div className="empty-state"><h3>Profile not found</h3></div>}</div>;

  const { profile, reviews, vouches, ratingAvg, ratingCount, breakdown, completed, active } = data;
  const initials = (profile.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const maxBar = Math.max(1, ...breakdown.map((b) => b.count));
  const isMe = user?.uid === uid;
  const myVouch = user ? vouches.find((v) => v.voucherUid === user.uid) : null;
  const canVouch = user && !isMe && !myVouch && (workedTask || me?.verified);

  return (
    <div className="hp">
      <div className="hp-top">
        <div className="hp-top-inner">
          <div className="hp-avatar">{initials}</div>
          <div>
            <h1 className="hp-name">{profile.name}</h1>
            <div className="applicant-badges hp-badges">
              <Badges trusted={profile.trusted} verified={profile.verified} vouchCount={vouches.length} />
            </div>
            <p className="hp-meta">
              📍 {profile.city || 'India'}
              {formatDate(profile.createdAt) && <> · Member since {formatDate(profile.createdAt)}</>}
            </p>
          </div>
        </div>
      </div>

      <div className="hp-body">
        <div className="hp-main">
          {msg && <div className="form-success">{msg}</div>}
          {error && <div className="form-error">{error}</div>}

          <section className="card">
            <h3>About</h3>
            <p className="hp-text">{profile.bio || 'This helper has not added an introduction yet.'}</p>
            {profile.skills && (
              <div className="hp-skills">
                {profile.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s) => <span key={s} className="hp-skill">{s}</span>)}
              </div>
            )}
          </section>

          <section className="card">
            <h3 style={{ marginBottom: '.4rem' }}>Vouched by ({vouches.length})</h3>
            <p className="hp-text" style={{ marginTop: 0, marginBottom: '1rem' }}>
              Verified members and customers who hired this helper can vouch. Two vouches make a helper <b>community trusted</b>.
            </p>
            {vouches.length === 0 && <p className="hp-text">No vouches yet.</p>}
            {vouches.map((v) => (
              <div className="vouch-row" key={v.id}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link to={`/helpers/${v.voucherUid}`} className="applicant-name">{v.voucherName}</Link>
                    <span className={`vouch-kind ${v.type}`}>{v.type === 'worked' ? 'hired this helper' : 'verified member'}</span>
                    <span className="hp-date">{formatDate(v.createdAt)}</span>
                  </div>
                  {v.note && <p className="hp-text" style={{ marginTop: '.3rem' }}>“{v.note}”</p>}
                </div>
              </div>
            ))}

            {myVouch && (
              <button className="btn btn-outline" style={{ marginTop: '1rem' }} disabled={busy} onClick={handleUnvouch}>Remove my vouch</button>
            )}
            {canVouch && (
              <form onSubmit={handleVouch} style={{ marginTop: '1.2rem' }}>
                <div className="field">
                  <label>{workedTask ? 'You hired this helper. Say how it went (optional)' : 'Why do you vouch for them? (optional)'}</label>
                  <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reliable and on time" />
                </div>
                <button className="btn btn-solid" disabled={busy}>{busy ? 'Saving…' : `Vouch for ${profile.name.split(' ')[0]}`}</button>
              </form>
            )}
            {!user && <p className="hp-text" style={{ marginTop: '1rem' }}><Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Log in</Link> to vouch.</p>}
            {user && !isMe && !myVouch && !canVouch && (
              <p className="hp-text" style={{ marginTop: '1rem' }}>
                <Link to="/profile" style={{ color: 'var(--primary)', fontWeight: 600 }}>Verify your account</Link> (one click with Google) to vouch for helpers.
              </p>
            )}
          </section>

          <section className="card">
            <h3 style={{ marginBottom: '1rem' }}>Reviews ({ratingCount})</h3>
            {ratingCount === 0 && <p className="hp-text">No reviews yet. Reviews appear here after a customer marks a task complete and rates the work.</p>}
            {reviews.map((r) => (
              <article key={r.id} className="hp-review">
                <div className="hp-review-top">
                  <strong>{r.customerName || 'Customer'}</strong>
                  <Stars value={r.rating} size=".95rem" />
                  <span className="hp-date">{formatDate(r.createdAt)}</span>
                </div>
                {r.text && <p className="hp-text">“{r.text}”</p>}
              </article>
            ))}
          </section>
        </div>

        <aside className="hp-side">
          <div className="card hp-score">
            <div className="hp-score-num">{ratingAvg ? ratingAvg.toFixed(1) : '–'}</div>
            <Stars value={ratingAvg} size="1.2rem" />
            <div className="hp-date">{ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}</div>
            <div className="hp-bars">
              {breakdown.map((b) => (
                <div className="hp-bar-row" key={b.stars}>
                  <span>{b.stars}★</span>
                  <div className="hp-bar"><div style={{ width: `${(b.count / maxBar) * 100}%` }} /></div>
                  <span>{b.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card hp-facts">
            <div><strong>{completed}</strong><span>tasks completed</span></div>
            <div><strong>{active}</strong><span>in progress</span></div>
            <div><strong>{vouches.length}</strong><span>vouches</span></div>
          </div>
          <Link to="/browse-tasks" className="btn btn-outline btn-block">Back to tasks</Link>
        </aside>
      </div>
    </div>
  );
}
