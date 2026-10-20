// src/lib/mongodb.js

import { MongoClient } from "mongodb";

const options = {};

// Cache the client promise on globalThis so that hot reloads (dev) and warm
// serverless invocations (Vercel) reuse one connection instead of opening a
// new one for every request.
export function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please add your Mongo URI to .env.local or set MONGODB_URI env variable",
    );
  }
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalThis._mongoClientPromise = client.connect().catch((err) => {
      globalThis._mongoClientPromise = undefined;
      throw err;
    });
  }
  return globalThis._mongoClientPromise;
}
