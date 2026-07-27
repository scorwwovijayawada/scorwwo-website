// ============================================================
// Firebase Admin SDK initializer (Firestore)
// Replaces the old MySQL connection pools (server.js's `db` pool
// and eworld-dashboard/config/db.js) for BOTH:
//   1) the main site's contact form ("enquiries" collection)
//   2) the E-World student dashboard ("admins" + "students" collections)
//
// Credentials come from environment variables — see .env / README_FIREBASE.md.
// Supports two ways to provide the service account:
//   A) FIREBASE_SERVICE_ACCOUNT  -> the full JSON key as a single-line string
//   B) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
// ============================================================
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

if (!admin.getApps().length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Full service-account JSON pasted into one env var (recommended for
    // hosts like Render/Railway where you can't upload a file easily).
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.cert(serviceAccount);
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    credential = admin.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env stores the key with literal \n escapes; unescape them here.
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  } else {
    // Falls back to Application Default Credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS
    // pointing at a service-account.json file, or a Google Cloud host with a
    // default service account attached).
    credential = admin.applicationDefault();
  }

  admin.initializeApp({ credential });
  console.log("Firebase Admin initialized. Project:", process.env.FIREBASE_PROJECT_ID || "(from credentials)");
}

const db = getFirestore();

module.exports = { admin, db };
