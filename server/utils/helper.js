const crypto = require('crypto');

// Generate secure random token
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Sanitize user input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Calculate text statistics
const calculateTextStats = (content) => {
  if (!content || typeof content !== 'object') {
    return { wordCount: 0, characterCount: 0 };
  }

  // Extract text from Quill Delta format
  let text = '';
  if (content.ops && Array.isArray(content.ops)) {
    text = content.ops
      .map(op => (typeof op.insert === 'string' ? op.insert : ''))
      .join('');
  }

  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const characterCount = text.length;

  return { wordCount, characterCount };
};

// Format date for API responses
const formatDate = (date) => {
  return new Date(date).toISOString();
};

// Create API response format
const createApiResponse = (success, message, data = null, errors = null) => {
  const response = { success, message };
  
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  
  return response;
};

// Validate document permissions
const validateDocumentPermission = (userRole, requiredPermission) => {
  const permissions = {
    viewer: ['view'],
    editor: ['view', 'edit'],
    owner: ['view', 'edit', 'delete', 'share', 'manage']
  };

  return permissions[userRole]?.includes(requiredPermission) || false;
};

// Rate limiting helper
const createRateLimitKey = (identifier, endpoint) => {
  return `rate_limit:${endpoint}:${identifier}`;
};

module.exports = {
  generateSecureToken,
  sanitizeInput,
  calculateTextStats,
  formatDate,
  createApiResponse,
  validateDocumentPermission,
  createRateLimitKey
};