// src/lib/course.js
import { COURSE_STATUSES } from "./constant";

export function serializeCourse(c, viewerId) {
  const students = c.students || [];
  return {
    id: c._id.toString(),
    name: c.name,
    duration: c.duration,
    topics: c.topics || [],
    price: c.price,
    maxStudent: c.maxStudent,
    status: c.status,
    teacherId: c.teacherId.toString(),
    teacherName: c.teacherName ?? c.teacher?.[0]?.username ?? "",
    enrolledCount: students.length,
    seatsLeft: Math.max(0, c.maxStudent - students.length),
    enrolled: viewerId
      ? students.some((s) => s.toString() === viewerId)
      : undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// Validates course fields. With partial=true only supplied fields are checked
// (used for updates). Returns { error } or { value }.
export function validateCourse(body, partial = false) {
  const value = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has("name")) {
    if (typeof body.name !== "string" || !body.name.trim())
      return { error: "Course name is required" };
    value.name = body.name.trim();
  }
  if (!partial || has("duration")) {
    const d = Number(body.duration);
    if (body.duration === "" || body.duration === null || !Number.isInteger(d) || d <= 0)
      return { error: "Duration (days) must be a positive whole number" };
    value.duration = d;
  }
  if (!partial || has("topics")) {
    let topics = body.topics;
    if (typeof topics === "string") topics = topics.split(",");
    if (!Array.isArray(topics))
      return { error: "Topics must be a list of topics" };
    topics = topics
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean);
    if (topics.length === 0) return { error: "At least one topic is required" };
    value.topics = topics;
  }
  if (!partial || has("price")) {
    const p = Number(body.price);
    if (body.price === "" || body.price === null || !Number.isFinite(p) || p < 0)
      return { error: "Price must be a number of 0 or more" };
    value.price = p;
  }
  if (!partial || has("maxStudent")) {
    const m = Number(body.maxStudent);
    if (body.maxStudent === "" || body.maxStudent === null || !Number.isInteger(m) || m <= 0)
      return { error: "Max Student must be a positive whole number" };
    value.maxStudent = m;
  }
  if (has("status") || !partial) {
    const status = body.status ?? "Open";
    if (!COURSE_STATUSES.includes(status))
      return { error: `Status must be one of: ${COURSE_STATUSES.join(", ")}` };
    value.status = status;
  }
  return { value };
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
