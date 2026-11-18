import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile, getUserProfile, updateUserProfile, isAdminUser } from '../lib/data';

const AuthContext = createContext(null);

// A login can exist without a profile document (e.g. the document was deleted).
// Recreate a basic one so the user is never stuck half signed-in.
async function ensureProfile(fbUser, onError) {
  try {
    await createUserProfile(fbUser.uid, {
      name: fbUser.displayName || (fbUser.email || 'EZTAP User').split('@')[0],
      email: fbUser.email || '',
      mode: 'customer',
      city: 'Hyderabad',
    });
    return await getUserProfile(fbUser.uid);
  } catch (e) {
    console.error('Could not create profile:', e);
    if (onError) onError(e.code || e.message);
    return null;
  }
}

// Save the Verified badge. Always sends `mode` too: accounts created before modes existed
// have none, and the security rules reject any profile write without a valid mode.
// Never throws: if it fails the user just stays unverified instead of being locked out.
async function markVerified(fbUser, p) {
  try {
    await fbUser.getIdToken(true);
    await updateUserProfile(fbUser.uid, { mode: p.mode || 'customer', verified: true });
    return { ...p, verified: true };
  } catch {
    return p;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase auth user
  const [profile, setProfile] = useState(null);  // Firestore profile (mode, name, verified...)
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [setupError, setSetupError] = useState('');
  const busyRef = useRef(false); // true while signup / Google sign-in is creating the profile

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (busyRef.current) return; // the sign-in flow below sets the profile itself
      if (fbUser) {
        try {
          let p = await getUserProfile(fbUser.uid);
          if (!p) p = await ensureProfile(fbUser, setSetupError);
          if (p) setSetupError('');
          // Email already verified in Firebase but badge not saved yet -> save it.
          if (p && fbUser.emailVerified && !p.verified) p = await markVerified(fbUser, p);
          setProfile(p);
          setIsAdmin(await isAdminUser(fbUser.uid));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signup({ name, email, password, mode, city }) {
    busyRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await createUserProfile(cred.user.uid, { name, email, mode, city });
      try { await sendEmailVerification(cred.user); } catch { /* can be resent from Profile */ }
      setProfile(await getUserProfile(cred.user.uid));
      return cred.user;
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  // One click. Google has already verified the email, so the Verified badge is instant.
  async function signInWithGoogle(mode = 'customer') {
    busyRef.current = true;
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const u = cred.user;
      let p = await getUserProfile(u.uid);
      if (!p) {
        await createUserProfile(u.uid, { name: u.displayName || 'EZTAP User', email: u.email, mode, city: 'Hyderabad' });
        p = await getUserProfile(u.uid);
      }
      if (u.emailVerified && !p.verified) p = await markVerified(u, p);
      setProfile(p);
      setIsAdmin(await isAdminUser(u.uid));
      return u;
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const p = await getUserProfile(cred.user.uid);
    setProfile(p);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // One account, two modes: 'customer' (get tasks done) or 'helper' (earn).
  const setMode = useCallback(async (mode) => {
    if (!auth.currentUser) return;
    await updateUserProfile(auth.currentUser.uid, { mode });
    setProfile((p) => ({ ...p, mode }));
  }, []);

  async function saveProfile(fields) {
    // Always send `mode` so accounts created before modes existed still pass the rules.
    const data = { mode: profile?.mode || 'customer', ...fields };
    await updateUserProfile(auth.currentUser.uid, data);
    setProfile((p) => ({ ...p, ...data }));
  }

  async function resendVerificationEmail() {
    await sendEmailVerification(auth.currentUser);
  }

  // After the user clicks the link in their inbox: re-check with Firebase and save the badge.
  async function refreshVerification() {
    const u = auth.currentUser;
    await u.reload();
    if (!u.emailVerified) return false;
    await u.getIdToken(true);
    await updateUserProfile(u.uid, { mode: profile?.mode || 'customer', verified: true });
    setProfile((p) => ({ ...p, verified: true }));
    setUser(auth.currentUser);
    return true;
  }

  const value = {
    user, profile, isAdmin, setupError, loading, signup, login, signInWithGoogle, logout, resetPassword,
    setMode, saveProfile, resendVerificationEmail, refreshVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
