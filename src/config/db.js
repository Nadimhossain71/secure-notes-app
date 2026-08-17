const mongoose = require('mongoose');

// In serverless environments (Vercel, Lambda, etc.) each invocation can reuse
// a previous "warm" instance of this module. We cache the connection promise
// on `global` so repeated invocations reuse the same connection instead of
// opening a new one every request (which is slow and can exhaust Atlas's
// connection limit).
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in the environment');
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);

    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000,
        // Serverless functions can have many concurrent cold starts; keep
        // the pool small per-instance so we don't blow past Atlas's
        // connection limit across many function instances.
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log(`[db] Connected to MongoDB -> ${m.connection.name}`);
        return m;
      });

    mongoose.connection.on('error', (err) => {
      console.error('[db] MongoDB connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[db] MongoDB disconnected');
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
