//src/app/api/course/route.js
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_STUDENT, ROLE_TEACHER } from "@/lib/constant";
import { escapeRegex, serializeCourse, validateCourse } from "@/lib/course";
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

// GET /api/course
//  Teacher: only their own courses.
//  Student: every course except status "Cancel"; optional ?q= filters by
//           part of the course name or teacher name.
export async function GET(req) {
  try {
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);

    const db = await getDb();
    const pipeline = [];

    if (me.role === ROLE_TEACHER) {
      pipeline.push({ $match: { teacherId: me._id } });
    } else if (me.role === ROLE_STUDENT) {
      pipeline.push({ $match: { status: { $ne: "Cancel" } } });
    } else {
      return errorResponse("Forbidden", 403);
    }

    pipeline.push(
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
    );

    const q = (new URL(req.url).searchParams.get("q") || "").trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      pipeline.push({ $match: { $or: [{ name: rx }, { teacherName: rx }] } });
    }
    pipeline.push({ $sort: { createdAt: -1 } });

    const docs = await db.collection("courses").aggregate(pipeline).toArray();
    return successResponse(
      docs.map((c) => serializeCourse(c, me.id)),
      200,
    );
  } catch (err) {
    printExceptionLog("GET /api/course", err);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/course - only Teachers can create courses
export async function POST(req) {
  try {
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);
    if (me.role !== ROLE_TEACHER)
      return errorResponse("Only teachers can create courses", 403);

    const body = await readJson(req);
    if (!body) return errorResponse("Invalid JSON body", 400);
    const { error, value } = validateCourse(body);
    if (error) return errorResponse(error, 400);

    const now = new Date();
    const doc = {
      ...value,
      teacherId: me._id,
      teacherName: me.username,
      students: [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await (await getDb()).collection("courses").insertOne(doc);
    return successResponse(
      serializeCourse({ ...doc, _id: result.insertedId }, me.id),
      201,
    );
  } catch (err) {
    printExceptionLog("POST /api/course", err);
    return errorResponse("Internal server error", 500);
  }
}
