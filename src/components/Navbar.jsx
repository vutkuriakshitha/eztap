import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listenToNotifications, markNotificationRead } from '../lib/data';

export default function Navbar() {
  const { user, profile, isAdmin, setupError, logout, setMode } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return listenToNotifications(user.uid, setNotes);
  }, [user]);

  async function handleLogout() {
    setOpen(false);
    setNotes([]);
    await logout();
    navigate('/');
  }

  async function openNote(n) {
    setOpen(false);
    if (!n.read) markNotificationRead(n.id).catch(() => {});
    setNotes((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    navigate(n.link || (n.taskId ? `/tasks/${n.taskId}` : '/dashboard'));
  }

  const mode = profile?.mode || 'customer';
  const unread = notes.filter((n) => !n.read).length;
  const initials = profile?.name
    ? profile.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
    : '';

  return (
    <>
    <nav>
      <div className="nav-inner">
        <Link to="/" className="logo">EZ<span>TAP</span></Link>
        <div className="nav-links">
          {(!user || mode === 'helper') && <Link to="/browse-tasks">Find Work</Link>}
          {(!user || mode === 'customer') && <Link to="/post-task">Post a Task</Link>}
          {user && <Link to="/dashboard">{mode === 'helper' ? 'My Work' : 'My Tasks'}</Link>}
          {isAdmin && <Link to="/admin">Admin</Link>}
          {!user && <Link to="/#how-it-works">How it Works</Link>}
        </div>
        <div className="nav-cta">
          {!user && (
            <>
              <button type="button" className="help-btn" onClick={() => window.dispatchEvent(new Event('eztap:tour'))} aria-label="Take the welcome tour" title="Take the welcome tour">?</button>
              <Link to="/login" className="btn btn-outline">Log in</Link>
              <Link to="/signup" className="btn btn-solid">Get Started</Link>
            </>
          )}
          {user && !profile && (
            <div className="nav-user">
              <span style={{ fontSize: '.85rem', color: 'var(--text2)' }}>{setupError ? `Account setup failed [${setupError}]` : 'Setting up your account…'}</span>
              <button className="btn btn-outline nav-logout" onClick={handleLogout}>Log out</button>
            </div>
          )}
          {user && profile && (
            <div className="nav-user">
              <div className="mode-switch" title="Switch between getting tasks done and earning">
                <button className={mode === 'customer' ? 'active' : ''} onClick={() => { setMode('customer'); navigate('/dashboard'); }}>
                  Get tasks done
                </button>
                <button className={mode === 'helper' ? 'active' : ''} onClick={() => { setMode('helper'); navigate('/dashboard'); }}>
                  Earn as helper
                </button>
              </div>
              <button type="button" className="help-btn" onClick={() => window.dispatchEvent(new Event('eztap:tour'))} aria-label="Take the welcome tour" title="Take the welcome tour">?</button>
              <div className="bell-wrap">
                <button className="bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
                  🔔{unread > 0 && <span className="bell-count">{unread}</span>}
                </button>
                {open && (
                  <div className="bell-menu">
                    {notes.length === 0 && <div className="bell-empty">No notifications yet</div>}
                    {notes.slice(0, 8).map((n) => (
                      <button key={n.id} className={`bell-item ${n.read ? '' : 'unread'}`} onClick={() => openNote(n)}>
                        {n.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link to="/profile" className="nav-avatar" title={profile.name}>{initials}</Link>
              <button className="btn btn-outline nav-logout" onClick={handleLogout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
    <nav className="mobile-tabs" aria-label="Main">
      {!user && (
        <>
          <NavLink to="/browse-tasks"><span aria-hidden="true">🔎</span>Find work</NavLink>
          <NavLink to="/post-task"><span aria-hidden="true">📝</span>Post task</NavLink>
          <NavLink to="/login"><span aria-hidden="true">🔑</span>Log in</NavLink>
          <NavLink to="/signup" className="mt-cta"><span aria-hidden="true">✨</span>Join</NavLink>
        </>
      )}
      {user && (
        <>
          {mode === 'helper'
            ? <NavLink to="/browse-tasks"><span aria-hidden="true">🔎</span>Find work</NavLink>
            : <NavLink to="/post-task"><span aria-hidden="true">📝</span>Post task</NavLink>}
          <NavLink to="/dashboard"><span aria-hidden="true">📋</span>{mode === 'helper' ? 'My work' : 'My tasks'}</NavLink>
          <NavLink to="/profile"><span aria-hidden="true">👤</span>Profile</NavLink>
          {isAdmin && <NavLink to="/admin"><span aria-hidden="true">🛡️</span>Admin</NavLink>}
          <button type="button" onClick={handleLogout}><span aria-hidden="true">🚪</span>Log out</button>
        </>
      )}
    </nav>
    </>
  );
}
