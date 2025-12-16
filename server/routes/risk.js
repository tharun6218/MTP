const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/auth');
const monitorSession = require('../middleware/sessionMonitor');
const User = require('../models/User');

/**
 * Get user risk profile
 */
router.get('/profile', verifySession, monitorSession, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    const recentLogins = user.loginHistory.slice(-10);
    const avgRiskScore = recentLogins.length > 0
      ? recentLogins.reduce((sum, login) => sum + (login.riskScore || 0), 0) / recentLogins.length
      : 0;
    
    res.json({
      userId: user._id,
      username: user.username,
      knownDevices: user.knownDevices.length,
      knownLocations: user.knownLocations.length,
      recentLogins: recentLogins.length,
      averageRiskScore: avgRiskScore,
      currentRiskScore: req.riskScore || 0,
      riskLevel: req.riskScore >= 70 ? 'high' : req.riskScore >= 40 ? 'medium' : 'low'
    });
  } catch (error) {
    console.error('Get risk profile error:', error);
    res.status(500).json({ error: 'Failed to get risk profile' });
  }
});

/**
 * Get login history
 */
router.get('/login-history', verifySession, monitorSession, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({
      history: user.loginHistory.slice(-20).reverse()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get login history' });
  }
});

module.exports = router;





