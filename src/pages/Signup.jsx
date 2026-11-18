import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [mode, setMode] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle(mode);
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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup({ name, email, password, mode, city });
      navigate('/profile');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="sub">One account for both — get tasks done or earn by helping. You can switch any time.</p>

        {error && <div className="form-error">{error}</div>}

        <div className="role-toggle">
          <button type="button" className={mode === 'customer' ? 'active' : ''} onClick={() => setMode('customer')}>
            I need help
          </button>
          <button type="button" className={mode === 'helper' ? 'active' : ''} onClick={() => setMode('helper')}>
            I want to earn as a helper
          </button>
        </div>

        <button type="button" className="btn-google" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          Continue with Google
        </button>
        <div className="auth-or"><span>or use email</span></div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Krishnamurthy" />
          </div>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option>Hyderabad</option>
              <option>Mumbai</option>
              <option>Bangalore</option>
              <option>Delhi</option>
              <option>Chennai</option>
            </select>
          </div>
          <div className="field">
            <label>Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <button className="btn btn-solid btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-foot">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account already exists with this email.';
    case 'auth/invalid-email': return 'That email address looks invalid.';
    case 'auth/weak-password': return 'Password is too weak — use at least 6 characters.';
    case 'auth/operation-not-allowed': return 'Google sign-in is not enabled in Firebase yet (Authentication → Sign-in method → Google).';
    case 'auth/unauthorized-domain': return 'This website address is not authorised in Firebase (Authentication → Settings → Authorized domains).';
    default: return 'Something went wrong. Please try again.';
  }
}
