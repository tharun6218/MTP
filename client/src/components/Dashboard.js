import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from './Navbar';
import LocationMap from './LocationMapSimple';
import LocationHistoryMap from './LocationHistoryMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [riskHistory, setRiskHistory] = useState([]);
  const [activities, setActivities] = useState([]);
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

      const [userRes, sessionRes, activityRes] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/session/current'),
        api.get('/api/session/activity').catch(() => ({ data: { activities: [] } }))
      ]);

      setUser(userRes.data.user);
      setSession(sessionRes.data.session);
      const currentRisk = sessionRes.data.riskScore || sessionRes.data.session?.riskScore || 0;
      setRiskScore(currentRisk);
      
      // Update risk history
      setRiskHistory(prev => {
        const newHistory = [...prev, { time: new Date().toLocaleTimeString(), risk: currentRisk }];
        return newHistory.slice(-10); // Keep last 10 data points
      });
      
      // Set activities
      if (activityRes.data.activities) {
        setActivities(activityRes.data.activities.slice(-10).reverse());
      }
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
  
  const getRiskColor = () => {
    if (riskScore >= 70) return '#dc3545';
    if (riskScore >= 40) return '#ffc107';
    return '#28a745';
  };

  const chartData = riskHistory.length > 0 ? riskHistory : [
    { time: 'Now', risk: riskScore }
  ];

  return (
    <div className="dashboard-wrapper">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container">
        {/* Enhanced Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card risk-score-card" style={{ 
            background: `linear-gradient(135deg, ${getRiskColor()} 0%, ${getRiskColor()}dd 100%)`,
            borderLeft: `6px solid ${getRiskColor()}`
          }}>
            <div className="stat-icon">🛡️</div>
            <h3>{riskScore.toFixed(1)}</h3>
            <p>Current Risk Score</p>
            <div className={`risk-badge-large risk-${riskLevel}`}>
              {riskLevel.toUpperCase()} RISK
            </div>
          </div>
          <div className="stat-card" style={{ 
            background: 'var(--warning)'
          }}>
            <div className="stat-icon">⚡</div>
            <h3>{session?.metrics?.requestsPerMinute?.toFixed(1) || 0}</h3>
            <p>Requests/Minute</p>
            <div className="stat-trend">
              {session?.metrics?.requestsPerMinute > 30 ? '⚠️ High' : '✓ Normal'}
            </div>
          </div>
          <div className="stat-card" style={{ 
            background: 'var(--info)'
          }}>
            <div className="stat-icon">🔗</div>
            <h3>{session?.metrics?.uniqueEndpoints || 0}</h3>
            <p>Unique Endpoints</p>
            <div className="stat-trend">
              {session?.metrics?.uniqueEndpoints > 15 ? '⚠️ Scanning' : '✓ Normal'}
            </div>
          </div>
          <div className="stat-card" style={{ 
            background: 'var(--success)'
          }}>
            <div className="stat-icon">⏱️</div>
            <h3>{session?.startTime ? Math.floor((Date.now() - new Date(session.startTime)) / 60000) : 0}</h3>
            <p>Session Duration (min)</p>
            <div className="stat-trend">Active</div>
          </div>
        </div>

        {/* Risk Trend Chart */}
        {riskHistory.length > 0 && (
          <div className="card chart-card">
            <h2>📊 Real-Time Risk Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getRiskColor()} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={getRiskColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis domain={[0, 100]} stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="risk" 
                  stroke={getRiskColor()} 
                  strokeWidth={3}
                  fill="url(#riskGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Location Map */}
        {session?.location && (
          <div className="card">
            <LocationMap 
              location={session.location}
              riskLevel={riskLevel}
              sessionInfo={{
                ip: session.ip,
                device: session.device,
                browser: session.browser
              }}
            />
          </div>
        )}

        {/* Location History Map */}
        <div className="card">
          <LocationHistoryMap />
        </div>

        {/* Enhanced Session Information */}
        <div className="card session-info-card">
          <h2>🔐 Session Information</h2>
          <div className="session-info-grid">
            <div className="info-card">
              <div className="info-icon">📊</div>
              <div className="info-content">
                <span className="info-label">Status</span>
                <span className={`status-badge status-${session?.status || 'active'}`}>
                  {session?.status || 'Active'}
                </span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">⚠️</div>
              <div className="info-content">
                <span className="info-label">Risk Level</span>
                <span className={`risk-badge risk-${riskLevel}`}>
                  {riskLevel.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">🌐</div>
              <div className="info-content">
                <span className="info-label">IP Address</span>
                <span className="info-value">{session?.ip || 'Unknown'}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">🖥️</div>
              <div className="info-content">
                <span className="info-label">Device</span>
                <span className="info-value">{session?.device || 'Unknown'}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">🌍</div>
              <div className="info-content">
                <span className="info-label">Location</span>
                <span className="info-value">
                  {session?.location?.city || 'Unknown'}, {session?.location?.country || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">⏱️</div>
              <div className="info-content">
                <span className="info-label">Duration</span>
                <span className="info-value">
                  {session?.startTime ? Math.floor((Date.now() - new Date(session.startTime)) / 60000) : 0} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {activities.length > 0 && (
          <div className="card activity-card">
            <h2>📋 Recent Activity</h2>
            <div className="activity-list">
              {activities.map((activity, index) => (
                <div key={index} className="activity-item-enhanced">
                  <div className="activity-time">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="activity-details-enhanced">
                    <span className={`method-badge method-${activity.method.toLowerCase()}`}>
                      {activity.method}
                    </span>
                    <span className="activity-endpoint">{activity.endpoint}</span>
                    <span className={`status-code status-${Math.floor(activity.statusCode / 100)}xx`}>
                      {activity.statusCode}
                    </span>
                    <span className={`risk-badge-small risk-${activity.riskScore >= 70 ? 'high' : activity.riskScore >= 40 ? 'medium' : 'low'}`}>
                      {activity.riskScore?.toFixed(1) || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              className="btn btn-primary"
              onClick={() => navigate('/simulations')}
              style={{ background: 'var(--info)' }}
            >
              🎭 View Scenarios Demo
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




