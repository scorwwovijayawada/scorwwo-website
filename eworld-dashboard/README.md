# E-World Internship / Student Dashboard (merged into the main site)

This used to be a separate app deployed on its own at
`student-dashboard-4ybq.onrender.com`. It has now been merged into the
main SCoRWWO server (`server.js` in the project root) so everything —
the public website, the AI chatbot, the contact form, and this student
dashboard — runs from one Node process and one `npm start`.

- The dashboard's **front-end** now lives at `/student-dashboard.html`
  in the project root, served automatically as a static file.
- The dashboard's **API** (login, students, reports) is mounted in the
  root `server.js` under `/api/auth`, `/api/students`, `/api/reports`.
- The "Click to Join Internship" button on `e-world.html` now links
  straight to `student-dashboard.html` — no more opening a separate
  Render site in a new tab.
- Adding a student is done from inside the dashboard itself, via the
  **"Add student"** item in the sidebar (Project Manager account only).
  There used to be a separate standalone `/data-entry.html` page for
  this, but it was removed since it duplicated the "Add student" pane.

## What's in this folder

```
eworld-dashboard/
  config/db.js        Firestore handle (re-exports ../../config/firebase.js)
  middleware/auth.js   JWT login check + "Project Manager only" check
  routes/auth.js       POST /api/auth/login
  routes/students.js   GET/POST/PUT/DELETE /api/students
  routes/reports.js    Dashboard stats, date report, month report, course-wise
  seed.js              Run once to create the 3 admin logins + demo students
```

**This project now uses Firebase (Firestore) instead of MySQL.** Both
this dashboard and the main site's contact form share one Firebase
project, initialized once in the project-root `config/firebase.js`.
Firestore collections used:

| Collection  | Purpose                                             |
|-------------|------------------------------------------------------|
| `admins`    | The 3 login accounts (President/Secretary/Manager)   |
| `students`  | Student records (same fields as the old `students` MySQL table) |
| `enquiries` | Contact-form submissions (see project-root README)   |

A `students` document has these fields (mirrors the old MySQL table):
`adm, stuno, roll, name, college, place, admission_date, phone, email,
course, details, fee_total, fee_paid, created_at, updated_at`. Firestore
auto-generates the document ID (used in place of the old auto-increment
`id`).

## How the login/roles work

Same 3 demo accounts as before, with bcrypt-hashed passwords stored in
the `admins` Firestore collection instead of a MySQL table:

| Username | Password  | Auth code  | Role             |
|----------|-----------|------------|------------------|
| pres     | Pass@123  | AUTH-PRES  | President (view only) |
| secr     | Pass@456  | AUTH-SECR  | Secretary (view only)  |
| pmgr     | Pass@789  | AUTH-PMGR  | Project Manager (can add/edit/delete) |

**Change these before going live** — edit the `ADMINS` array at the
top of `seed.js`, then re-run `npm run seed:eworld` (it upserts by
username, so it's safe to re-run any time you want to rotate a
password).

Login returns a JWT that the front-end stores in memory and sends as
`Authorization: Bearer <token>` on every API call. Add/edit/delete
routes check the role server-side too — a non-manager can't bypass the
UI by calling the API directly, they'll get a 403.

## 1. Set up a Firebase project (one-time)

1. Go to the Firebase console (https://console.firebase.google.com/),
   create a project (or reuse one), and enable **Firestore Database**
   (production mode is fine — access is entirely through this
   server's Admin SDK, never directly from the browser).
2. Project settings → **Service accounts** → **Generate new private
   key**. This downloads a JSON file — keep it secret, never commit it.

## 2. Configure environment variables

Edit `.env` in the project root and fill in your Firebase credentials.
Two ways to do this — pick one:

**Option A — paste the whole JSON key as one line:**
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...", ... }
```

**Option B — split into three vars (handy if your host's dashboard
doesn't like huge JSON blobs in one field):**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```
(Keep the `\n` escapes and the surrounding quotes exactly as they
appear in the downloaded JSON file's `private_key` field.)

Also set/keep:
```
EWORLD_JWT_SECRET=some_long_random_string
EWORLD_JWT_EXPIRES_IN=8h
```

## 3. Seed the demo data (one-time)

```bash
# from the project root
npm install
npm run seed:eworld
```

This creates the 3 admin logins and the demo student records in
Firestore.

## 4. Run the whole site

```bash
npm start
```

Open the site (e.g. **http://localhost:3000**), go to the E-World
page, and click **"Open Internship Dashboard"** — it opens
`/student-dashboard.html` on the same server. Log in with
`pmgr` / `Pass@789` / `AUTH-PMGR` for full add/edit/delete access.

## Deploying

Deploy this exactly the way you'd deploy the rest of the SCoRWWO site
(Railway, Render, cPanel, etc). Just make sure:

- The `FIREBASE_*` env vars are set on the host (same Option A/B as above).
- `npm run seed:eworld` has been run once (locally, pointed at the same
  Firebase project) so the 3 admin logins and demo students exist.

## Notes

- **Rotate the demo passwords** in `seed.js` before sharing the site
  publicly.
- **HTTPS**: don't run this over plain HTTP once it's public — login
  credentials cross the wire.
- **Firestore security rules**: since all reads/writes go through this
  server's Admin SDK (never the browser directly), you can leave
  Firestore's client-facing rules locked down (deny all) — the Admin
  SDK bypasses security rules entirely, using the service account.
- The CSV export buttons on the dashboard still work entirely in the
  browser, from whatever report was last generated.
