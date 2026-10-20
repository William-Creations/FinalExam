//src/app/api/user/[user_id]/route.js
import { getCurrentUser } from "@/lib/auth";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// GET /api/user/me - the currently authenticated user (used by the frontend
// to restore the session). A user may only read their own profile.
export async function GET(req, { params }) {
  try {
    const { user_id } = await params;
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);
    if (user_id !== "me" && user_id !== me.id)
      return errorResponse("Forbidden", 403);
    return successResponse(
      { id: me.id, username: me.username, email: me.email, role: me.role },
      200,
    );
  } catch (err) {
    printExceptionLog("GET /api/user/[user_id]", err);
    return errorResponse("Internal server error", 500);
  }
}
