//src/app/api/course/[course_id]/enroll/route.js
import { ObjectId } from "mongodb";
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

// POST /api/course/:id/enroll - Student enrolls in a course.
// Rules (all enforced here, in one atomic update):
//   * course status must be Open
//   * seats must remain (enrolled < maxStudent)
//   * the student must not already be enrolled
export async function POST(req, { params }) {
  try {
    const { course_id } = await params;
    const me = await getCurrentUser(req);
    if (!me) return errorResponse("Unauthorized Request", 401);
    if (me.role !== ROLE_STUDENT)
      return errorResponse("Only students can enroll in courses", 403);
    if (!ObjectId.isValid(course_id))
      return errorResponse("Course not found", 404);

    const courses = (await getDb()).collection("courses");
    const _id = new ObjectId(course_id);

    const updated = await courses.findOneAndUpdate(
      {
        _id,
        status: "Open",
        students: { $ne: me._id },
        $expr: {
          $lt: [{ $size: { $ifNull: ["$students", []] } }, "$maxStudent"],
        },
      },
      { $push: { students: me._id }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (updated) {
      return successResponse(
        { message: "Enrolled successfully", course: serializeCourse(updated, me.id) },
        201,
      );
    }

    // Not updated: work out why for a precise error.
    const course = await courses.findOne({ _id });
    if (!course || course.status === "Cancel")
      return errorResponse("Course not found", 404);
    if ((course.students || []).some((s) => s.equals(me._id)))
      return errorResponse("You are already enrolled in this course", 409);
    if (course.status !== "Open")
      return errorResponse("This course is not open for enrollment", 400);
    return errorResponse("This course is full", 409);
  } catch (err) {
    printExceptionLog("POST /api/course/[course_id]/enroll", err);
    return errorResponse("Internal server error", 500);
  }
}
