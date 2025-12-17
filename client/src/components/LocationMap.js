import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationMap.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMap = ({ location, riskLevel, sessionInfo }) => {
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default: India
  const [zoom, setZoom] = useState(5);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      // Use exact coordinates if available
      setMapCenter([location.latitude, location.longitude]);
      setZoom(12);
    } else if (location && location.city && location.country) {
      // Fallback: approximate coordinates based on country
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
        'Brazil': [-14.2350, -51.9253],
        'Russia': [61.5240, 105.3188],
        'Mexico': [23.6345, -102.5528],
        'South Africa': [-30.5595, 22.9375],
        'South Korea': [35.9078, 127.7669],
        'Singapore': [1.3521, 103.8198],
      };
      const coords = countryCoords[location.country] || [20.5937, 78.9629];
      setMapCenter(coords);
      setZoom(6);
    }
  }, [location]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getRiskRadius = (level) => {
    switch (level) {
      case 'high': return 50000; // 50km
      case 'medium': return 30000; // 30km
      case 'low': return 20000; // 20km
      default: return 25000;
    }
  };

  // Memoize map components to prevent re-renders
  const mapKey = useMemo(() => `${mapCenter[0]}-${mapCenter[1]}-${zoom}`, [mapCenter, zoom]);

  // Only render map on client side after React is ready
  if (!isClient || typeof window === 'undefined') {
    return (
      <div style={{ 
        height: '400px', 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666',
        fontWeight: 600
      }}>
        Loading map...
      </div>
    );
  }

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '12px', zIndex: 1 }}>
      <MapContainer
        key={mapKey}
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {location && (
          <>
            <Marker position={mapCenter}>
              <Popup>
                <div className="map-popup">
                  <strong>Current Location</strong>
                  <p>{location.city || 'Unknown'}, {location.country || 'Unknown'}</p>
                  {sessionInfo && (
                    <>
                      <p><strong>IP:</strong> {sessionInfo.ip}</p>
                      <p><strong>Device:</strong> {sessionInfo.device}</p>
                      <p><strong>Risk Level:</strong> <span className={`risk-${riskLevel}`}>{riskLevel}</span></p>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={mapCenter}
              radius={getRiskRadius(riskLevel)}
              pathOptions={{
                color: getRiskColor(riskLevel),
                fillColor: getRiskColor(riskLevel),
                fillOpacity: 0.2,
                weight: 2
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;

