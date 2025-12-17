import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import RiskProfile from './components/RiskProfile';
import SessionMonitor from './components/SessionMonitor';
import PermissionRequest from './components/PermissionRequest';
import ThemeToggle from './components/ThemeToggle';
import SimulationDemo from './components/SimulationDemo';
import './App.css';

function App() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    // Check if permissions were already granted
    const granted = localStorage.getItem('permissionsGranted');
    if (granted === 'true') {
      setPermissionsGranted(true);
    }
  }, []);

  const handlePermissionsGranted = () => {
    localStorage.setItem('permissionsGranted', 'true');
    setPermissionsGranted(true);
  };

  return (
    <Router>
      <div className="App">
        {!permissionsGranted && (
          <PermissionRequest onGranted={handlePermissionsGranted} />
        )}
        <ThemeToggle />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/risk-profile" element={<RiskProfile />} />
          <Route path="/session-monitor" element={<SessionMonitor />} />
          <Route path="/simulations" element={<SimulationDemo />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

