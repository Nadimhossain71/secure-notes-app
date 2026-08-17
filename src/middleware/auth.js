const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies the Bearer JWT on the Authorization header and attaches the
 * authenticated user (without password) to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Missing or malformed Authorization header' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // _id lookup uses the default _id index - cheap and always fresh (picks up role changes).
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'User for this token no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { requireAuth };
