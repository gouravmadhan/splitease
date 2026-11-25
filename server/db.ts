import mongoose from "mongoose";

// Cache the connection across serverless invocations.
const g = globalThis as unknown as { _mongo?: { p?: Promise<typeof mongoose> } };
const cache = (g._mongo ??= {});

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  cache.p ??= mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "splitease", bufferCommands: false, serverSelectionTimeoutMS: 8000 });
  try { return await cache.p; } catch (e) { cache.p = undefined; throw e; }
}
