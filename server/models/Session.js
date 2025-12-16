const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true
  },
  ip: {
    type: String,
    required: true
  },
  device: {
    type: String,
    required: true
  },
  browser: {
    type: String,
    required: true
  },
  location: {
    country: String,
    city: String
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  riskScore: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  status: {
    type: String,
    enum: ['active', 'terminated', 'expired', 'suspicious'],
    default: 'active'
  },
  activityLog: [{
    timestamp: Date,
    endpoint: String,
    method: String,
    statusCode: Number,
    ip: String,
    userAgent: String,
    riskScore: Number
  }],
  metrics: {
    requestsPerMinute: Number,
    uniqueEndpoints: Number,
    errorRate: Number,
    ipChanges: Number
  }
}, {
  timestamps: true
});

sessionSchema.index({ sessionToken: 1 });
sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);





