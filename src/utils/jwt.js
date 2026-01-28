const jwt = require('jsonwebtoken');
const config = require('../config/env');

function generateToken(userId, role, agencyId = null, accountId = null) {
  const payload = { userId, role };
  if (agencyId) {
    payload.agencyId = agencyId;
  }
  if (accountId) {
    payload.accountId = accountId;
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
