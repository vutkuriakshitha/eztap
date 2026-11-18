import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setError(err.code === 'auth/popup-closed-by-user' ? 'Google sign-in was closed before finishing.' : friendlyError(err.code) + ` [${err.code || err.message}]`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="sub">Log in to manage your tasks</p>

        {error && <div className="form-error">{error}</div>}

        <button type="button" className="btn-google" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          Continue with Google
        </button>
        <div className="auth-or"><span>or use email</span></div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
            <div style={{ textAlign: 'right', marginTop: '.4rem' }}>
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>
          </div>
          <button className="btn btn-solid btn-block btn-lg" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="auth-foot">
          New to EZTAP? <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email': return 'That email address looks invalid.';
    case 'auth/operation-not-allowed': return 'Google sign-in is not enabled in Firebase yet (Authentication → Sign-in method → Google).';
    case 'auth/unauthorized-domain': return 'This website address is not authorised in Firebase (Authentication → Settings → Authorized domains).';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}
