import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './UserLogin.css';

const AuthNav = () => (
  <nav className="auth-nav">
    <Link to="/" className="nav-brand">BIOBASKET</Link>
    <div className="nav-links">
      <Link to="/">Back to Store</Link>
    </div>
  </nav>
);

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginAdmin(email, password);
    
    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        setError('Access denied. Admin login required.');
        setLoading(false);
      }
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <nav className="admin-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/">Back to Store</Link>
        </div>
      </nav>
      <div className="auth-container">
        <div className="auth-form-header">
          <h1>Admin Login</h1>
          <p>Secure access for authorized personnel.</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <input
              type="email"
              id="admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@sivahoneyform.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </button>
          <div className="auth-switch-link">
            Not an admin? <Link to="/login">User Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
