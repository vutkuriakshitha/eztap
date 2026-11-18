import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="footer-word">eztap</span>
            <p>A hyperlocal marketplace where people post everyday tasks and trusted neighbours get them done.</p>
          </div>
          <div className="footer-col">
            <h4>Hire</h4>
            <ul>
              <li><Link to="/post-task">Post a task</Link></li>
              <li><Link to="/dashboard">My tasks</Link></li>
              <li><Link to="/#how-it-works">How it works</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Earn</h4>
            <ul>
              <li><Link to="/browse-tasks">Find work</Link></li>
              <li><Link to="/profile">My profile</Link></li>
              <li><Link to="/signup">Create an account</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 EZTAP. A final-year project, built in India.</span>
          <span>Payments and ID checks are on the roadmap.</span>
        </div>
      </div>
    </footer>
  );
}
