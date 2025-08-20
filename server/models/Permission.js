const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    required: true
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  }
}, {
  timestamps: true
});

// Compound index to ensure unique user-document permissions
permissionSchema.index({ document: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);