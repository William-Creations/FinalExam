// src/lib/db.js
import { getClientPromise } from "./mongodb";

export async function getDb() {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || "online_course");
}
