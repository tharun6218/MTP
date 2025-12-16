const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Calculate risk score for login attempt
 */
async function calculateLoginRisk(user, loginData) {
  const features = extractLoginFeatures(user, loginData);
  
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/api/predict/login`, {
      features: features
    });
    return response.data.riskScore || calculateRuleBasedRisk(user, loginData);
  } catch (error) {
    console.error('ML Service Error:', error.message);
    // Fallback to rule-based scoring
    return calculateRuleBasedRisk(user, loginData);
  }
}

/**
 * Calculate risk score for session activity
 */
async function calculateSessionRisk(session, activityData) {
  const features = extractSessionFeatures(session, activityData);
  
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/api/predict/session`, {
      features: features
    });
    return response.data.riskScore || calculateSessionRuleBasedRisk(session, activityData);
  } catch (error) {
    console.error('ML Service Error:', error.message);
    return calculateSessionRuleBasedRisk(session, activityData);
  }
}

/**
 * Extract features for login risk assessment
 */
function extractLoginFeatures(user, loginData) {
  const knownDevices = user.knownDevices || [];
  const knownLocations = user.knownLocations || [];
  const recentLogins = user.loginHistory.slice(-10) || [];
  
  const isNewDevice = !knownDevices.some(d => d.deviceId === loginData.deviceId);
  const isNewLocation = !knownLocations.some(l => 
    l.country === loginData.location.country && 
    l.city === loginData.location.city
  );
  
  const hour = new Date().getHours();
  const isOddHour = hour < 6 || hour > 22;
  
  const recentFailedAttempts = recentLogins.filter(l => l.status === 'blocked').length;
  
  return {
    isNewDevice: isNewDevice ? 1 : 0,
    isNewLocation: isNewLocation ? 1 : 0,
    isOddHour: isOddHour ? 1 : 0,
    recentFailedAttempts: Math.min(recentFailedAttempts, 5),
    daysSinceLastLogin: user.loginHistory.length > 0 ? 
      (Date.now() - new Date(user.loginHistory[user.loginHistory.length - 1].timestamp)) / (1000 * 60 * 60 * 24) : 30,
    ipReputation: loginData.ipReputation || 0.5,
    geoVelocity: calculateGeoVelocity(user, loginData)
  };
}

/**
 * Extract features for session risk assessment
 */
function extractSessionFeatures(session, activityData) {
  const activities = session.activityLog || [];
  const recentActivities = activities.slice(-20);
  
  const requestsPerMinute = calculateRequestsPerMinute(recentActivities);
  const uniqueEndpoints = new Set(recentActivities.map(a => a.endpoint)).size;
  const errorRate = recentActivities.filter(a => a.statusCode >= 400).length / Math.max(recentActivities.length, 1);
  const ipChanges = session.metrics?.ipChanges || 0;
  
  return {
    requestsPerMinute: requestsPerMinute,
    uniqueEndpoints: uniqueEndpoints,
    errorRate: errorRate,
    ipChanges: ipChanges,
    sessionDuration: (Date.now() - new Date(session.startTime)) / (1000 * 60),
    userAgentChanges: detectUserAgentChanges(recentActivities)
  };
}

/**
 * Rule-based risk calculation (fallback)
 */
function calculateRuleBasedRisk(user, loginData) {
  let riskScore = 0;
  
  // New device: +30 points
  const isNewDevice = !user.knownDevices.some(d => d.deviceId === loginData.deviceId);
  if (isNewDevice) riskScore += 30;
  
  // New location: +25 points
  const isNewLocation = !user.knownLocations.some(l => 
    l.country === loginData.location.country
  );
  if (isNewLocation) riskScore += 25;
  
  // Odd hour login: +15 points
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) riskScore += 15;
  
  // Recent failed attempts: +20 points per attempt
  const recentFailed = user.loginHistory.filter(l => l.status === 'blocked').slice(-5).length;
  riskScore += recentFailed * 20;
  
  // IP reputation: +20 if suspicious
  if (loginData.ipReputation < 0.3) riskScore += 20;
  
  return Math.min(riskScore, 100);
}

/**
 * Rule-based session risk calculation
 */
function calculateSessionRuleBasedRisk(session, activityData) {
  let riskScore = session.riskScore || 0;
  
  const activities = session.activityLog || [];
  const recentActivities = activities.slice(-10);
  
  // High request rate: +25 points
  const requestsPerMinute = calculateRequestsPerMinute(recentActivities);
  if (requestsPerMinute > 30) riskScore += 25;
  
  // IP change: +40 points
  if (activityData.ip && activityData.ip !== session.ip) {
    riskScore += 40;
  }
  
  // High error rate: +20 points
  const errorRate = recentActivities.filter(a => a.statusCode >= 400).length / Math.max(recentActivities.length, 1);
  if (errorRate > 0.3) riskScore += 20;
  
  // User-Agent change: +30 points
  if (detectUserAgentChanges(recentActivities)) {
    riskScore += 30;
  }
  
  return Math.min(riskScore, 100);
}

/**
 * Helper functions
 */
function calculateGeoVelocity(user, loginData) {
  if (!user.loginHistory || user.loginHistory.length === 0) return 0;
  
  const lastLogin = user.loginHistory[user.loginHistory.length - 1];
  if (!lastLogin.location) return 0;
  
  // Simplified: if different country within short time, flag as suspicious
  const timeDiff = (Date.now() - new Date(lastLogin.timestamp)) / (1000 * 60 * 60); // hours
  if (timeDiff < 2 && lastLogin.location.country !== loginData.location.country) {
    return 1; // Impossible travel
  }
  return 0;
}

function calculateRequestsPerMinute(activities) {
  if (activities.length < 2) return 0;
  const timeSpan = (new Date(activities[activities.length - 1].timestamp) - 
                   new Date(activities[0].timestamp)) / (1000 * 60);
  return timeSpan > 0 ? activities.length / timeSpan : activities.length;
}

function detectUserAgentChanges(activities) {
  if (activities.length < 2) return false;
  const userAgents = new Set(activities.map(a => a.userAgent));
  return userAgents.size > 1;
}

module.exports = {
  calculateLoginRisk,
  calculateSessionRisk
};





