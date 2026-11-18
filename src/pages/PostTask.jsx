import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTask, CATEGORIES } from '../lib/data';

export default function PostTask() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState(profile?.city || 'Hyderabad');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!user) {
      navigate('/login');
      return;
    }
    if (!title.trim() || !description.trim() || !budget) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const taskId = await createTask({
        title: title.trim(),
        category,
        description: description.trim(),
        budget: Number(budget),
        city,
        address: address.trim(),
        customerId: user.uid,
        customerName: profile?.name || user.displayName || 'EZTAP User',
      });
      navigate(`/tasks/${taskId}`);
    } catch {
      setError('Could not post your task. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Post a Task</h1>
          <p>Describe what you need help with — nearby verified helpers will see it and apply.</p>
        </div>
      </div>

      <div className="app-shell" style={{ maxWidth: 640 }}>
        <div className="card">
          {!user && (
            <div className="form-error">
              You'll need to <a href="/login" style={{ fontWeight: 700 }}>log in</a> or <a href="/signup" style={{ fontWeight: 700 }}>sign up</a> to post a task — your draft will be kept while you do.
            </div>
          )}
          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Task title</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fix leaking kitchen tap" />
            </div>

            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Description</label>
              <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Give helpers the details they'll need — what, when, and any specifics." />
            </div>

            <div className="field">
              <label>Your budget (₹)</label>
              <input required type="number" min="1" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500" />
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
              <label>Address / area (optional)</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Gachibowli, near DLF Cyber City" />
            </div>

            <button className="btn btn-solid btn-block btn-lg" disabled={loading}>
              {loading ? 'Posting…' : 'Post Task'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
