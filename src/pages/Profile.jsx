import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyTrustRequest, requestTrust } from '../lib/data';

export default function Profile() {
  const { user, profile, saveProfile, resendVerificationEmail, refreshVerification } = useAuth();
  const [skills, setSkills] = useState(profile?.skills || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || 'Hyderabad');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [trustReq, setTrustReq] = useState(undefined); // undefined = loading, null = none
  const [phone, setPhone] = useState('');
  const [proof, setProof] = useState('');

  useEffect(() => {
    let active = true;
    getMyTrustRequest(user.uid).then((r) => { if (active) setTrustReq(r); }).catch(() => { if (active) setTrustReq(null); });
    return () => { active = false; };
  }, [user.uid]);

  async function run(fn, okMsg) {
    setBusy(true); setMsg(''); setErr(''); window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const result = await fn();
      setMsg(typeof result === 'string' ? result : okMsg);
    } catch (e) {
      setErr(e?.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  const sendLink = () => run(async () => {
    await resendVerificationEmail();
    return `Verification link sent to ${user.email}. Open it, then come back and press "I've verified".`;
  });
  const check = () => run(async () => {
    const ok = await refreshVerification();
    return ok ? 'You are verified! Your badge now shows on your applications.'
              : 'Not verified yet — open the link in your email first (check spam).';
  });
  const submitTrust = (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(digits)) { setErr('Enter a valid 10-digit Indian mobile number.'); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (proof.trim().length < 20) { setErr('Please describe your experience in at least 20 characters.'); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    run(async () => {
      await requestTrust(user.uid, { name: profile.name, email: user.email, phone: digits, proof: proof.trim() });
      setTrustReq(await getMyTrustRequest(user.uid));
      return 'Request sent. An admin will review it soon.';
    });
  };
  const save = (e) => { e.preventDefault(); run(() => saveProfile({ skills: skills.trim(), bio: bio.trim(), city }), 'Profile saved.'); };

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>My Profile</h1>
          <p>{profile?.name} · {user?.email}</p>
        </div>
      </div>
      <div className="app-shell" style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {msg && <div className="form-success">{msg}</div>}
        {err && <div className="form-error">{err}</div>}

        <div className="card">
          <h3 style={{ marginBottom: '.5rem' }}>
            Verification {profile?.verified && <span className="badge verified-b" style={{ display: 'inline-flex', marginLeft: 8 }}>✔ Verified</span>}
          </h3>
          {profile?.verified ? (
            <p style={{ color: 'var(--text2)' }}>Your account is verified. Customers see a <strong>Verified</strong> badge next to your applications, which helps you get hired.</p>
          ) : (
            <>
              <p style={{ color: 'var(--text2)', marginBottom: '1rem' }}>
                The fastest way: log out and choose <strong>Continue with Google</strong>. Or verify by email: we send a one-time link to <strong>{user?.email}</strong>.
              </p>
              <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                <button className="btn btn-solid" disabled={busy} onClick={sendLink}>Send verification email</button>
                <button className="btn btn-outline" disabled={busy} onClick={check}>I've verified</button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '.5rem' }}>
            Trusted badge {profile?.trusted && <span className="badge trusted-b" style={{ display: 'inline-flex', marginLeft: 8 }}>★ Trusted</span>}
          </h3>
          {profile?.trusted ? (
            <p style={{ color: 'var(--text2)' }}>An EZTAP admin has reviewed and approved you. Customers see the ★ Trusted badge first when you apply.</p>
          ) : trustReq === undefined ? (
            <p style={{ color: 'var(--text2)' }}>Loading…</p>
          ) : trustReq?.status === 'pending' ? (
            <p style={{ color: 'var(--text2)' }}>Your request is <strong>under review</strong>. We will notify you here when it is decided.</p>
          ) : (
            <>
              <p style={{ color: 'var(--text2)', marginBottom: '1rem' }}>
                The highest level of trust. Share a mobile number and a short note about your work or a reference. An admin reviews it by hand.
                Your number is never shown publicly.
              </p>
              {trustReq?.status === 'rejected' && (
                <div className="form-error">Your last request was not approved{trustReq.note ? `: ${trustReq.note}` : '.'} You can update the details and send it again.</div>
              )}
              <form onSubmit={submitTrust}>
                <div className="field">
                  <label>Mobile number</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" />
                </div>
                <div className="field">
                  <label>Proof of work or reference</label>
                  <textarea value={proof} onChange={(e) => setProof(e.target.value)} placeholder="e.g. 4 years as an electrician, worked at XYZ Services. Reference: Mr. Rao, 98xxxxxx." />
                </div>
                <button className="btn btn-solid" disabled={busy}>Request Trusted badge</button>
              </form>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Helper details</h3>
          <form onSubmit={save}>
            <div className="field">
              <label>Skills (shown to customers)</label>
              <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Plumbing, tap & pipe repair, 4 yrs experience" />
            </div>
            <div className="field">
              <label>About you</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short intro for customers." />
            </div>
            <div className="field">
              <label>City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                {['Hyderabad', 'Mumbai', 'Bangalore', 'Delhi', 'Chennai'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button className="btn btn-solid" disabled={busy}>Save</button>
          </form>
        </div>

        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <Link to={`/helpers/${user.uid}`} className="btn btn-solid">View my public profile</Link>
          <button type="button" className="btn btn-outline" onClick={() => window.dispatchEvent(new Event('eztap:tour'))}>Replay the welcome tour</button>
          <Link to="/dashboard" className="btn btn-outline">Back to dashboard</Link>
        </div>
      </div>
    </>
  );
}
