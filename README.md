# How to Test the App

## Student Information

- **Student Name:** <your name>
- **Student ID:** <your id>

## Test Credentials

All test users share the password **`password123`** (log in with email or username).

| Role    | Username   | Email                  | Password      |
|---------|------------|------------------------|---------------|
| Student | `student1` | student1@example.com   | password123   |
| Student | `student2` | student2@example.com   | password123   |
| Student | `student3` | student3@example.com   | password123   |
| Teacher | `teacher1` | teacher1@example.com   | password123   |
| Teacher | `teacher2` | teacher2@example.com   | password123   |
| Teacher | `teacher3` | teacher3@example.com   | password123   |

## Prerequisites

- Node.js 20+ and npm
- A MongoDB database (MongoDB Atlas or local)

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

```bash
cd next-backend
npm install
cp .env.example .env.local      # then edit the values
npm run seed                    # creates the 6 test users + sample courses
npm run dev                     # http://localhost:3000
```

`.env.local`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/?retryWrites=true&w=majority
MONGODB_DB=online_course
JWT_SECRET=<any long random string>
FRONTEND_ORIGIN=http://localhost:5173
```

### 2. Frontend Setup (`react-frontend/`)

```bash
cd react-frontend
npm install
cp .env.example .env.local      # VITE_API_URL=http://localhost:3000
npm run dev                     # http://localhost:5173
```

### 3. Testing Walkthrough

1. Open http://localhost:5173 — you are redirected to the login page (no access without login).
2. **Teacher** (`teacher1` / `password123`): see *My Courses* (own courses only) → *New course* → open a course to see its details and enrolled students → *Edit* → *Delete* (disabled/rejected while students are enrolled).
3. **Student** (`student1` / `password123`): *All Courses* lists every course except `Cancel`; search by course or teacher name; open a course and click *Enroll* (only works when status is `Open`, seats remain, and not already enrolled); *My Enrollments* lists enrolled courses.
4. Rules are enforced by the API (try the wrong role or another teacher's course id → 403; no token → 401; enrolling twice → 409; full/closed course → rejected).

### API summary

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/logout` | public / logged in |
| POST | `/api/user` (register) , GET `/api/user/me` | public / logged in |
| GET, POST | `/api/course` | Student: list+`?q=` search / Teacher: own list, create |
| GET, PUT, DELETE | `/api/course/:id` | Teacher (owner only); Student can GET |
| POST | `/api/course/:id/enroll` | Student |
| GET | `/api/course/enrolled` | Student |

### Deployment (Vercel)

- Backend project root `next-backend`: set `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `FRONTEND_ORIGIN` (= deployed frontend URL, no trailing slash).
- Frontend project root `react-frontend`: set `VITE_API_URL` (= deployed backend URL, no trailing slash).
