const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only use proxy in development (localhost)
  // In production, use REACT_APP_API_URL environment variable
  const target = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Only set up proxy if we're in development (localhost)
  if (target.includes('localhost')) {
    app.use(
      '/api',
      createProxyMiddleware({
        target: target,
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
      })
    );
  }
};

