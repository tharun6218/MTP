import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div>
        <h1>🛡️ Adaptive Auth System</h1>
      </div>
      <div className="navbar-nav">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/risk-profile">Risk Profile</Link>
        <Link to="/session-monitor">Session Monitor</Link>
        {user && (
          <span className="user-info">
            {user.username}
          </span>
        )}
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;





