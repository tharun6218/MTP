const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token
 */
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1] || 
                req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
}

/**
 * Verify session token
 */
async function verifySession(req, res, next) {
  const sessionToken = req.cookies.sessionToken || 
                      req.headers['x-session-token'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token' });
  }
  
  const session = await Session.findOne({ 
    sessionToken, 
    status: 'active' 
  });
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'expired';
    await session.save();
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.session = session;
  req.userId = session.userId;
  next();
}

module.exports = {
  verifyToken,
  verifySession
};





