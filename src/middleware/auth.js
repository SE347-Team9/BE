const { verifyToken } = require('../utils/jwt');

async function authMiddleware(req, res, next) {
  try {
    console.log('[Auth] Request to:', req.method, req.path);
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth] No token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      console.log('[Auth] Invalid token');
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    console.log('[Auth] Token valid for user:', decoded.userId, 'role:', decoded.role);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed: ' + error.message,
    });
  }
}

module.exports = authMiddleware;
