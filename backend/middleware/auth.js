const { supabaseAdmin, isConfigured } = require('../supabase');

/**
 * Authentication middleware for Express.
 * Validates the Supabase JWT from the Authorization header (Bearer <token>).
 * Populates req.user with the authenticated user object.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required.',
      message: 'Missing or malformed Authorization header. Expected Bearer <token>.',
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required.',
      message: 'Token is empty.',
    });
  }

  if (!isConfigured) {
    return res.status(503).json({
      error: 'Backend Database Unconfigured',
      message: 'Supabase credentials are not yet configured in backend/.env. Please configure SUPABASE_URL and keys.',
    });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired authentication session.',
        message: error ? error.message : 'User not found for provided token.',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth verification error:', err.message);
    return res.status(500).json({
      error: 'Authentication service failure.',
      message: 'An error occurred while validating authentication.',
    });
  }
};

module.exports = { requireAuth };
