//src/app/api/user/route.js
import bcrypt from "bcrypt";
import { getDb } from "@/lib/db";
import { ROLES } from "@/lib/constant";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  readJson,
  successResponse,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// POST /api/user - public registration { username, email, password, role }
export async function POST(req) {
  try {
    const body = await readJson(req);
    const username = String(body?.username ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = body?.password;
    const role = body?.role;

    if (!username || !email || typeof password !== "string" || !password)
      return errorResponse("Username, email and password are required", 400);
    if (!/^\S+@\S+\.\S+$/.test(email))
      return errorResponse("Email is not valid", 400);
    if (password.length < 6)
      return errorResponse("Password must be at least 6 characters", 400);
    if (!ROLES.includes(role))
      return errorResponse(`Role must be one of: ${ROLES.join(", ")}`, 400);

    const db = await getDb();
    const users = db.collection("users");
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ username: 1 }, { unique: true });
    if (await users.findOne({ $or: [{ email }, { username }] }))
      return errorResponse("Username or email already exists", 409);

    const result = await users.insertOne({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      createdAt: new Date(),
    });
    return successResponse(
      { id: result.insertedId.toString(), username, email, role },
      201,
    );
  } catch (err) {
    if (err?.code === 11000)
      return errorResponse("Username or email already exists", 409);
    printExceptionLog("POST /api/user", err);
    return errorResponse("Internal server error", 500);
  }
}
