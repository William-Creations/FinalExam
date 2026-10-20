import { NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth";
import corsHeaders from "./lib/cors";
import {
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_ROLE,
} from "./lib/constant";

export function proxy(request) {
  // CORS preflight requests carry no credentials; let them through.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const user = verifyJWT(request);

  if (!user) {
    return NextResponse.json(
      {
        message: "Unauthorized Request",
      },
      {
        status: 401,
        headers: corsHeaders,
      },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(X_HEADER_USER_ID, user.id);
  requestHeaders.set(X_HEADER_USER_EMAIL, user.email);
  requestHeaders.set(X_HEADER_USER_NAME, user.username);
  requestHeaders.set(X_HEADER_USER_ROLE, user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Every protected operation requires authentication. Public endpoints are
// only POST /api/auth/login and POST /api/user (registration).
export const config = {
  matcher: ["/api/course/:path*", "/api/user/:path+", "/api/auth/logout"],
};
