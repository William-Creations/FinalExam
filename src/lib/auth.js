import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb } from "./db";

const JWT_SECRET = process.env.JWT_SECRET;

// Reads the JWT from the httpOnly "token" cookie, or from an
// "Authorization: Bearer <token>" header (fallback for browsers that block
// third-party cookies when frontend and backend are on different domains).
export function verifyJWT(req) {
  try {
    let token = req.cookies.get("token")?.value;
    if (!token) {
      const auth = req.headers.get("authorization");
      if (auth && auth.startsWith("Bearer ")) token = auth.slice(7);
    }
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

export function signJWT(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1d" },
  );
}

// Verifies the token AND loads the user from the database so that the role
// used for authorization is always the current one stored on the server
// (never trusted from request headers).
export async function getCurrentUser(req) {
  const payload = verifyJWT(req);
  if (!payload || !ObjectId.isValid(payload.id)) return null;
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(payload.id) });
  if (!user) return null;
  return {
    _id: user._id,
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  };
}
