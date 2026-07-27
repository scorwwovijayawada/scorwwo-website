// One-time setup script.
// Run with: npm run seed:eworld
// Creates the 3 admin accounts (with bcrypt-hashed passwords) and
// the original sample students in Firestore, matching the demo data
// from the original front-end prototype. Safe to re-run — it updates
// existing rows (matched by username / admission no.) instead of
// duplicating them.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./config/db"); // Firestore instance

const ADMINS = [
  { username: "pres", password: "Pass@123", authCode: "AUTH-PRES", role: "President", badge: "badge-president" },
  { username: "secr", password: "Pass@456", authCode: "AUTH-SECR", role: "Secretary", badge: "badge-secretary" },
  { username: "pmgr", password: "Pass@789", authCode: "AUTH-PMGR", role: "Project Manager", badge: "badge-manager" },
];

const STUDENTS = [
  ["ADM-2024-001", "STU-1001", "24CS001", "Aryan Mehta", "NIT Warangal", "Hyderabad", "2024-07-10", "+91 98765 43210", "aryan.m@email.com", "B.Tech CSE", "Hostel resident. Sports captain.", 85000, 85000],
  ["ADM-2024-002", "STU-1002", "24EC002", "Priya Sharma", "BITS Pilani", "Secunderabad", "2024-07-12", "+91 87654 32109", "priya.s@email.com", "B.Tech ECE", "Merit scholarship holder.", 92000, 46000],
  ["ADM-2024-003", "STU-1003", "24ME003", "Rohit Patel", "VNIT Nagpur", "Nagpur", "2024-08-01", "+91 76543 21098", "rohit.p@email.com", "B.Tech ME", "Day scholar.", 78000, 0],
  ["ADM-2024-004", "STU-1004", "24CI004", "Sneha Reddy", "CBIT Hyderabad", "Hyderabad", "2024-08-05", "+91 65432 10987", "sneha.r@email.com", "B.Tech Civil", "Cultural committee member.", 67000, 67000],
  ["ADM-2024-005", "STU-1005", "24IT005", "Kiran Kumar", "KLU Vijayawada", "Vijayawada", "2024-08-20", "+91 54321 09876", "kiran.k@email.com", "B.Tech IT", "Part-time tutor.", 72000, 36000],
  ["ADM-2025-001", "STU-1006", "25CS001", "Divya Nair", "NIT Warangal", "Warangal", "2025-01-15", "+91 43210 98765", "divya.n@email.com", "M.Tech CSE", "PG student.", 95000, 95000],
  ["ADM-2025-002", "STU-1007", "25EC002", "Amir Khan", "BITS Pilani", "Hyderabad", "2025-02-10", "+91 32109 87654", "amir.k@email.com", "M.Tech ECE", "Research assistant.", 99000, 33000],
  ["ADM-2025-003", "STU-1008", "25ME003", "Lakshmi Prasad", "IIT Madras", "Chennai", "2025-03-05", "+91 21098 76543", "lakshmi.p@email.com", "B.Tech ME", "National scholarship.", 110000, 110000],
  ["ADM-2025-004", "STU-1009", "25ME004", "Rajesh Kumar", "IIT Madras", "Chennai", "2025-03-05", "+91 21098 76543", "rajesh.k@email.com", "B.Tech ME", "National scholarship.", 110000, 55000],
];

async function upsertAdmin(a) {
  const hash = await bcrypt.hash(a.password, 10);
  const snap = await db.collection("admins").where("username", "==", a.username).limit(1).get();
  const data = {
    username: a.username,
    password_hash: hash,
    auth_code: a.authCode,
    role: a.role,
    badge_class: a.badge,
  };
  if (snap.empty) {
    await db.collection("admins").add({ ...data, created_at: new Date().toISOString() });
  } else {
    await snap.docs[0].ref.update(data);
  }
  console.log(`  - ${a.username} (${a.role})`);
}

async function upsertStudent(s) {
  const [adm, stuno, roll, name, college, place, admission_date, phone, email, course, details, fee_total, fee_paid] = s;
  const snap = await db.collection("students").where("adm", "==", adm).limit(1).get();
  const data = {
    adm, stuno, roll, name, college, place, admission_date,
    phone, email, course, details, fee_total, fee_paid,
    updated_at: new Date().toISOString(),
  };
  if (snap.empty) {
    await db.collection("students").add({ ...data, created_at: new Date().toISOString() });
  } else {
    await snap.docs[0].ref.update(data);
  }
}

async function seed() {
  console.log("Seeding admins...");
  for (const a of ADMINS) {
    await upsertAdmin(a);
  }

  console.log("Seeding sample students...");
  for (const s of STUDENTS) {
    await upsertStudent(s);
  }
  console.log(`  - ${STUDENTS.length} students inserted/updated.`);

  console.log('\nDone. Login with, e.g. username "pmgr", password "Pass@789", auth code "AUTH-PMGR".');
  console.log("IMPORTANT: change these demo passwords before going live.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
