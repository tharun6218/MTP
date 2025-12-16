const Session = require('../models/Session');
const { calculateSessionRisk } = require('../utils/riskScoring');

/**
 * Middleware to monitor session activity and detect anomalies
 */
async function monitorSession(req, res, next) {
  try {
    const sessionToken = req.cookies.sessionToken || req.headers['x-session-token'];
    
    if (!sessionToken) {
      return next();
    }
    
    const session = await Session.findOne({ 
      sessionToken, 
      status: 'active' 
    }).populate('userId');
    
    if (!session) {
      return next();
    }
    
    // Check if session expired
    if (new Date() > new Date(session.expiresAt)) {
      session.status = 'expired';
      await session.save();
      return res.status(401).json({ 
        error: 'Session expired',
        action: 'logout'
      });
    }
    
    // Log activity
    const activityData = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
      method: req.method
    };
    
    // Calculate risk for this activity
    const riskScore = await calculateSessionRisk(session, activityData);
    
    // Update session metrics
    const activities = session.activityLog || [];
    activities.push({
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method,
      statusCode: 200, // Will be updated after response
      ip: activityData.ip,
      userAgent: activityData.userAgent,
      riskScore: riskScore
    });
    
    // Update metrics
    const recentActivities = activities.slice(-20);
    session.metrics = {
      requestsPerMinute: calculateRequestsPerMinute(recentActivities),
      uniqueEndpoints: new Set(recentActivities.map(a => a.endpoint)).size,
      errorRate: recentActivities.filter(a => a.statusCode >= 400).length / Math.max(recentActivities.length, 1),
      ipChanges: activityData.ip !== session.ip ? (session.metrics?.ipChanges || 0) + 1 : (session.metrics?.ipChanges || 0)
    };
    
    // Check for IP change
    if (activityData.ip !== session.ip) {
      session.metrics.ipChanges = (session.metrics.ipChanges || 0) + 1;
    }
    
    session.lastActivity = new Date();
    session.riskScore = riskScore;
    
    // Determine risk level
    if (riskScore >= 70) {
      session.riskLevel = 'high';
      session.status = 'suspicious';
      await session.save();
      return res.status(403).json({
        error: 'Suspicious activity detected',
        action: 'terminate',
        riskScore: riskScore
      });
    } else if (riskScore >= 40) {
      session.riskLevel = 'medium';
      // Shorten session expiration
      session.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    } else {
      session.riskLevel = 'low';
    }
    
    await session.save();
    
    // Attach session info to request
    req.session = session;
    req.riskScore = riskScore;
    
    next();
  } catch (error) {
    console.error('Session monitoring error:', error);
    next();
  }
}

function calculateRequestsPerMinute(activities) {
  if (activities.length < 2) return 0;
  const timeSpan = (new Date(activities[activities.length - 1].timestamp) - 
                   new Date(activities[0].timestamp)) / (1000 * 60);
  return timeSpan > 0 ? activities.length / timeSpan : activities.length;
}

module.exports = monitorSession;





