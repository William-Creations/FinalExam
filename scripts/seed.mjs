// Seeds test users (3 students, 3 teachers) and sample courses.
// Usage: MONGODB_URI="..." node scripts/seed.mjs   (or: npm run seed, reads .env.local)
import fs from "node:fs";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI && fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI");

const client = await new MongoClient(uri).connect();
const db = client.db(process.env.MONGODB_DB || "online_course");
const users = db.collection("users");
const courses = db.collection("courses");
await users.createIndex({ email: 1 }, { unique: true });
await users.createIndex({ username: 1 }, { unique: true });

const PASSWORD = "password123";
const hash = await bcrypt.hash(PASSWORD, 10);
const seedUsers = [
  ...["student1", "student2", "student3"].map((u) => [u, "Student"]),
  ...["teacher1", "teacher2", "teacher3"].map((u) => [u, "Teacher"]),
];
const ids = {};
for (const [username, role] of seedUsers) {
  const email = `${username}@example.com`;
  await users.updateOne(
    { email },
    { $set: { username, email, password: hash, role }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  ids[username] = (await users.findOne({ email }))._id;
}

const sample = [
  ["teacher1", "Web Application Development", 30, ["HTML/CSS", "React", "Next.js"], 4500, 30, "Open"],
  ["teacher1", "Database Systems", 20, ["SQL", "MongoDB", "Indexing"], 3000, 2, "Open"],
  ["teacher2", "Intro to Python", 15, ["Syntax", "Functions", "OOP"], 1500, 25, "Close"],
  ["teacher2", "Machine Learning Basics", 40, ["Regression", "Classification"], 6000, 20, "Cancel"],
  ["teacher3", "Cyber Security Essentials", 25, ["Cryptography", "Networks", "OWASP"], 5000, 15, "Open"],
];
for (const [t, name, duration, topics, price, maxStudent, status] of sample) {
  await courses.updateOne(
    { name, teacherId: ids[t] },
    {
      $set: { name, duration, topics, price, maxStudent, status, teacherId: ids[t], teacherName: t, updatedAt: new Date() },
      $setOnInsert: { students: [], createdAt: new Date() },
    },
    { upsert: true },
  );
}
console.log(`Seeded ${seedUsers.length} users and ${sample.length} courses. Password for all users: ${PASSWORD}`);
await client.close();
