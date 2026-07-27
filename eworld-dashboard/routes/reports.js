const express = require("express");
const db = require("../config/db"); // Firestore instance
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const COLLECTION = "students";
router.use(requireAuth);

function toClient(doc) {
  const row = doc.data ? doc.data() : doc;
  const id = doc.id || row.id;
  return {
    id, adm: row.adm, stuno: row.stuno, roll: row.roll, name: row.name,
    college: row.college, place: row.place,
    date: row.admission_date,
    phone: row.phone || "", email: row.email || "", course: row.course || "", details: row.details || "",
    feeTotal: Number(row.fee_total || 0), feePaid: Number(row.fee_paid || 0),
  };
}

function sortDesc(list) {
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return String(a.id) < String(b.id) ? 1 : -1;
  });
}
function sortAsc(list) {
  return list.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
}

async function getAllStudents() {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map(toClient);
}

// GET /api/reports/dashboard -> stats + 5 most recent + last 8 months trend
router.get("/dashboard", async (req, res) => {
  try {
    const all = await getAllStudents();
    const total = all.length;
    const colleges = new Set(all.map(s => s.college).filter(Boolean)).size;
    const totalFees = all.reduce((sum, s) => sum + Number(s.feeTotal || 0), 0);
    const recent = sortDesc([...all]).slice(0, 5);

    const monthCounts = {};
    all.forEach(s => {
      if (!s.date) return;
      const ym = String(s.date).slice(0, 7); // YYYY-MM
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    });
    const monthlyTrend = Object.keys(monthCounts)
      .sort()
      .slice(-8)
      .map(ym => ({ ym, cnt: monthCounts[ym] }));

    res.json({
      totalStudents: total,
      colleges,
      totalFees,
      recent,
      monthlyTrend,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard data." });
  }
});

// GET /api/reports/date?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/date", async (req, res) => {
  try {
    const { from = "", to = "" } = req.query;
    let all = await getAllStudents();
    if (from) all = all.filter(s => s.date && s.date >= from);
    if (to) all = all.filter(s => s.date && s.date <= to);
    res.json(sortAsc(all));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to run date report." });
  }
});

// GET /api/reports/month?year=YYYY&month=1-12(optional)
router.get("/month", async (req, res) => {
  try {
    const { year, month = "" } = req.query;
    if (!year) return res.status(400).json({ error: "year is required." });
    let all = await getAllStudents();
    all = all.filter(s => s.date && String(s.date).slice(0, 4) === String(year));
    if (month) {
      const mm = String(month).padStart(2, "0");
      all = all.filter(s => String(s.date).slice(5, 7) === mm);
    }
    res.json(sortAsc(all));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to run month report." });
  }
});

// GET /api/reports/courses -> course-wise grouping with totals
router.get("/courses", async (req, res) => {
  try {
    const all = await getAllStudents();
    all.sort((a, b) => (a.course || "").localeCompare(b.course || "") || a.name.localeCompare(b.name));
    const courseMap = {};
    all.forEach(r => {
      const c = r.course || "Unknown";
      if (!courseMap[c]) courseMap[c] = { students: [], totalFees: 0 };
      courseMap[c].students.push(r);
      courseMap[c].totalFees += Number(r.feeTotal || 0);
    });
    res.json(courseMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load course-wise data." });
  }
});

module.exports = router;
