import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPendingTrustRequests, decideTrust, notify } from '../lib/data';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState({});

  async function load() {
    setLoading(true); setError('');
    try { setRequests(await getPendingTrustRequests()); }
    catch { setError('Could not load requests.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function decide(r, approve) {
    if (busy) return;
    setBusy(r.id); setMsg(''); setError('');
    try {
      await decideTrust(r.id, approve, (notes[r.id] || '').trim());
      await notify(r.id, user.uid, approve ? 'You are now a ★ Trusted helper!' : 'Your Trusted request needs changes. Open your profile for details.', '', '/profile');
      setMsg(`${r.name}: ${approve ? 'approved' : 'rejected'}.`);
      await load();
    } catch {
      setError('Could not save that decision. Please try again.');
    } finally { setBusy(''); }
  }

  if (!isAdmin) {
    return (
      <div className="app-shell" style={{ maxWidth: 680 }}>
        <div className="card">
          <h3>Admin only</h3>
          <p style={{ color: 'var(--text2)', margin: '.6rem 0 1rem' }}>
            This account is not an admin. To make it one: Firebase console → Firestore Database → Start collection
            named <b>admins</b> → Document ID = the ID below → add any field (for example <code>role</code> = <code>admin</code>) → Save. Then refresh.
          </p>
          <code style={{ display: 'block', padding: '.8rem', background: 'var(--bg)', borderRadius: 10, wordBreak: 'break-all' }}>{user?.uid}</code>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Trusted requests</h1>
          <p>Review each helper before granting the ★ Trusted badge. Phone numbers are only visible here.</p>
        </div>
      </div>
      <div className="app-shell" style={{ maxWidth: 860 }}>
        {msg && <div className="form-success">{msg}</div>}
        {error && <div className="form-error">{error}</div>}
        {loading && <div className="loading-wrap">Loading…</div>}
        {!loading && requests.length === 0 && (
          <div className="empty-state"><h3>No pending requests</h3><p>When a helper asks for the Trusted badge, it shows up here.</p></div>
        )}
        <div className="task-list">
          {requests.map((r) => (
            <div className="card admin-req" key={r.id}>
              <div className="admin-req-top">
                <div>
                  <Link to={`/helpers/${r.id}`} className="applicant-name">{r.name}</Link>
                  <div className="hp-date">{r.email}</div>
                </div>
                <a href={`tel:${r.phone}`} className="btn btn-outline">📞 {r.phone}</a>
              </div>
              <p className="admin-proof">{r.proof}</p>
              <div className="field" style={{ margin: '0 0 .8rem' }}>
                <input placeholder="Note to the helper (optional, shown if rejected)" value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '.6rem' }}>
                <button className="btn btn-solid" disabled={!!busy} onClick={() => decide(r, true)}>{busy === r.id ? 'Saving…' : 'Approve ★'}</button>
                <button className="btn btn-outline" disabled={!!busy} onClick={() => decide(r, false)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
