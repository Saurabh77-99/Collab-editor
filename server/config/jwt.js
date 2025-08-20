const jwt = require('jsonwebtoken');

class JWTConfig {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshExpiresIn = '30d';
    
    if (!this.secret) {
      throw new Error('JWT_SECRET is required in environment variables');
    }
  }

  generateAccessToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'collaborative-editor',
      audience: 'collaborative-editor-users'
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
      issuer: 'collaborative-editor',
      audience: 'collaborative-editor-users'
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.secret, {
      issuer: 'collaborative-editor',
      audience: 'collaborative-editor-users'
    });
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.refreshSecret, {
      issuer: 'collaborative-editor',
      audience: 'collaborative-editor-users'
    });
  }

  generateTokenPair(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }
}

module.exports = new JWTConfig();

