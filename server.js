const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

/* Firebase Admin SDK (Firestore) — replaces the old MySQL pool below
   for the contact form. Same Firestore instance is reused by the
   E-World dashboard routes (see eworld-dashboard/config/db.js). */
const { db } = require("./config/firebase");

/* E-World Internship Dashboard API (previously its own separate app
   deployed at student-dashboard-4ybq.onrender.com — now merged in so
   the whole site + dashboard run from this one server/database). */
const eworldAuthRoutes = require("./eworld-dashboard/routes/auth");
const eworldStudentRoutes = require("./eworld-dashboard/routes/students");
const eworldReportRoutes = require("./eworld-dashboard/routes/reports");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve all your static HTML pages, CSS, JS, and photo folders
// from the project root (same folder this file lives in).
app.use(express.static(path.join(__dirname, ".")));

/* DATABASE
   Firestore (Firebase) is initialized in ./config/firebase.js and
   imported above as `db`. No connection pool needed — the Admin SDK
   manages its own connections. */

/* CONTACT FORM */

app.post("/contact", async (req, res) => {
    const { full_name, email, phone, subject, message } = req.body;

    try {
        await db.collection("enquiries").add({
            full_name: full_name || "",
            email: email || "",
            phone: phone || "",
            subject: subject || "",
            message: message || "",
            created_at: new Date().toISOString()
        });

        res.json({
            success: true,
            message: "Enquiry Saved Successfully"
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Database Error"
        });
    }
});

/* GET /api/enquiries
   Returns all Contact Us submissions (Firestore "enquiries" collection),
   most recent first. Used only by the hidden ewadminint.html page — this
   endpoint is not linked from any nav/menu, but note it has no auth check
   of its own, so treat the URL as sensitive. */
app.get("/api/enquiries", async (req, res) => {
    try {
        const snap = await db.collection("enquiries").get();
        const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

/* DATA ENDPOINTS
   (previously the root server.js proxied these to a separate process on
   port 5000 via axios — now they're answered directly, no proxy needed) */

app.get("/api/data", (req, res) => {
    res.json({
        status: "success",
        message: "Hello from the Node Backend!",
        liveTrains: [
            { trainNo: "12727", name: "Godavari Express", status: "On Time" },
            { trainNo: "12739", name: "Garibrath Express", status: "Delayed by 15 mins" }
        ],
        zonals: ["Vijayawada", "Visakhapatnam", "Guntur", "Guntakal"]
    });
});

app.get("/api/status", (req, res) => {
    res.redirect("/api/data");
});

/* EVENTS
   Simple hardcoded events list. To add a new event later, just add
   another { event_date, title } object to this array and redeploy. */

const events = [
    { event_date: "2026-05-24", title: "Hydration Drive" },
    { event_date: "2026-01-29", title: "NUKKAND NATAK and Distribution of Sanitary Napkins" }
];

app.get("/events", (req, res) => {
    res.json(events);
});

/* E-WORLD INTERNSHIP DASHBOARD API
   Front-end lives at /student-dashboard.html (served automatically by
   the express.static line above). It calls these same-origin, so no
   separate Render deployment or CORS setup is needed anymore. Uses the
   same Firestore database as the rest of the site (./config/firebase.js) —
   see eworld-dashboard/README.md for the "admins" / "students" collections. */

app.use("/api/auth", eworldAuthRoutes);
app.use("/api/students", eworldStudentRoutes);
app.use("/api/reports", eworldReportRoutes);

/* SERVE THE SITE */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* HIDDEN CONTACT-US ADMIN PAGE
   Not linked anywhere on the site — reachable only by typing the URL
   directly. Shows everything submitted through the Contact Us form. */
app.get("/ewadminint", (req, res) => {
    res.sendFile(path.join(__dirname, "ewadminint.html"));
});

// Only start a real listening server when this file is run directly
// (e.g. `node server.js` on Railway/Render/local). On Vercel, this file
// is required as a module instead — Vercel calls the exported `app`
// itself, so app.listen() must NOT run there.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;