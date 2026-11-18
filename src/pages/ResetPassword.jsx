import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from 'firebase/auth';
import { auth } from '../lib/firebase';

// Accepts the raw code, or the whole link from the email.
function extractCode(text) {
  const t = (text || '').trim();
  const m = t.match(/oobCode=([^&\s#]+)/);
  return m ? decodeURIComponent(m[1]) : t;
}

function friendly(code) {
  switch (code) {
    case 'auth/expired-action-code': return 'This link has expired. Please request a new one.';
    case 'auth/invalid-action-code': return 'This code is not valid, or it was already used. Please request a new one.';
    case 'auth/weak-password': return 'Choose a stronger password (at least 6 characters).';
    case 'auth/network-request-failed': return 'Network problem. Check your internet and try again.';
    default: return `Something went wrong. Please try again. [${code || 'error'}]`;
  }
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [step, setStep] = useState('enter'); // enter -> form -> done
  const [pasted, setPasted] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function check(rawCode) {
    setError(''); setLoading(true);
    try {
      const c = extractCode(rawCode);
      const mail = await verifyPasswordResetCode(auth, c); // throws if wrong / expired / used
      setCode(c); setEmail(mail); setStep('form');
    } catch (err) {
      setError(friendly(err.code));
    } finally { setLoading(false); }
  }

  // Arrived by clicking a link in an email: Firebase puts ?mode=...&oobCode=... in the address.
  // The same page handles password reset and email verification links, so every email
  // opens inside EZTAP instead of Firebase's plain white page.
  useEffect(() => {
    const c = params.get('oobCode');
    if (!c) return;
    if (params.get('mode') === 'verifyEmail') {
      setStep('verifying');
      applyActionCode(auth, c)
        .then(() => setStep('verified'))
        .catch((err) => { setError(friendly(err.code)); setStep('verifyFailed'); });
    } else {
      check(c);
    }
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    if (pw.length < 6) { setError('Your password must be at least 6 characters.'); return; }
    if (pw !== pw2) { setError('The two passwords do not match.'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, code, pw);
      setStep('done');
    } catch (err) {
      setError(friendly(err.code));
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {step === 'verifying' && (
          <>
            <h1>Verifying your email…</h1>
            <p className="sub">One moment.</p>
          </>
        )}

        {step === 'verified' && (
          <>
            <h1>Email verified</h1>
            <div className="form-success">Thanks! Your email is confirmed. Open your Profile to see your ✔ Verified badge.</div>
            <Link to="/profile" className="btn btn-solid btn-block btn-lg">Go to my profile</Link>
          </>
        )}

        {step === 'verifyFailed' && (
          <>
            <h1>Could not verify</h1>
            {error && <div className="form-error">{error}</div>}
            <Link to="/profile" className="btn btn-solid btn-block btn-lg">Request a new link from my profile</Link>
          </>
        )}

        {step === 'enter' && (
          <>
            <h1>Enter your code</h1>
            <p className="sub">Paste the link or code from the reset email.</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={(e) => { e.preventDefault(); check(pasted); }}>
              <div className="field">
                <label htmlFor="rp-code">Code or link from the email</label>
                <textarea id="rp-code" required value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste here" />
              </div>
              <button className="btn btn-solid btn-block btn-lg" disabled={loading}>{loading ? 'Checking…' : 'Continue'}</button>
            </form>
            <div className="auth-foot">No email? <Link to="/forgot-password">Send a new code</Link></div>
          </>
        )}

        {step === 'form' && (
          <>
            <h1>Create a new password</h1>
            <p className="sub">Code accepted for <b>{email}</b>.</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={save}>
              <div className="field">
                <label htmlFor="rp-pw">New password</label>
                <input id="rp-pw" required type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="rp-pw2">Confirm new password</label>
                <input id="rp-pw2" required type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" autoComplete="new-password" />
              </div>
              <button className="btn btn-solid btn-block btn-lg" disabled={loading}>{loading ? 'Saving…' : 'Save new password'}</button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <h1>Password updated</h1>
            <div className="form-success">Your password was changed. You can log in with the new one now.</div>
            <Link to="/login" className="btn btn-solid btn-block btn-lg">Go to log in</Link>
          </>
        )}
      </div>
    </div>
  );
}
