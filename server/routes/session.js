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

module.exports = router;





