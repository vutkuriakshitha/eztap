import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTasksByCustomer, getTasksByHelper, getApplicationsByHelper,
  getApplicationsForCustomer, getTask,
} from '../lib/data';

const STATUS_LABEL = {
  open: 'Open', assigned: 'Assigned', 'in-progress': 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_CLASS = {
  open: 'status-open', assigned: 'status-assigned', 'in-progress': 'status-progress',
  completed: 'status-completed', cancelled: 'status-cancelled',
};

function TaskCard({ task, extra }) {
  return (
    <Link to={`/tasks/${task.id}`} className="task-card" style={{ display: 'block' }}>
      <div className="task-card-top">
        <h3>{task.title}</h3>
        <span className={`status-pill ${STATUS_CLASS[task.status]}`}>{STATUS_LABEL[task.status]}</span>
      </div>
      <div className="task-meta">
        <span>📁 {task.category}</span>
        <span>📍 {task.city}</span>
      </div>
      <div className="task-foot">
        <span className="budget">₹{task.budget}</span>
        {extra}
      </div>
    </Link>
  );
}

function GetStarted({ items }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <section className="gs-card" aria-label="Get started">
      <div className="gs-head"><h3>Get started</h3><span>{done} of {items.length} done</span></div>
      <div className="gs-bar"><i style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <ul className="gs-list">
        {items.map((i) => (
          <li key={i.label} className={i.done ? 'gs-done' : ''}>
            {i.done
              ? <div><span className="gs-tick">✓</span>{i.label}</div>
              : <Link to={i.to}><span className="gs-tick" />{i.label}<span className="gs-go">{i.cta}</span></Link>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const mode = profile?.mode || 'customer';
  const isHelper = mode === 'helper';

  const [tab, setTab] = useState('assigned');
  const [posted, setPosted] = useState([]);
  const [counts, setCounts] = useState({});
  const [assigned, setAssigned] = useState([]);
  const [applied, setApplied] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        if (isHelper) {
          const [mine, apps] = await Promise.all([getTasksByHelper(user.uid), getApplicationsByHelper(user.uid)]);
          const details = (await Promise.all(apps.map((a) => getTask(a.taskId)))).filter(Boolean);
          if (active) { setAssigned(mine); setApplied(details); }
        } else {
          const [tasks, apps] = await Promise.all([getTasksByCustomer(user.uid), getApplicationsForCustomer(user.uid)]);
          const c = {};
          apps.forEach((a) => { c[a.taskId] = (c[a.taskId] || 0) + 1; });
          if (active) { setPosted(tasks); setCounts(c); }
        }
      } catch {
        if (active) setError('Could not load your tasks. Please refresh.');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (user && profile) load();
    return () => { active = false; };
  }, [user, profile, isHelper]);

  const list = isHelper ? (tab === 'assigned' ? assigned : applied) : posted;
  const waiting = posted.filter((t) => t.status === 'open' && counts[t.id]).length;

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>{isHelper ? 'My Work' : 'My Tasks'}{profile?.name ? ` · ${profile.name.split(' ')[0]}` : ''}</h1>
          <p>{isHelper
            ? "Tasks you've applied to and jobs you've been hired for."
            : waiting > 0 ? `${waiting} of your tasks ${waiting === 1 ? 'has' : 'have'} applicants waiting for you.` : "Tasks you've posted and who applied."}</p>
        </div>
      </div>

      <div className="app-shell">
        {!loading && (
          <GetStarted items={isHelper ? [
            { label: 'Create your account', done: true },
            { label: 'Verify your account', done: !!profile?.verified, to: '/profile', cta: 'Verify' },
            { label: 'Add your skills', done: !!profile?.skills, to: '/profile', cta: 'Add skills' },
            { label: 'Apply to your first task', done: assigned.length + applied.length > 0, to: '/browse-tasks', cta: 'Find work' },
          ] : [
            { label: 'Create your account', done: true },
            { label: 'Verify your account', done: !!profile?.verified, to: '/profile', cta: 'Verify' },
            { label: 'Post your first task', done: posted.length > 0, to: '/post-task', cta: 'Post a task' },
          ]} />
        )}

        {!isHelper && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Link to="/post-task" className="btn btn-solid btn-lg">+ Post a New Task</Link>
          </div>
        )}

        {isHelper && (
          <div className="tabs">
            <button className={tab === 'assigned' ? 'active' : ''} onClick={() => setTab('assigned')}>Hired ({assigned.length})</button>
            <button className={tab === 'applied' ? 'active' : ''} onClick={() => setTab('applied')}>My Applications ({applied.length})</button>
          </div>
        )}

        {loading && <div className="loading-wrap">Loading…</div>}
        {error && <div className="form-error">{error}</div>}

        {!loading && !error && list.length === 0 && (
          <div className="empty-state">
            <h3>Nothing here yet</h3>
            <p>{isHelper ? 'Find a task near you and apply.' : 'Post your first task to get help nearby.'}</p>
            <Link to={isHelper ? '/browse-tasks' : '/post-task'} className="btn btn-solid" style={{ marginTop: '1rem' }}>
              {isHelper ? 'Find Work' : 'Post a Task'}
            </Link>
          </div>
        )}

        <div className="task-list">
          {list.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              extra={!isHelper && task.status === 'open' && (
                <span className="applicant-count">{counts[task.id] || 0} applicant{(counts[task.id] || 0) === 1 ? '' : 's'}</span>
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}
