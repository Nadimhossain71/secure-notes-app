require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// This file is the entry point for LOCAL development / traditional hosting
// (npm start / npm run dev). It is NOT used on Vercel — Vercel instead uses
// api/index.js, which connects per-request instead of once at boot, since
// serverless functions don't keep a persistent process running.
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[server] Listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
})();
