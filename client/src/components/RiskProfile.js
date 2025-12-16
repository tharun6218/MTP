import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from './Navbar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './RiskProfile.css';

const RiskProfile = () => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, historyRes] = await Promise.all([
        api.get('/api/risk/profile'),
        api.get('/api/risk/login-history')
      ]);

      setProfile(profileRes.data);
      setHistory(historyRes.data.history || []);
    } catch (err) {
      console.error('Error fetching risk data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const chartData = history.slice(-10).reverse().map((login, index) => ({
    name: `Login ${index + 1}`,
    riskScore: login.riskScore || 0,
    timestamp: new Date(login.timestamp).toLocaleTimeString()
  }));

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="card">
          <h2>Risk Profile</h2>
          {profile && (
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">Current Risk Score:</span>
                <span className={`risk-badge risk-${profile.riskLevel}`}>
                  {profile.currentRiskScore.toFixed(1)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Average Risk Score:</span>
                <span>{profile.averageRiskScore.toFixed(1)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Known Devices:</span>
                <span>{profile.knownDevices}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Known Locations:</span>
                <span>{profile.knownLocations}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Recent Logins:</span>
                <span>{profile.recentLogins}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Risk Score Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="riskScore" stroke="#667eea" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Login History</h2>
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>IP Address</th>
                  <th>Location</th>
                  <th>Device</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((login, index) => (
                  <tr key={index}>
                    <td>{new Date(login.timestamp).toLocaleString()}</td>
                    <td>{login.ip}</td>
                    <td>{login.location?.city}, {login.location?.country}</td>
                    <td>{login.device}</td>
                    <td>
                      <span className={`risk-badge risk-${login.riskScore >= 70 ? 'high' : login.riskScore >= 40 ? 'medium' : 'low'}`}>
                        {login.riskScore?.toFixed(1) || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${login.status}`}>
                        {login.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskProfile;

