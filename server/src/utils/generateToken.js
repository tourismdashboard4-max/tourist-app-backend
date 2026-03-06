const jwt = require('jsonwebtoken');

// ============================================
// Generate JWT Token
// ============================================
const generateToken = (id, type = 'guide', role = 'guide') => {
  return jwt.sign(
    { id, type, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ============================================
// Generate Refresh Token
// ============================================
const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

// ============================================
// Generate Email Verification Token
// ============================================
const generateEmailVerificationToken = () => {
  return jwt.sign(
    { type: 'email-verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ============================================
// Generate Password Reset Token
// ============================================
const generatePasswordResetToken = () => {
  return jwt.sign(
    { type: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// ============================================
// Verify Token
// ============================================
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyToken
};