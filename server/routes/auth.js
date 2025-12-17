const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Session = require('../models/Session');
const { calculateLoginRisk } = require('../utils/riskScoring');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Register new user
 */
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected',
      message: 'MongoDB is not connected. Please check your database connection.'
    });
  }
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user
    const user = new User({ username, email, password });
    await user.save();
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user._id 
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Registration failed';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Login with risk assessment
 */
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, password } = req.body;
    
    // Extract login metadata
    const loginData = {
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      deviceId: req.headers['x-device-id'] || generateDeviceId(req),
      device: req.headers['x-device'] || 'Unknown Device',
      browser: req.headers['user-agent'] || 'Unknown Browser',
      location: {
        country: req.headers['x-country'] || 'Unknown',
        city: req.headers['x-city'] || 'Unknown',
        latitude: req.headers['x-latitude'] ? parseFloat(req.headers['x-latitude']) : null,
        longitude: req.headers['x-longitude'] ? parseFloat(req.headers['x-longitude']) : null
      },
      ipReputation: parseFloat(req.headers['x-ip-reputation']) || 0.5
    };
    
    // Find user
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed attempt
      user.loginHistory.push({
        timestamp: new Date(),
        ...loginData,
        riskScore: 50,
        status: 'blocked'
      });
      await user.save();
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Calculate risk score
    const riskScore = await calculateLoginRisk(user, loginData);
    
    // Determine response based on risk
    let response = {
      message: 'Login successful',
      riskScore: riskScore,
      riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low'
    };
    
    // High risk: Block login
    if (riskScore >= 70) {
      user.loginHistory.push({
        timestamp: new Date(),
        ip: loginData.ip,
        device: loginData.device,
        deviceId: loginData.deviceId,
        browser: loginData.browser,
        location: loginData.location,
        riskScore: riskScore,
        status: 'blocked'
      });
      await user.save();
      
      return res.status(403).json({
        error: 'Login blocked due to high risk',
        riskScore: riskScore,
        action: 'block'
      });
    }
    
    // Medium risk: Require MFA
    if (riskScore >= 40) {
      user.loginHistory.push({
        timestamp: new Date(),
        ip: loginData.ip,
        device: loginData.device,
        deviceId: loginData.deviceId,
        browser: loginData.browser,
        location: loginData.location,
        riskScore: riskScore,
        status: 'mfa_required'
      });
      await user.save();
      
      return res.status(200).json({
        ...response,
        mfaRequired: true,
        action: 'mfa'
      });
    }
    
    // Low risk: Allow login
    // Create session
    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour default
    
    const session = new Session({
      userId: user._id,
      sessionToken: sessionToken,
      ip: loginData.ip,
      device: loginData.device,
      browser: loginData.browser,
      location: loginData.location,
      expiresAt: sessionExpiry,
      riskScore: riskScore,
      riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      status: 'active',
      metrics: {
        requestsPerMinute: 0,
        uniqueEndpoints: 0,
        errorRate: 0,
        ipChanges: 0
      },
      activityLog: []
    });
    await session.save();
    
    // Update user's known devices and locations
    const deviceExists = user.knownDevices.some(d => d.deviceId === loginData.deviceId);
    if (!deviceExists) {
      user.knownDevices.push({
        deviceId: loginData.deviceId,
        deviceName: loginData.device,
        lastSeen: new Date(),
        ip: loginData.ip
      });
    } else {
      const device = user.knownDevices.find(d => d.deviceId === loginData.deviceId);
      device.lastSeen = new Date();
      device.ip = loginData.ip;
    }
    
    const locationExists = user.knownLocations.some(l => 
      l.country === loginData.location.country && l.city === loginData.location.city
    );
    if (!locationExists) {
      user.knownLocations.push({
        country: loginData.location.country,
        city: loginData.location.city,
        lastSeen: new Date()
      });
    } else {
      const location = user.knownLocations.find(l => 
        l.country === loginData.location.country && l.city === loginData.location.city
      );
      location.lastSeen = new Date();
    }
    
    // Log successful login
    user.loginHistory.push({
      timestamp: new Date(),
      ip: loginData.ip,
      device: loginData.device,
      deviceId: loginData.deviceId,
      browser: loginData.browser,
      location: loginData.location,
      riskScore: riskScore,
      status: 'success'
    });
    await user.save();
    
    // Generate JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    
    // Set cookies
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      ...response,
      token: token,
      sessionToken: sessionToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * MFA verification (simplified - in production use TOTP)
 */
