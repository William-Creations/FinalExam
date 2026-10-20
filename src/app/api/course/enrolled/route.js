//src/app/api/course/enrolled/route.js
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_STUDENT } from "@/lib/constant";
import { serializeCourse } from "@/lib/course";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

// GET /api/course/enrolled - courses the current Student is enrolled in
export async function GET(req) {
  try {
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);
    if (me.role !== ROLE_STUDENT)
      return errorResponse("Only students have enrolled courses", 403);

    const docs = await (await getDb())
      .collection("courses")
      .aggregate([
        { $match: { students: me._id } },
        {
          $lookup: {
            from: "users",
            localField: "teacherId",
            foreignField: "_id",
            as: "teacher",
          },
        },
        {
          $addFields: {
            teacherName: { $ifNull: [{ $arrayElemAt: ["$teacher.username", 0] }, ""] },
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();
    return successResponse(docs.map((c) => serializeCourse(c, me.id)), 200);
  } catch (err) {
    printExceptionLog("GET /api/course/enrolled", err);
    return errorResponse("Internal server error", 500);
  }
}
