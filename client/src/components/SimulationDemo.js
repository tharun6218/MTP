import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from './Navbar';
import './SimulationDemo.css';

const scenarios = [
  {
    id: 1,
    title: 'Normal Login from Known Device',
    description: 'User logs in from a familiar device and location during normal hours',
    device: 'Known Device',
    deviceId: 'known-device-123',
    location: { country: 'India', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
    time: '10:30 AM',
    riskScore: 20,
    riskLevel: 'low',
    action: 'Direct Login',
    result: '✅ Seamless user experience',
    color: '#28a745'
  },
  {
    id: 2,
    title: 'Login from New Device',
    description: 'User logs in from a new device but known location',
    device: 'New Device',
    deviceId: 'new-device-456',
    location: { country: 'India', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
    time: '2:15 PM',
    riskScore: 50,
    riskLevel: 'medium',
    action: 'MFA Required',
    result: '✅ Additional security layer',
    color: '#ffc107'
  },
  {
    id: 3,
    title: 'Login from New Location',
    description: 'User logs in from known device but different country',
    device: 'Known Device',
    deviceId: 'known-device-123',
    location: { country: 'United States', city: 'New York', latitude: 40.7128, longitude: -74.0060 },
    time: '11:00 AM',
    riskScore: 55,
    riskLevel: 'medium',
    action: 'MFA Required',
    result: '✅ Geographic anomaly detected',
    color: '#ffc107'
  },
  {
    id: 4,
    title: 'Suspicious Login Pattern',
    description: 'Login from new device, new location, at odd hours',
    device: 'Unknown Device',
    deviceId: 'suspicious-device-789',
    location: { country: 'Russia', city: 'Moscow', latitude: 55.7558, longitude: 37.6173 },
    time: '3:00 AM',
    riskScore: 80,
    riskLevel: 'high',
    action: 'Login Blocked',
    result: '✅ Attack prevented',
    color: '#dc3545'
  },
  {
    id: 5,
    title: 'Session Hijacking Attempt',
    description: 'Active session shows IP address change',
    device: 'Active Session',
    deviceId: 'session-123',
    location: { country: 'China', city: 'Beijing', latitude: 39.9042, longitude: 116.4074 },
    time: 'Current',
    riskScore: 85,
    riskLevel: 'high',
    action: 'Session Terminated',
    result: '✅ Unauthorized access prevented',
    color: '#dc3545',
    isSession: true
  },
  {
    id: 6,
    title: 'Bot-Like Behavior',
    description: 'Session shows automated attack patterns',
    device: 'Active Session',
    deviceId: 'session-123',
    location: { country: 'India', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
    time: 'Current',
    riskScore: 90,
    riskLevel: 'high',
    action: 'Session Terminated',
    result: '✅ Automated attack detected',
    color: '#dc3545',
    isSession: true,
    metrics: { requestsPerMinute: 150, uniqueEndpoints: 45 }
  }
];

const SimulationDemo = () => {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simulatingScenarioId, setSimulatingScenarioId] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const simulationRef = useRef(false);

  React.useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const runSimulation = async (scenario) => {
    // Prevent multiple simulations from running using ref for immediate check
    if (simulationRef.current || simulating) {
      console.log('Simulation already in progress, ignoring click');
      return;
    }

    // Set ref immediately to prevent race conditions
    simulationRef.current = true;
    setSelectedScenario(scenario);
    setSimulating(true);
    setSimulatingScenarioId(scenario.id);
    setSimulationResult(null);

    // Simulate the scenario with a delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      if (scenario.isSession) {
        // For session scenarios, simulate session activity
        if (scenario.id === 5) {
          // IP change simulation
          try {
            const result = await api.post('/api/session/simulate-ip-change', {}, {
              headers: {
                'x-new-ip': scenario.location.country === 'China' ? '192.168.1.200' : '192.168.1.100'
              }
            });
            setSimulationResult({
              success: true,
              message: result.data.message || 'IP change detected in active session',
              data: result.data
            });
          } catch (error) {
            if (error.response?.status === 401) {
              setSimulationResult({
                success: true,
                message: 'Session simulation: No active session found. This scenario requires an active session.',
                data: { 
                  riskScore: scenario.riskScore,
                  riskLevel: scenario.riskLevel,
                  action: scenario.action
                }
              });
            } else {
              throw error;
            }
          }
        } else if (scenario.id === 6) {
          // Bot-like behavior simulation
          try {
            const result = await api.post('/api/session/simulate-bot-activity');
            setSimulationResult({
              success: true,
              message: result.data.message || 'Bot-like activity detected',
              data: result.data
            });
          } catch (error) {
            if (error.response?.status === 401) {
              setSimulationResult({
                success: true,
                message: 'Session simulation: No active session found. This scenario requires an active session.',
                data: { 
                  riskScore: scenario.riskScore,
                  riskLevel: scenario.riskLevel,
                  action: scenario.action,
                  metrics: scenario.metrics
                }
              });
            } else {
              throw error;
            }
          }
        }
      } else {
        // For login scenarios, simulate login attempt
        const loginData = {
          username: user?.username || 'demo',
          password: 'demo123',
          scenario: scenario.id
        };

        const headers = {
          'x-device-id': scenario.deviceId,
          'x-device': scenario.device,
          'x-country': scenario.location.country,
          'x-city': scenario.location.city,
          'x-latitude': scenario.location.latitude.toString(),
          'x-longitude': scenario.location.longitude.toString(),
          'x-ip-reputation': scenario.riskScore > 70 ? '0.2' : '0.7',
          'x-ip': scenario.location.country === 'Russia' ? '192.168.1.200' : '192.168.1.1'
        };

        try {
          const response = await api.post('/api/auth/simulate-login', loginData, { headers });
          setSimulationResult({
            success: true,
            message: response.data.message || 'Simulation completed',
            data: response.data
          });
        } catch (error) {
          // Expected errors for blocked logins
          if (error.response?.status === 403) {
            setSimulationResult({
              success: true,
              message: 'Login blocked as expected - High risk detected',
              data: error.response.data
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      setSimulationResult({
        success: false,
        message: error.response?.data?.error || 'Simulation failed',
        error: error.message
      });
    } finally {
      setSimulating(false);
      setSimulatingScenarioId(null);
      simulationRef.current = false;
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '#28a745';
      case 'medium': return '#ffc107';
      case 'high': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="simulation-demo-wrapper">
      <Navbar user={user} onLogout={() => navigate('/login')} />
      <div className="container">
        <div className="simulation-header">
          <h1>🎭 Adaptive Authentication Scenarios</h1>
          <p className="subtitle">Demonstrate how the system responds to different risk patterns</p>
        </div>

        <div className="scenarios-grid">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`scenario-card ${selectedScenario?.id === scenario.id ? 'active' : ''}`}
              style={{ borderLeft: `6px solid ${scenario.color}` }}
            >
              <div className="scenario-header">
                <h3>{scenario.title}</h3>
                <span className={`risk-badge risk-${scenario.riskLevel}`}>
                  {scenario.riskLevel.toUpperCase()}
                </span>
              </div>
              <p className="scenario-description">{scenario.description}</p>
              
              <div className="scenario-details">
                <div className="detail-item">
                  <span className="detail-label">Device:</span>
                  <span className="detail-value">{scenario.device}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{scenario.location.city}, {scenario.location.country}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">{scenario.time}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Risk Score:</span>
                  <span className="detail-value" style={{ color: scenario.color, fontWeight: '700' }}>
                    {scenario.riskScore}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Action:</span>
                  <span className="detail-value action-badge" style={{ backgroundColor: `${scenario.color}20`, color: scenario.color }}>
                    {scenario.action}
                  </span>
                </div>
              </div>

              <div className="scenario-result">
                <strong>{scenario.result}</strong>
              </div>

              <button
                type="button"
                className="btn-simulate"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  
                  // Double check using both state and ref
                  if (simulating || simulationRef.current) {
                    return;
                  }
                  
                  runSimulation(scenario);
                }}
                disabled={simulating}
                style={{ 
                  backgroundColor: scenario.color,
                  opacity: simulating && simulatingScenarioId !== scenario.id ? 0.5 : 1,
                  cursor: simulating ? 'not-allowed' : 'pointer',
                  pointerEvents: simulating && simulatingScenarioId !== scenario.id ? 'none' : 'auto'
                }}
              >
                {simulating && simulatingScenarioId === scenario.id ? 'Running...' : 'Run Simulation'}
              </button>
            </div>
          ))}
        </div>

        {simulationResult && (
          <div className={`simulation-result-card ${simulationResult.success ? 'success' : 'error'}`}>
            <h3>Simulation Result</h3>
            <div className="result-content">
              <p className="result-message">{simulationResult.message}</p>
              {simulationResult.data && (
                <div className="result-details">
                  <div className="result-item">
                    <strong>Risk Score:</strong> 
                    <span style={{ 
                      color: (simulationResult.data.riskScore || selectedScenario?.riskScore) >= 70 ? '#dc3545' : 
                             (simulationResult.data.riskScore || selectedScenario?.riskScore) >= 40 ? '#ffc107' : '#28a745',
                      fontWeight: '700',
                      marginLeft: '8px'
                    }}>
                      {simulationResult.data.riskScore || selectedScenario?.riskScore}
                    </span>
                  </div>
                  <div className="result-item">
                    <strong>Risk Level:</strong> 
                    <span className={`risk-badge risk-${simulationResult.data.riskLevel || selectedScenario?.riskLevel}`} style={{ marginLeft: '8px' }}>
                      {(simulationResult.data.riskLevel || selectedScenario?.riskLevel).toUpperCase()}
                    </span>
                  </div>
                  {simulationResult.data.action && (
                    <div className="result-item">
                      <strong>Action Taken:</strong> 
                      <span style={{ 
                        color: simulationResult.data.action === 'block' || simulationResult.data.action === 'terminated' ? '#dc3545' : 
                               simulationResult.data.action === 'mfa' ? '#ffc107' : '#28a745',
                        fontWeight: '700',
                        marginLeft: '8px'
                      }}>
                        {simulationResult.data.action === 'block' ? 'Login Blocked' :
                         simulationResult.data.action === 'mfa' ? 'MFA Required' :
                         simulationResult.data.action === 'terminated' ? 'Session Terminated' :
                         simulationResult.data.action === 'allow' ? 'Login Allowed' :
                         simulationResult.data.action}
                      </span>
                    </div>
                  )}
                  {simulationResult.data.mfaRequired && (
                    <div className="result-item">
                      <strong>MFA Required:</strong> 
                      <span style={{ color: '#ffc107', fontWeight: '700', marginLeft: '8px' }}>Yes</span>
                    </div>
                  )}
                  {simulationResult.data.metrics && (
                    <div className="result-item">
                      <strong>Metrics:</strong>
                      <div style={{ marginTop: '8px', fontSize: '13px' }}>
                        <div>Requests/Min: {simulationResult.data.metrics.requestsPerMinute}</div>
                        <div>Unique Endpoints: {simulationResult.data.metrics.uniqueEndpoints}</div>
                        <div>Error Rate: {(simulationResult.data.metrics.errorRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              className="btn-close-result"
              onClick={() => setSimulationResult(null)}
            >
              Close
            </button>
          </div>
        )}

        <div className="info-card">
          <h3>📚 How It Works</h3>
          <ul>
            <li><strong>Low Risk (0-39):</strong> Direct login allowed, seamless experience</li>
            <li><strong>Medium Risk (40-69):</strong> MFA required, additional verification</li>
            <li><strong>High Risk (70+):</strong> Login blocked or session terminated</li>
          </ul>
          <p className="info-note">
            The system uses machine learning models combined with rule-based checks to calculate risk scores
            based on device fingerprinting, location, time patterns, and behavioral analysis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimulationDemo;

