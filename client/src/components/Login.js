import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getDeviceInfo, getIPAddress } from '../utils/deviceInfo';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskInfo, setRiskInfo] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRiskInfo(null);

    try {
      // Get device information
      const deviceInfo = await getDeviceInfo();
      const ipAddress = await getIPAddress();

      // Prepare login metadata
      const loginMetadata = {
        'x-device-id': deviceInfo.deviceId,
        'x-device': deviceInfo.device,
        'x-country': deviceInfo.location.country,
        'x-city': deviceInfo.location.city,
        'x-latitude': deviceInfo.location.latitude?.toString() || '',
        'x-longitude': deviceInfo.location.longitude?.toString() || '',
        'x-ip': ipAddress,
        'x-ip-reputation': '0.7'
      };

      const response = await api.post('/api/auth/login', formData, {
        headers: loginMetadata
      });

      if (response.data.mfaRequired) {
        setMfaRequired(true);
        setRiskInfo({
          riskScore: response.data.riskScore,
          riskLevel: response.data.riskLevel,
          message: 'MFA required due to medium risk'
        });
      } else {
        // Login successful
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('sessionToken', response.data.sessionToken);
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.data?.action === 'block') {
        setError(`Login blocked! Risk Score: ${err.response.data.riskScore}`);
        setRiskInfo({
          riskScore: err.response.data.riskScore,
          riskLevel: 'high',
          message: 'High risk detected - Login blocked'
        });
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get device information for MFA session
      const deviceInfo = await getDeviceInfo();
      const ipAddress = await getIPAddress();

      const response = await api.post('/api/auth/verify-mfa', {
        username: formData.username,
        mfaCode: mfaCode
      }, {
        headers: {
          'x-device-id': deviceInfo.deviceId,
          'x-device': deviceInfo.device,
          'x-country': deviceInfo.location.country,
          'x-city': deviceInfo.location.city,
          'x-latitude': deviceInfo.location.latitude?.toString() || '',
          'x-longitude': deviceInfo.location.longitude?.toString() || '',
          'x-ip': ipAddress
        }
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('sessionToken', response.data.sessionToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'MFA verification failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🔐 Adaptive Authentication</h1>
        <p className="subtitle">AI-Powered Risk-Based Security</p>

        {error && (
          <div className={`alert ${riskInfo?.riskLevel === 'high' ? 'alert-danger' : 'alert-warning'}`}>
            {error}
          </div>
        )}

        {riskInfo && (
          <div className="risk-info">
            <div className={`risk-badge risk-${riskInfo.riskLevel}`}>
              Risk: {riskInfo.riskLevel.toUpperCase()} ({riskInfo.riskScore.toFixed(1)})
            </div>
            <p>{riskInfo.message}</p>
          </div>
        )}

        {!mfaRequired ? (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Username / Email</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                placeholder="Enter username or email"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Enter password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMFA}>
            <div className="input-group">
              <label>MFA Code</label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                placeholder="Enter MFA code (use: 123456)"
                maxLength="6"
              />
              <small>Demo: Use code 123456</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify MFA'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setMfaRequired(false);
                setMfaCode('');
              }}
              style={{ marginLeft: '10px' }}
            >
              Back
            </button>
          </form>
        )}

        <div className="demo-info">
          <h3>Demo Scenarios:</h3>
          <ul>
            <li><strong>Normal Login:</strong> Use existing account from same device</li>
            <li><strong>MFA Trigger:</strong> Login from new device/location (simulate by changing device ID)</li>
            <li><strong>Blocked Login:</strong> High risk score (>70) blocks access</li>
          </ul>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>Don't have an account? <a href="/register" style={{ color: '#667eea' }}>Register here</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;

