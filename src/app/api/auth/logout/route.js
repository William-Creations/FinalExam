//src/app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";
import { optionsResponse } from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// POST /api/auth/logout (protected by proxy.js) - clears the auth cookie
export async function POST() {
  const res = NextResponse.json(
    { message: "Logout successful" },
    { status: 200, headers: corsHeaders },
  );
  const prod = process.env.NODE_ENV === "production";
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