router.post('/verify-mfa', async (req, res) => {
  try {
    const { username, mfaCode } = req.body;
    
    // Simplified MFA - in production, verify TOTP
    if (mfaCode !== '123456') {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }
    
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Extract session metadata (same as login)
    const sessionData = {
      ip: req.headers['x-ip'] || req.ip || req.connection.remoteAddress || 'unknown',
      deviceId: req.headers['x-device-id'] || generateDeviceId(req),
      device: req.headers['x-device'] || req.headers['user-agent']?.split(' ')[0] || 'Unknown Device',
      browser: req.headers['user-agent'] || 'Unknown Browser',
      location: {
        country: req.headers['x-country'] || 'Unknown',
        city: req.headers['x-city'] || 'Unknown',
        latitude: req.headers['x-latitude'] ? parseFloat(req.headers['x-latitude']) : null,
        longitude: req.headers['x-longitude'] ? parseFloat(req.headers['x-longitude']) : null
      }
    };
    
    // Create session after MFA verification
    const sessionToken = generateSessionToken();
    const session = new Session({
      userId: user._id,
      sessionToken: sessionToken,
      ip: sessionData.ip,
      device: sessionData.device,
      browser: sessionData.browser,
      location: sessionData.location,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min for MFA sessions
      riskScore: 40,
      riskLevel: 'medium',
      status: 'active',
      metrics: {
        requestsPerMinute: 0,
        uniqueEndpoints: 0,
        errorRate: 0,
        ipChanges: 0
      },
      activityLog: []
    });
    await session.save();
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '12h' });
    
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.json({
      message: 'MFA verified successfully',
      token: token,
      sessionToken: sessionToken,
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

/**
 * Logout
 */
router.post('/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    
    if (sessionToken) {
      await Session.updateOne(
        { sessionToken },
        { status: 'terminated' }
      );
    }
    
    res.clearCookie('sessionToken');
    res.clearCookie('token');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Get current user
 */
router.get('/me', require('../middleware/auth').verifySession, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Helper functions
function generateSessionToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

function generateDeviceId(req) {
  const ua = req.headers['user-agent'] || '';
  const ip = req.ip || 'unknown';
  return require('crypto').createHash('md5').update(ua + ip).digest('hex');
}

/**
 * Get location history grouped by device
 */
router.get('/location-history', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all successful logins with location data
    const locationHistory = user.loginHistory
      .filter(login => login.status === 'success' && login.location?.latitude && login.location?.longitude)
      .map(login => ({
        timestamp: login.timestamp,
        device: login.device,
        deviceId: login.deviceId,
        browser: login.browser,
        ip: login.ip,
        location: {
          country: login.location.country,
          city: login.location.city,
          latitude: login.location.latitude,
          longitude: login.location.longitude
        },
        riskScore: login.riskScore
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first

    // Group by device
    const groupedByDevice = {};
    locationHistory.forEach(login => {
      const deviceKey = login.deviceId || login.device;
      if (!groupedByDevice[deviceKey]) {
        groupedByDevice[deviceKey] = {
          deviceId: login.deviceId,
          device: login.device,
          browser: login.browser,
          locations: []
        };
      }
      groupedByDevice[deviceKey].locations.push(login);
    });

    res.json({
      locationHistory,
      groupedByDevice: Object.values(groupedByDevice),
      totalLocations: locationHistory.length,
      uniqueDevices: Object.keys(groupedByDevice).length
    });
  } catch (error) {
    console.error('Location history error:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

/**
 * Simulate login for demonstration purposes
 */
router.post('/simulate-login', async (req, res) => {
  try {
    const { username, scenario } = req.body;
    
    // Find user
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract login metadata from headers
    const loginData = {
      ip: req.headers['x-ip'] || req.ip || 'unknown',
      deviceId: req.headers['x-device-id'] || generateDeviceId(req),
      device: req.headers['x-device'] || 'Unknown Device',
      browser: req.headers['user-agent'] || 'Unknown Browser',
      location: {
        country: req.headers['x-country'] || 'Unknown',
        city: req.headers['x-city'] || 'Unknown',
        latitude: req.headers['x-latitude'] ? parseFloat(req.headers['x-latitude']) : null,
        longitude: req.headers['x-longitude'] ? parseFloat(req.headers['x-longitude']) : null
      },
      ipReputation: parseFloat(req.headers['x-ip-reputation']) || 0.5
    };

    // Calculate risk score
    const riskScore = await calculateLoginRisk(user, loginData);
    const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

    // Determine action based on scenario
    let action = 'allow';
    let mfaRequired = false;

    if (riskScore >= 70) {
      action = 'block';
    } else if (riskScore >= 40) {
      action = 'mfa';
      mfaRequired = true;
    }

    res.json({
      message: `Simulation completed - ${action === 'block' ? 'Login blocked' : mfaRequired ? 'MFA required' : 'Login allowed'}`,
      riskScore: riskScore,
      riskLevel: riskLevel,
      action: action,
      mfaRequired: mfaRequired,
      loginData: loginData
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

module.exports = router;




