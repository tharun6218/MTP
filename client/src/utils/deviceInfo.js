/**
 * Get device information and request geolocation permission
 */
export async function getDeviceInfo() {
  const deviceInfo = {
    deviceId: generateDeviceId(),
    device: navigator.platform || 'Unknown Device',
    browser: navigator.userAgent || 'Unknown Browser',
    ip: 'unknown', // Will be detected by backend
    location: {
      country: 'Unknown',
      city: 'Unknown'
    }
  };

  // Request geolocation permission
  if (navigator.geolocation) {
    try {
      const position = await getCurrentPosition();
      // Store coordinates for map display
      deviceInfo.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        country: 'Unknown', // Would use reverse geocoding API in production
        city: 'Unknown'
      };
      
      // Try to get location from IP (fallback)
      try {
        const ipResponse = await fetch(`https://ipapi.co/${await getIPAddress()}/json/`);
        const ipData = await ipResponse.json();
        if (ipData.country_name) {
          deviceInfo.location.country = ipData.country_name;
          deviceInfo.location.city = ipData.city || 'Unknown';
        }
      } catch (e) {
        console.log('IP geolocation failed, using coordinates only');
      }
    } catch (error) {
      console.log('Geolocation not available:', error.message);
      // Fallback: try IP-based geolocation
      try {
        const ip = await getIPAddress();
        const ipResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        const ipData = await ipResponse.json();
        deviceInfo.location = {
          country: ipData.country_name || 'Unknown',
          city: ipData.city || 'Unknown',
          latitude: ipData.latitude || null,
          longitude: ipData.longitude || null
        };
      } catch (e) {
        deviceInfo.location = {
          country: 'Unknown',
          city: 'Unknown'
        };
      }
    }
  }

  return deviceInfo;
}

/**
 * Request geolocation permission
 */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  });
}

/**
 * Generate device ID from browser fingerprint
 */
function generateDeviceId() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    window.screen.width + 'x' + window.screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Get IP address (will be detected by backend, but we can try)
 */
export async function getIPAddress() {
  try {
    // Try to get IP from a public API (for demo purposes)
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.log('Could not fetch IP:', error);
    return 'unknown';
  }
}

