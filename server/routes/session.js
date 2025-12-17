const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/auth');
const monitorSession = require('../middleware/sessionMonitor');
const Session = require('../models/Session');

/**
 * Get current session info
 */
router.get('/current', verifySession, monitorSession, async (req, res) => {
  try {
    const session = await Session.findById(req.session._id)
      .populate('userId', 'username email')
      .select('-sessionToken');
    
    res.json({
      session: session,
      riskScore: req.riskScore || session.riskScore
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * Get session activity log
 */
router.get('/activity', verifySession, monitorSession, async (req, res) => {
  try {
    const session = await Session.findById(req.session._id);
    res.json({
      activities: session.activityLog || [],
      metrics: session.metrics || {}
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

/**
 * Terminate session
 */
router.post('/terminate', verifySession, async (req, res) => {
  try {
    await Session.updateOne(
      { _id: req.session._id },
      { status: 'terminated' }
    );
    
    res.clearCookie('sessionToken');
    res.json({ message: 'Session terminated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

/**
 * Get all user sessions
 */
router.get('/all', verifySession, monitorSession, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId })
      .select('-sessionToken')
      .sort({ startTime: -1 });
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * Simulate IP change in session (for Scenario 5)
 */
router.post('/simulate-ip-change', require('../middleware/auth').verifySession, async (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'] || req.cookies.sessionToken;
    const session = await Session.findOne({ sessionToken, userId: req.userId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Simulate IP change
    const newIP = req.headers['x-new-ip'] || '192.168.1.100';
    const oldIP = session.ip;
    
    // Calculate new risk score
    const activityData = {
      ip: newIP,
      userAgent: req.headers['user-agent'] || session.browser
    };
    
    const { calculateSessionRisk } = require('../utils/riskScoring');
    const newRiskScore = await calculateSessionRisk(session, activityData);
    const riskLevel = newRiskScore >= 70 ? 'high' : newRiskScore >= 40 ? 'medium' : 'low';

    // If high risk, terminate session
    if (newRiskScore >= 70) {
      session.status = 'terminated';
      session.riskScore = newRiskScore;
      session.riskLevel = riskLevel;
      await session.save();

      return res.json({
        message: 'Session terminated due to IP change',
        riskScore: newRiskScore,
        riskLevel: riskLevel,
        action: 'terminated',
        oldIP: oldIP,
        newIP: newIP
      });
    }

    // Update session with new IP and risk
    session.ip = newIP;
    session.riskScore = newRiskScore;
    session.riskLevel = riskLevel;
    await session.save();

    res.json({
      message: 'IP change detected',
      riskScore: newRiskScore,
      riskLevel: riskLevel,
      action: 'monitoring',
      oldIP: oldIP,
      newIP: newIP
    });
  } catch (error) {
    console.error('IP change simulation error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

/**
 * Simulate bot-like activity (for Scenario 6)
 */
router.post('/simulate-bot-activity', require('../middleware/auth').verifySession, async (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'] || req.cookies.sessionToken;
    const session = await Session.findOne({ sessionToken, userId: req.userId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Simulate high request rate and many endpoints
    const fakeActivity = Array.from({ length: 150 }, (_, i) => ({
      timestamp: new Date(Date.now() - (150 - i) * 1000),
      endpoint: `/api/endpoint-${Math.floor(Math.random() * 50)}`,
      method: ['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)],
      statusCode: Math.random() > 0.8 ? 404 : 200,
      ip: session.ip,
      userAgent: session.browser,
      riskScore: 0
    }));

    // Add fake activities to session
    session.activityLog = [...(session.activityLog || []), ...fakeActivity];
    session.metrics = {
      requestsPerMinute: 150,
      uniqueEndpoints: 45,
      errorRate: 0.2,
      ipChanges: 0
    };

    // Calculate new risk score
    const activityData = {
      ip: session.ip,
      userAgent: session.browser
    };
    
    const { calculateSessionRisk } = require('../utils/riskScoring');
    const newRiskScore = await calculateSessionRisk(session, activityData);
    const riskLevel = newRiskScore >= 70 ? 'high' : newRiskScore >= 40 ? 'medium' : 'low';

    // Terminate session due to bot-like behavior
    session.status = 'terminated';
    session.riskScore = newRiskScore;
    session.riskLevel = riskLevel;
    await session.save();

    res.json({
      message: 'Session terminated due to bot-like behavior',
      riskScore: newRiskScore,
      riskLevel: riskLevel,
      action: 'terminated',
      metrics: session.metrics
    });
  } catch (error) {
    console.error('Bot activity simulation error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

module.exports = router;





