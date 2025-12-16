import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from './Navbar';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Check if we have a session token
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const [userRes, sessionRes] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/session/current')
      ]);

      setUser(userRes.data.user);
      setSession(sessionRes.data.session);
      setRiskScore(sessionRes.data.riskScore || sessionRes.data.session?.riskScore || 0);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('sessionToken');
        navigate('/login');
      } else {
        console.error('Dashboard error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout', {});
      localStorage.removeItem('token');
      localStorage.removeItem('sessionToken');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const simulateSuspiciousActivity = async () => {
    try {
      // Simulate IP change by making request with different IP header
      await api.get('/api/session/current', {
        headers: {
          'x-ip': '192.168.1.100' // Different IP
        }
      });
      fetchDashboardData();
    } catch (err) {
      if (err.response?.data?.action === 'terminate') {
        alert('Session terminated due to suspicious activity!');
        navigate('/login');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{riskScore.toFixed(1)}</h3>
            <p>Current Risk Score</p>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <h3>{session?.metrics?.requestsPerMinute?.toFixed(1) || 0}</h3>
            <p>Requests/Minute</p>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <h3>{session?.metrics?.uniqueEndpoints || 0}</h3>
            <p>Unique Endpoints</p>
          </div>
        </div>

        <div className="card">
          <h2>Session Information</h2>
          <div className="session-info">
            <div className="info-row">
              <span className="label">Status:</span>
              <span className={`status-badge status-${session?.status || 'active'}`}>
                {session?.status || 'Active'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Risk Level:</span>
              <span className={`risk-badge risk-${riskLevel}`}>
                {riskLevel.toUpperCase()}
              </span>
            </div>
            <div className="info-row">
              <span className="label">IP Address:</span>
              <span>{session?.ip || 'Unknown'}</span>
            </div>
            <div className="info-row">
              <span className="label">Device:</span>
              <span>{session?.device || 'Unknown'}</span>
            </div>
            <div className="info-row">
              <span className="label">Location:</span>
              <span>{session?.location?.city || 'Unknown'}, {session?.location?.country || 'Unknown'}</span>
            </div>
            <div className="info-row">
              <span className="label">Session Duration:</span>
              <span>{session?.startTime ? Math.floor((Date.now() - new Date(session.startTime)) / 60000) : 0} minutes</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Quick Actions</h2>
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/risk-profile')}
            >
              View Risk Profile
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/session-monitor')}
            >
              Session Monitor
            </button>
            <button
              className="btn btn-danger"
              onClick={simulateSuspiciousActivity}
            >
              Simulate Suspicious Activity (Demo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;




