//src/app/api/auth/login/route.js
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";
import { getDb } from "@/lib/db";
import { signJWT } from "@/lib/auth";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  readJson,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// POST /api/auth/login  { email | username, password }
export async function POST(req) {
  try {
    const body = await readJson(req);
    const identifier = String(
      body?.email ?? body?.username ?? body?.identifier ?? "",
    ).trim();
    const password = body?.password;
    if (!identifier || typeof password !== "string" || !password) {
      return errorResponse("Email/username and password are required", 400);
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    });
    // Same message for unknown user and wrong password.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return errorResponse("Invalid credentials", 401);
    }

    const token = signJWT(user);
    const res = NextResponse.json(
      {
        message: "Login successful",
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200, headers: corsHeaders },
    );
    const prod = process.env.NODE_ENV === "production";
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: prod,
      sameSite: prod ? "none" : "lax", // frontend & backend are on different domains in production
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (err) {
    printExceptionLog("POST /api/auth/login", err);
    return errorResponse("Internal server error", 500);
  }
}
