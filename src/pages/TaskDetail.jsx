import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Stars } from './HelperProfile';
import Badges, { trustScore } from '../components/Badges';
import { useAuth } from '../context/AuthContext';
import {
  getTask, getApplicationsForTask, getApplicationsByHelper, getReviewForTask, applyToTask,
  assignHelperToTask, updateTaskStatus, cancelTask, deleteTask, createReview, getHelperSummary, notify,
} from '../lib/data';

const STATUS_LABEL = {
  open: 'Open', assigned: 'Assigned', 'in-progress': 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_CLASS = {
  open: 'status-open', assigned: 'status-assigned', 'in-progress': 'status-progress',
  completed: 'status-completed', cancelled: 'status-cancelled',
};

export default function TaskDetail() {
  const { taskId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [myApplied, setMyApplied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getTask(taskId);
      setTask(t);
      if (t && t.customerId === user?.uid) {
        const apps = await getApplicationsForTask(taskId, user.uid);
        const enriched = await Promise.all(apps.map(async (a) => {
          try { return { ...a, ...(await getHelperSummary(a.helperId)) }; } catch { return a; }
        }));
        // Most trusted first (Trusted, community, verified), then best rated.
        enriched.sort((a, b) => trustScore(b) - trustScore(a) || (b.ratingAvg || 0) - (a.ratingAvg || 0));
        setApplicants(enriched);
        if (t.status === 'completed') setReviewSubmitted(!!(await getReviewForTask(taskId)));
      } else if (t && user) {
        const mine = await getApplicationsByHelper(user.uid);
        setMyApplied(mine.some((a) => a.taskId === taskId));
      }
    } catch {
      setError('Could not load this task.');
    } finally {
      setLoading(false);
    }
  }, [taskId, user]);

  useEffect(() => { load(); }, [load]);

  const isOwner = task && user && task.customerId === user.uid;
  const isAssignedHelper = task && user && task.helperId === user.uid;
  const alreadyApplied = myApplied;

  async function handleApply(e) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setApplying(true);
    setActionMsg(''); setActionError('');
    try {
      const name = profile?.name || user.displayName || 'A helper';
      await applyToTask(task, { uid: user.uid, name, message: applyMessage.trim() });
      await notify(task.customerId, user.uid, `${name} applied to "${task.title}"`, taskId);
      setMyApplied(true);
      setActionMsg('Application sent! The customer will see it on their task page.');
      setApplyMessage('');
    } catch {
      setActionError('Could not send your application. If you already applied, check My Work.');
    } finally {
      setApplying(false);
    }
  }

  async function handleHire(app) {
    if (busy) return;
    setBusy(true); setActionMsg(''); setActionError('');
    try {
      await assignHelperToTask(taskId, app.helperId, app.helperName);
      await notify(app.helperId, user.uid, `You were hired for "${task.title}" 🎉`, taskId);
      setActionMsg(`${app.helperName} has been hired.`);
      await load();
    } catch {
      setActionError('Could not hire this helper. The task may have changed — refresh and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) return;
    if (!window.confirm('Delete this task permanently? This cannot be undone.')) return;
    setBusy(true); setActionMsg(''); setActionError('');
    try {
      await deleteTask(taskId);
      navigate('/dashboard');
    } catch {
      setActionError('Could not delete this task. Someone may have just applied. Refresh and try again.');
      setBusy(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (busy) return;
    setBusy(true); setActionMsg(''); setActionError('');
    try {
      if (newStatus === 'cancelled') await cancelTask(taskId);
      else await updateTaskStatus(taskId, newStatus);
      const other = newStatus === 'in-progress' && isAssignedHelper ? task.customerId : task.helperId;
      if (other && other !== user.uid) {
        const label = { 'in-progress': 'started', completed: 'marked complete' }[newStatus];
        if (label) await notify(other, user.uid, `"${task.title}" was ${label}`, taskId);
      }
      await load();
    } catch {
      setActionError('Could not update task status.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setActionMsg(''); setActionError('');
    try {
      await createReview({
        taskId,
        helperId: task.helperId,
        helperName: task.helperName,
        customerId: user.uid,
        customerName: profile?.name || 'Customer',
        rating: Number(reviewRating),
        text: reviewText.trim(),
      });
      notify(task.helperId, user.uid, `You got a ${reviewRating}★ review for "${task.title}"`, taskId);
      setReviewSubmitted(true);
    } catch {
      setActionError('Could not submit your review. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="loading-wrap">Loading task…</div>;
  if (error) return <div className="app-shell"><div className="form-error">{error}</div></div>;
  if (!task) return <div className="app-shell"><div className="empty-state"><h3>Task not found</h3></div></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
            <h1>{task.title}</h1>
            <span className={`status-pill ${STATUS_CLASS[task.status]}`}>{STATUS_LABEL[task.status]}</span>
          </div>
          <p>📁 {task.category} · 📍 {task.city}{task.address ? `, ${task.address}` : ''} · Posted by {task.customerName}</p>
        </div>
      </div>

      <div className="app-shell" style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '.6rem' }}>Description</h3>
          <p style={{ color: 'var(--text2)' }}>{task.description}</p>
          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="budget" style={{ fontSize: '1.3rem' }}>₹{task.budget}</span>
            {task.helperName && <span style={{ fontSize: '.875rem', color: 'var(--text2)' }}>Helper: <Link to={`/helpers/${task.helperId}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>{task.helperName}</Link></span>}
          </div>
        </div>

        {actionMsg && <div className="form-success">{actionMsg}</div>}
        {actionError && <div className="form-error">{actionError}</div>}

        {!isOwner && task.status === 'open' && (
          <div className="card">
            <h3 style={{ marginBottom: '.75rem' }}>Apply for this task</h3>
            {!user && (
              <p style={{ marginBottom: '1rem', color: 'var(--text2)' }}>
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Log in</Link> or{' '}
                <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>sign up</Link> to apply.
              </p>
            )}
            {user && alreadyApplied && (
              <p style={{ color: 'var(--green)', fontWeight: 600 }}>✓ You've already applied to this task.</p>
            )}
            {user && !alreadyApplied && (
              <form onSubmit={handleApply}>
                {!profile?.verified && (
                  <p style={{ fontSize: '.82rem', color: 'var(--text2)', marginBottom: '.75rem' }}>
                    Tip: customers prefer verified helpers. <Link to="/profile" style={{ color: 'var(--primary)', fontWeight: 600 }}>Verify your email</Link> to get a badge.
                  </p>
                )}
                <div className="field">
                  <label>Message to the customer (optional)</label>
                  <textarea
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    placeholder="Briefly say why you're a good fit and your availability."
                  />
                </div>
                <button className="btn btn-solid" disabled={applying}>
                  {applying ? 'Sending…' : 'Apply Now'}
                </button>
              </form>
            )}
          </div>
        )}

        {isOwner && task.status === 'open' && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Applicants ({applicants.length})</h3>
            {applicants.length === 0 && <p style={{ color: 'var(--text2)' }}>No applications yet. Check back soon.</p>}
            {applicants.map((app) => (
              <div className="applicant-card" key={app.id}>
                <div className="applicant-head">
                  <div className="who">
                    <div className="helper-avatar" style={{ width: 46, height: 46, fontSize: '.85rem' }}>
                      {(app.helperName || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <Link to={`/helpers/${app.helperId}`} className="applicant-name">{app.helperName}</Link>
                      <div className="applicant-badges">
                        <Badges trusted={app.trusted} verified={app.verified} vouchCount={app.vouchCount} showUnverified />
                        {app.ratingCount > 0
                          ? <span className="rating-chip"><Stars value={app.ratingAvg} size=".8rem" /> {app.ratingAvg.toFixed(1)} ({app.ratingCount})</span>
                          : <span className="rating-chip rating-new">New helper · no reviews yet</span>}
                        <span className="rating-chip">{app.completed || 0} tasks completed</span>
                      </div>
                    </div>
                  </div>
                  <div className="applicant-actions">
                    <Link to={`/helpers/${app.helperId}`} className="btn btn-outline">View profile</Link>
                    <button className="btn btn-solid" disabled={busy} onClick={() => handleHire(app)}>{busy ? 'Please wait…' : 'Hire'}</button>
                  </div>
                </div>
                {app.skills && <div className="applicant-skills">{app.skills}</div>}
                {app.message && <div className="applicant-msg">“{app.message}”</div>}
              </div>
            ))}
          </div>
        )}

        {isOwner && task.status === 'assigned' && (
          <div className="card">
            <h3 style={{ marginBottom: '.75rem' }}>Manage Task</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '1rem' }}>{task.helperName} has been hired. Mark progress as work happens.</p>
            <button className="btn btn-solid" disabled={busy} onClick={() => handleStatusChange('in-progress')}>Mark as In Progress</button>
          </div>
        )}
        {isOwner && task.status === 'in-progress' && (
          <div className="card">
            <h3 style={{ marginBottom: '.75rem' }}>Manage Task</h3>
            <button className="btn btn-solid" disabled={busy} onClick={() => handleStatusChange('completed')}>Mark as Completed</button>
          </div>
        )}

        {isAssignedHelper && (task.status === 'assigned' || task.status === 'in-progress') && (
          <div className="card">
            <h3 style={{ marginBottom: '.5rem' }}>You're hired for this task 🎉</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '1rem' }}>Current status: <strong>{STATUS_LABEL[task.status]}</strong>. Contact: {task.customerName}. The customer marks the task complete when you're done.</p>
            {task.status === 'assigned' && <button className="btn btn-solid" disabled={busy} onClick={() => handleStatusChange('in-progress')}>Start Work</button>}
          </div>
        )}
        {isOwner && task.status === 'open' && (
          applicants.length === 0 ? (
            <div className="card" style={{ alignSelf: 'flex-start' }}>
              <h3 style={{ marginBottom: '.4rem' }}>Posted by mistake?</h3>
              <p style={{ color: 'var(--text2)', marginBottom: '1rem' }}>Nobody has applied yet, so you can delete this task completely.</p>
              <button className="btn btn-outline btn-danger" disabled={busy} onClick={handleDelete}>Delete task</button>
            </div>
          ) : (
            <button className="btn btn-outline" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => { if (window.confirm('Cancel this task? Applicants will no longer be able to be hired.')) handleStatusChange('cancelled'); }}>Cancel this task</button>
          )
        )}

        {isOwner && task.status === 'completed' && !reviewSubmitted && (
          <div className="card">
            <h3 style={{ marginBottom: '.75rem' }}>Rate {task.helperName}</h3>
            <form onSubmit={handleReviewSubmit}>
              <div className="field">
                <label>Rating</label>
                <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>)}
                </select>
              </div>
              <div className="field">
                <label>Review (optional)</label>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="How did it go?" />
              </div>
              <button className="btn btn-solid" disabled={busy}>{busy ? 'Submitting…' : 'Submit Review'}</button>
            </form>
          </div>
        )}
        {isOwner && task.status === 'completed' && reviewSubmitted && (
          <div className="form-success">Thanks — your review has been submitted!</div>
        )}
      </div>
    </>
  );
}
