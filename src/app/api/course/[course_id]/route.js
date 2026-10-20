//src/app/api/course/[course_id]/route.js
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_STUDENT, ROLE_TEACHER } from "@/lib/constant";
import { serializeCourse, validateCourse } from "@/lib/course";
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

async function loadCourse(course_id) {
  if (!ObjectId.isValid(course_id)) return null;
  const db = await getDb();
  const course = await db
    .collection("courses")
    .findOne({ _id: new ObjectId(course_id) });
  if (!course) return null;
  const teacher = await db
    .collection("users")
    .findOne({ _id: course.teacherId }, { projection: { username: 1 } });
  course.teacherName = teacher?.username ?? course.teacherName ?? "";
  return course;
}

// GET /api/course/:id
//  Teacher: only their own course, including the enrolled students.
//  Student: any course that is not Cancelled (or one they are enrolled in).
export async function GET(req, { params }) {
  try {
    const { course_id } = await params;
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);

    const course = await loadCourse(course_id);
    if (!course) return errorResponse("Course not found", 404);

    if (me.role === ROLE_TEACHER) {
      if (!course.teacherId.equals(me._id))
        return errorResponse("You can only view your own courses", 403);
      const ids = course.students || [];
      const students = ids.length
        ? await (await getDb())
            .collection("users")
            .find({ _id: { $in: ids } }, { projection: { username: 1, email: 1 } })
            .toArray()
        : [];
      return successResponse(
        {
          ...serializeCourse(course, me.id),
          students: students.map((s) => ({
            id: s._id.toString(),
            username: s.username,
            email: s.email,
          })),
        },
        200,
      );
    }

    if (me.role === ROLE_STUDENT) {
      const enrolled = (course.students || []).some((s) => s.equals(me._id));
      if (course.status === "Cancel" && !enrolled)
        return errorResponse("Course not found", 404);
      return successResponse(serializeCourse(course, me.id), 200);
    }
    return errorResponse("Forbidden", 403);
  } catch (err) {
    printExceptionLog("GET /api/course/[course_id]", err);
    return errorResponse("Internal server error", 500);
  }
}

async function update(req, { params }) {
  try {
    const { course_id } = await params;
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);
    if (me.role !== ROLE_TEACHER)
      return errorResponse("Only teachers can update courses", 403);

    const course = await loadCourse(course_id);
    if (!course) return errorResponse("Course not found", 404);
    if (!course.teacherId.equals(me._id))
      return errorResponse("You can only update your own courses", 403);

    const body = await readJson(req);
    if (!body) return errorResponse("Invalid JSON body", 400);
    const { error, value } = validateCourse(body, true);
    if (error) return errorResponse(error, 400);

    const enrolledCount = (course.students || []).length;
    if (value.maxStudent !== undefined && value.maxStudent < enrolledCount)
      return errorResponse(
        `Max Student cannot be lower than the ${enrolledCount} students already enrolled`,
        400,
      );

    const updatedAt = new Date();
    await (await getDb())
      .collection("courses")
      .updateOne({ _id: course._id }, { $set: { ...value, updatedAt } });
    const fresh = await loadCourse(course_id);
    return successResponse(serializeCourse(fresh, me.id), 200);
  } catch (err) {
    printExceptionLog("PUT /api/course/[course_id]", err);
    return errorResponse("Internal server error", 500);
  }
}

export const PUT = update;
export const PATCH = update;

// DELETE /api/course/:id - owner only, and only if nobody is enrolled
export async function DELETE(req, { params }) {
  try {
    const { course_id } = await params;
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);
    if (me.role !== ROLE_TEACHER)
      return errorResponse("Only teachers can delete courses", 403);

    const course = await loadCourse(course_id);
    if (!course) return errorResponse("Course not found", 404);
    if (!course.teacherId.equals(me._id))
      return errorResponse("You can only delete your own courses", 403);

    // Atomic: delete only if the students array is still empty.
    const result = await (await getDb()).collection("courses").deleteOne({
      _id: course._id,
      teacherId: me._id,
      $or: [{ students: { $size: 0 } }, { students: { $exists: false } }],
    });
    if (result.deletedCount === 0)
      return errorResponse(
        "This course has enrolled students and cannot be deleted",
        409,
      );
    return successResponse({ message: "Course deleted" }, 200);
  } catch (err) {
    printExceptionLog("DELETE /api/course/[course_id]", err);
    return errorResponse("Internal server error", 500);
  }
}
