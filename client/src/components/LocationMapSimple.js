import React from 'react';
import './LocationMap.css';

const LocationMapSimple = ({ location, riskLevel, sessionInfo }) => {
  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Get coordinates for map
  const getMapUrl = () => {
    let lat = 20.5937; // Default: India
    let lon = 78.9629;
    
    if (location && location.latitude && location.longitude) {
      lat = location.latitude;
      lon = location.longitude;
    } else if (location && location.country) {
      const countryCoords = {
        'India': [20.5937, 78.9629],
        'United States': [37.0902, -95.7129],
        'United Kingdom': [55.3781, -3.4360],
        'Canada': [56.1304, -106.3468],
        'Australia': [-25.2744, 133.7751],
        'Germany': [51.1657, 10.4515],
        'France': [46.2276, 2.2137],
        'Japan': [36.2048, 138.2529],
        'China': [35.8617, 104.1954],
      };
      const coords = countryCoords[location.country] || [20.5937, 78.9629];
      lat = coords[0];
      lon = coords[1];
    }

    // Use OpenStreetMap embed with marker
    const zoom = location && location.latitude ? 12 : 6;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.05},${lat-0.05},${lon+0.05},${lat+0.05}&layer=mapnik&marker=${lat},${lon}&zoom=${zoom}`;
  };

  return (
    <div className="location-map-container">
      <div className="map-header">
        <h3>📍 Location & Security Map</h3>
        {location && (
          <div className="location-info">
            <span className="location-text">
              {location.city || 'Unknown'}, {location.country || 'Unknown'}
            </span>
            <span className={`risk-indicator risk-${riskLevel || 'low'}`}>
              {(riskLevel || 'UNKNOWN').toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div style={{ 
        height: '400px', 
        width: '100%', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: `2px solid ${getRiskColor(riskLevel || 'low')}`,
        transition: 'all 0.3s ease'
      }}
      >
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={getMapUrl()}
          style={{ border: 'none' }}
          title="Location Map"
        />
      </div>
      {sessionInfo && (
        <div className="map-footer">
          <div className="map-stats">
            <div className="map-stat-item">
              <span className="stat-icon">🌐</span>
              <span>{sessionInfo.ip}</span>
            </div>
            <div className="map-stat-item">
              <span className="stat-icon">🖥️</span>
              <span>{sessionInfo.device}</span>
            </div>
            <div className="map-stat-item">
              <span className="stat-icon">🔒</span>
              <span className={`risk-${riskLevel || 'low'}`}>{riskLevel || 'low'} Risk</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMapSimple;

