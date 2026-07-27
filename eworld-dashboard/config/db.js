// Firestore handle for the E-World Internship / Student Dashboard.
// Previously this was its own MySQL pool (EWORLD_DB_* env vars);
// now it reuses the single Firebase project configured in
// ../../config/firebase.js, keeping students/admins in Firestore
// collections "students" and "admins".
const { db } = require("../../config/firebase");

module.exports = db;
