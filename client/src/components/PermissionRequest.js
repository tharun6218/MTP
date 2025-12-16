import React, { useState, useEffect } from 'react';
import './PermissionRequest.css';

const PermissionRequest = ({ onGranted }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissions, setPermissions] = useState({
    geolocation: false,
    granted: false
  });

  useEffect(() => {
    // Check and request permissions on mount
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    // Request geolocation permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissions(prev => ({ ...prev, geolocation: true, granted: true }));
          if (onGranted) onGranted();
        },
        () => {
          setShowPrompt(true);
        },
        { timeout: 5000 }
      );
    } else {
      // Geolocation not supported, continue anyway
      setPermissions(prev => ({ ...prev, granted: true }));
      if (onGranted) onGranted();
    }
  };

  const handleGrant = () => {
    requestPermissions();
    setShowPrompt(false);
  };

  const handleSkip = () => {
    setPermissions(prev => ({ ...prev, granted: true }));
    setShowPrompt(false);
    if (onGranted) onGranted();
  };

  if (!showPrompt && permissions.granted) {
    return null;
  }

  return (
    <div className="permission-overlay">
      <div className="permission-modal">
        <h2>🔒 Security Permissions</h2>
        <p>To enhance your security, we need to collect:</p>
        <ul>
          <li>📍 Location information (for risk assessment)</li>
          <li>🖥️ Device information (for device fingerprinting)</li>
          <li>🌐 IP address (for session monitoring)</li>
        </ul>
        <p className="permission-note">
          This information helps us detect suspicious login attempts and protect your account.
        </p>
        <div className="permission-actions">
          <button className="btn btn-primary" onClick={handleGrant}>
            Grant Permissions
          </button>
          <button className="btn btn-secondary" onClick={handleSkip}>
            Skip (Limited Security)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionRequest;


