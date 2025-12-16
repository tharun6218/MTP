import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from './Navbar';
import './SessionMonitor.css';

const SessionMonitor = () => {
  const [session, setSession] = useState(null);
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessionData();
    const interval = setInterval(fetchSessionData, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSessionData = async () => {
    try {
      const [sessionRes, activityRes] = await Promise.all([
        api.get('/api/session/current'),
        api.get('/api/session/activity')
      ]);

      setSession(sessionRes.data.session);
      setActivities(activityRes.data.activities || []);
      setMetrics(activityRes.data.metrics || {});
    } catch (err) {
      if (err.response?.data?.action === 'terminate') {
        alert('Session terminated due to suspicious activity!');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="card">
          <h2>Session Metrics</h2>
          {metrics && (
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>{metrics.requestsPerMinute?.toFixed(2) || 0}</h3>
                <p>Requests/Minute</p>
              </div>
              <div className="metric-card">
                <h3>{metrics.uniqueEndpoints || 0}</h3>
                <p>Unique Endpoints</p>
              </div>
              <div className="metric-card">
                <h3>{(metrics.errorRate * 100)?.toFixed(1) || 0}%</h3>
                <p>Error Rate</p>
              </div>
              <div className="metric-card">
                <h3>{metrics.ipChanges || 0}</h3>
                <p>IP Changes</p>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Real-time Activity Log</h2>
          <div className="activity-log">
            {activities.slice(-20).reverse().map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-time">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
                <div className="activity-details">
                  <span className="activity-method">{activity.method}</span>
                  <span className="activity-endpoint">{activity.endpoint}</span>
                  <span className={`status-code status-${Math.floor(activity.statusCode / 100)}xx`}>
                    {activity.statusCode}
                  </span>
                  <span className={`risk-badge risk-${activity.riskScore >= 70 ? 'high' : activity.riskScore >= 40 ? 'medium' : 'low'}`}>
                    Risk: {activity.riskScore?.toFixed(1) || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionMonitor;

