require('dotenv').config();
const app = require('../src/app');
const connectDB = require('../src/config/db');

// Vercel invokes this handler per-request. We ensure the (cached) DB
// connection is ready before handing off to Express, since serverless
// functions can't rely on a one-time startup connect() like a normal server.
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[api] Failed to connect to MongoDB:', err.message);
    res.status(500).json({ message: 'Database connection failed' });
    return;
  }
  return app(req, res);
};
