import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getOpenTasks, CATEGORIES } from '../lib/data';

export default function BrowseTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');
  const [params] = useSearchParams();
  const q = (params.get('q') || '').toLowerCase();

  useEffect(() => {
    let active = true;
    getOpenTasks()
      .then((data) => { if (active) setTasks(data); })
      .catch(() => { if (active) setError('Could not load tasks right now.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesCat = category === 'All' || t.category === category;
      const matchesQ = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [tasks, category, q]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Browse Open Tasks</h1>
          <p>Find tasks near you and apply to the ones that match your skills.</p>
        </div>
      </div>

      <div className="app-shell">
        <div className="field" style={{ maxWidth: 280, marginBottom: '1.5rem' }}>
          <label>Filter by category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>All</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {loading && <div className="loading-wrap">Loading tasks…</div>}
        {error && <div className="form-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <h3>No open tasks right now</h3>
            <p>Check back soon, or try a different category.</p>
          </div>
        )}

        <div className="task-list">
          {filtered.map((task) => (
            <Link to={`/tasks/${task.id}`} className="task-card" key={task.id} style={{ display: 'block' }}>
              <div className="task-card-top">
                <h3>{task.title}</h3>
                <span className="status-pill status-open">Open</span>
              </div>
              <div className="task-meta">
                <span>📁 {task.category}</span>
                <span>📍 {task.city}</span>
              </div>
              <p className="task-desc">{task.description}</p>
              <div className="task-foot">
                <span className="budget">₹{task.budget}</span>
                <span className="btn btn-outline" style={{ pointerEvents: 'none' }}>View & Apply →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
