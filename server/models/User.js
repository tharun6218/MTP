const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    default: null
  },
  loginHistory: [{
    timestamp: Date,
    ip: String,
    device: String,
    deviceId: String,
    browser: String,
    location: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number
    },
    riskScore: Number,
    status: String // 'success', 'blocked', 'mfa_required'
  }],
  knownDevices: [{
    deviceId: String,
    deviceName: String,
    lastSeen: Date,
    ip: String
  }],
  knownLocations: [{
    country: String,
    city: String,
    lastSeen: Date
  }]
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);





