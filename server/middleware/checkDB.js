/**
 * Middleware to check if MongoDB is connected
 */
function checkDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected',
      message: 'Please check MongoDB connection and restart the server'
    });
  }
  next();
}

module.exports = checkDatabase;


