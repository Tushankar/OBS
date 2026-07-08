import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';

// Connect to MongoDB (Atlas in prod; local single-node replica set in dev —
// transactions in Phase 2 require a replica set). Called once at boot (index.js)
// and by the seed script. Throws if MONGODB_URI is missing so failures are loud.
export async function connectDB(uri = env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set — add it to server/.env (see server/.env.example).');
  }
  // Dev-only DNS override: point Node's resolver at a public DNS when the local
  // resolver can't do mongodb+srv:// SRV lookups. No-op when DNS_SERVERS unset.
  if (env.DNS_SERVERS.length) {
    dns.setServers(env.DNS_SERVERS);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  const { host, name } = mongoose.connection;
  console.log(`[obs-events] MongoDB connected → ${host}/${name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
