import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      if (err.code === 'auth/invalid-email') setError('That email address looks invalid.');
      else if (err.code === 'auth/too-many-requests') setError('Too many requests. Please wait a few minutes and try again.');
      else if (err.code === 'auth/user-not-found') setSent(true); // do not reveal which emails have accounts
      else setError(`Could not send the email. Please try again. [${err.code || 'error'}]`);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Forgot your password?</h1>
        <p className="sub">Enter your email and we will send you a code to reset it.</p>

        {error && <div className="form-error">{error}</div>}

        {sent ? (
          <>
            <div className="form-success">
              If an account exists for <b>{email}</b>, a reset email is on its way. It can take a minute, and may land in <b>Spam</b>.
            </div>
            <p className="sub" style={{ marginBottom: '1.2rem' }}>
              Open the email, then click the link, or copy the link and paste it on the next page.
            </p>
            <Link to="/reset-password" className="btn btn-solid btn-block btn-lg">I have the code</Link>
            <div className="auth-foot">
              Nothing arrived? <button type="button" className="link-btn" onClick={() => setSent(false)}>Send it again</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fp-email">Email</label>
              <input id="fp-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <button className="btn btn-solid btn-block btn-lg" disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</button>
            <p className="sub" style={{ marginTop: '1rem', marginBottom: 0 }}>Signed up with Google? Just use <b>Continue with Google</b> on the login page.</p>
          </form>
        )}

        <div className="auth-foot"><Link to="/login">Back to log in</Link></div>
      </div>
    </div>
  );
}
