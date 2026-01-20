const jwt = require('jsonwebtoken');
const config = require('../config/env');

function generateToken(userId, role, agencyId = null) {
  const payload = { userId, role };
  if (agencyId) {
    payload.agencyId = agencyId;
  }
  return jwt.sign(
    payload,
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
};
