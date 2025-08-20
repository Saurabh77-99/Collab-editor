const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: { ops: [] } // Quill Delta format
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  shareLink: {
    token: String,
    expiresAt: Date,
    permissions: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  metadata: {
    wordCount: {
      type: Number,
      default: 0
    },
    characterCount: {
      type: Number,
      default: 0
    },
    tags: [String]
  }
}, {
  timestamps: true
});

documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ 'shareLink.token': 1 });

documentSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Document', documentSchema);