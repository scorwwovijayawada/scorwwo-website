const express = require("express");
const db = require("../config/db"); // Firestore instance
const { requireAuth, requireManager } = require("../middleware/auth");

const router = express.Router();
const COLLECTION = "students";
router.use(requireAuth); // every student route needs a logged-in admin

// Map a Firestore doc -> the shape the front-end expects (camelCase, date field name)
function toClient(doc) {
  const row = doc.data ? doc.data() : doc;
  const id = doc.id || row.id;
  return {
    id,
    adm: row.adm,
    stuno: row.stuno,
    roll: row.roll,
    name: row.name,
    college: row.college,
    place: row.place,
    date: row.admission_date, // stored as 'YYYY-MM-DD' string
    phone: row.phone || "",
    email: row.email || "",
    course: row.course || "",
    details: row.details || "",
    feeTotal: Number(row.fee_total || 0),
    feePaid: Number(row.fee_paid || 0),
  };
}

function sortStudents(list) {
  // Most recent admission_date first, then id desc (mirrors the old SQL ORDER BY)
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return String(a.id) < String(b.id) ? 1 : -1;
  });
}

// GET /api/students?search=&college=&place=
router.get("/", async (req, res) => {
  try {
    const { search = "", college = "", place = "" } = req.query;
    const snap = await db.collection(COLLECTION).get();
    let rows = snap.docs.map(toClient);

    if (college) rows = rows.filter(r => r.college === college);
    if (place) rows = rows.filter(r => r.place === place);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        (r.name || "").toLowerCase().includes(s) ||
        (r.adm || "").toLowerCase().includes(s)
      );
    }

    res.json(sortStudents(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch students." });
  }
});

// GET /api/students/meta  -> distinct colleges/places/years for filter dropdowns
router.get("/meta", async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION).get();
    const rows = snap.docs.map(d => d.data());
    const colleges = [...new Set(rows.map(r => r.college).filter(Boolean))].sort();
    const places = [...new Set(rows.map(r => r.place).filter(Boolean))].sort();
    const years = [...new Set(rows.map(r => String(r.admission_date || "").slice(0, 4)).filter(Boolean))].sort();
    res.json({ colleges, places, years });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch filter options." });
  }
});

// GET /api/students/:id
router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Student not found." });
    res.json(toClient(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch student." });
  }
});

// POST /api/students  (Project Manager only)
router.post("/", requireManager, async (req, res) => {
  try {
    const b = req.body;
    if (!b.adm || !b.name) {
      return res.status(400).json({ error: "Admission number and name are required." });
    }

    // Enforce the old UNIQUE(adm) constraint manually.
    const dupSnap = await db.collection(COLLECTION).where("adm", "==", b.adm).limit(1).get();
    if (!dupSnap.empty) {
      return res.status(409).json({ error: "A student with that admission number already exists." });
    }

    const data = {
      adm: b.adm,
      stuno: b.stuno || "",
      roll: b.roll || "",
      name: b.name,
      college: b.college || "",
      place: b.place || "",
      admission_date: b.date || null,
      phone: b.phone || "",
      email: b.email || "",
      course: b.course || "",
      details: b.details || "",
      fee_total: Number(b.feeTotal || 0),
      fee_paid: Number(b.feePaid || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const ref = await db.collection(COLLECTION).add(data);
    const doc = await ref.get();
    res.status(201).json(toClient(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create student." });
  }
});

// PUT /api/students/:id  (Project Manager only)
router.put("/:id", requireManager, async (req, res) => {
  try {
    const b = req.body;
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Student not found." });

    // Enforce UNIQUE(adm), excluding this same record.
    if (b.adm) {
      const dupSnap = await db.collection(COLLECTION).where("adm", "==", b.adm).get();
      const conflict = dupSnap.docs.find(d => d.id !== req.params.id);
      if (conflict) {
        return res.status(409).json({ error: "A student with that admission number already exists." });
      }
    }

    await ref.update({
      adm: b.adm,
      stuno: b.stuno || "",
      roll: b.roll || "",
      name: b.name,
      college: b.college || "",
      place: b.place || "",
      admission_date: b.date || null,
      phone: b.phone || "",
      email: b.email || "",
      course: b.course || "",
      details: b.details || "",
      fee_total: Number(b.feeTotal || 0),
      fee_paid: Number(b.feePaid || 0),
      updated_at: new Date().toISOString(),
    });

    const doc = await ref.get();
    res.json(toClient(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update student." });
  }
});

// DELETE /api/students/:id  (Project Manager only)
router.delete("/:id", requireManager, async (req, res) => {
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Student not found." });
    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete student." });
  }
});

module.exports = router;
