import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import './LocationHistoryMap.css';

// Device color palette - high contrast, visible colors
const DEVICE_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52BE80', // Green
  '#EC7063', // Coral
  '#5DADE2', // Light Blue
  '#F1948A', // Pink
  '#7FB3D3', // Steel Blue
  '#F4D03F', // Gold
];

const LocationHistoryMap = () => {
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    fetchLocationHistory();
  }, []);

  useEffect(() => {
    updateMapUrl();
  }, [locationData, selectedDevice]);

  const fetchLocationHistory = async () => {
    try {
      const response = await api.get('/api/auth/location-history');
      setLocationData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load location history');
    } finally {
      setLoading(false);
    }
  };

  const updateMapUrl = () => {
    // Always show map, even if no history
    let locationsToShow = [];
    let defaultLocation = { latitude: 20.5937, longitude: 78.9629 }; // Default: India
    
    if (locationData && locationData.locationHistory.length > 0) {
      locationsToShow = selectedDevice
        ? locationData.groupedByDevice.find(d => d.deviceId === selectedDevice)?.locations || []
        : locationData.locationHistory;
    }

    // Calculate center and bounds
    let lats, lngs, minLat, maxLat, minLng, maxLng, bbox;
    
    if (locationsToShow.length > 0) {
      lats = locationsToShow.map(l => l.location.latitude).filter(Boolean);
      lngs = locationsToShow.map(l => l.location.longitude).filter(Boolean);
      
      if (lats.length > 0 && lngs.length > 0) {
        minLat = Math.min(...lats);
        maxLat = Math.max(...lats);
        minLng = Math.min(...lngs);
        maxLng = Math.max(...lngs);
        
        // Add padding to bounds
        const latPadding = (maxLat - minLat) * 0.2 || 0.1;
        const lngPadding = (maxLng - minLng) * 0.2 || 0.1;
        
        bbox = `${minLng - lngPadding},${minLat - latPadding},${maxLng + lngPadding},${maxLat + latPadding}`;
      } else {
        // Use default location
        bbox = `${defaultLocation.longitude - 0.1},${defaultLocation.latitude - 0.1},${defaultLocation.longitude + 0.1},${defaultLocation.latitude + 0.1}`;
      }
    } else {
      // No locations - show default map
      bbox = `${defaultLocation.longitude - 0.1},${defaultLocation.latitude - 0.1},${defaultLocation.longitude + 0.1},${defaultLocation.latitude + 0.1}`;
    }
    
    // Build markers string
    let markers = '';
    if (locationsToShow.length > 0) {
      if (selectedDevice) {
        // Single device - use one color
        const deviceIndex = locationData.groupedByDevice.findIndex(d => d.deviceId === selectedDevice);
        const color = DEVICE_COLORS[deviceIndex % DEVICE_COLORS.length];
        locationsToShow.forEach(loc => {
          if (loc.location.latitude && loc.location.longitude) {
            markers += `&marker=${loc.location.latitude},${loc.location.longitude}`;
          }
        });
      } else {
        // Multiple devices - use different colors
        locationData.groupedByDevice.forEach((device, deviceIndex) => {
          const color = DEVICE_COLORS[deviceIndex % DEVICE_COLORS.length];
          device.locations.forEach(loc => {
            if (loc.location.latitude && loc.location.longitude) {
              markers += `&marker=${loc.location.latitude},${loc.location.longitude}`;
            }
          });
        });
      }
    }

    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markers}`;
    setMapUrl(url);
  };

  const getDeviceColor = (deviceIndex) => {
    return DEVICE_COLORS[deviceIndex % DEVICE_COLORS.length];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="location-history-container">
        <div className="loading-state">Loading location history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="location-history-container">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  const hasLocationData = locationData && locationData.locationHistory.length > 0;

  return (
    <div className="location-history-container">
      <div className="location-history-header">
        <h2>📍 Location History by Device</h2>
        {hasLocationData && (
          <div className="location-stats">
            <span className="stat-badge">{locationData.totalLocations} Locations</span>
            <span className="stat-badge">{locationData.uniqueDevices} Devices</span>
          </div>
        )}
      </div>

      {hasLocationData && (
        <div className="device-filter">
          <button
            className={`filter-btn ${selectedDevice === null ? 'active' : ''}`}
            onClick={() => setSelectedDevice(null)}
          >
            All Devices
          </button>
          {locationData.groupedByDevice.map((device, index) => (
            <button
              key={device.deviceId || index}
              className={`filter-btn ${selectedDevice === device.deviceId ? 'active' : ''}`}
              onClick={() => setSelectedDevice(device.deviceId)}
              style={{
                borderLeft: `4px solid ${getDeviceColor(index)}`,
                backgroundColor: selectedDevice === device.deviceId ? `${getDeviceColor(index)}20` : 'transparent'
              }}
            >
              <span className="device-color-indicator" style={{ backgroundColor: getDeviceColor(index) }}></span>
              {device.device} ({device.locations.length})
            </button>
          ))}
        </div>
      )}

      <div className="map-container">
        {mapUrl ? (
          <iframe
            width="100%"
            height="500"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={mapUrl}
            style={{ border: 'none', borderRadius: '12px' }}
            title="Location History Map"
          />
        ) : (
          <div className="map-placeholder">
            <div className="map-loading">Loading map...</div>
          </div>
        )}
        {!hasLocationData && (
          <div className="map-overlay-message">
            <p>No location history available yet.</p>
            <p className="map-overlay-subtitle">Locations will appear here after successful logins.</p>
          </div>
        )}
      </div>

      {hasLocationData && (
        <div className="location-list">
          <h3>Recent Locations</h3>
          <div className="locations-grid">
            {(selectedDevice
              ? locationData.groupedByDevice.find(d => d.deviceId === selectedDevice)?.locations || []
              : locationData.locationHistory
            ).slice(0, 20).map((login, index) => {
              const deviceIndex = locationData.groupedByDevice.findIndex(
                d => (d.deviceId || d.device) === (login.deviceId || login.device)
              );
              const color = getDeviceColor(deviceIndex >= 0 ? deviceIndex : 0);
              
              return (
                <div key={index} className="location-card" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="location-card-header">
                    <span className="device-badge" style={{ backgroundColor: color }}>
                      {login.device}
                    </span>
                    <span className="location-date">{formatDate(login.timestamp)}</span>
                  </div>
                  <div className="location-details">
                    <div className="location-info">
                      <strong>📍 {login.location.city}, {login.location.country}</strong>
                    </div>
                    <div className="location-meta">
                      <span>IP: {login.ip}</span>
                      <span>Risk: {login.riskScore.toFixed(1)}</span>
                    </div>
                    {login.location.latitude && login.location.longitude && (
                      <div className="location-coords">
                        {login.location.latitude.toFixed(4)}, {login.location.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationHistoryMap;

