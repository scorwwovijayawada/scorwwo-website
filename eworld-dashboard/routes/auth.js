const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // Firestore instance

const router = express.Router();

// POST /api/auth/login
// body: { username, password, authCode }
router.post("/login", async (req, res) => {
  try {
    const { username, password, authCode } = req.body;
    if (!username || !password || !authCode) {
      return res.status(400).json({ error: "Username, password and authorization code are required." });
    }

    const snap = await db
      .collection("admins")
      .where("username", "==", username.trim())
      .limit(1)
      .get();

    const admin = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };

    // Compare in constant-ish fashion; bcrypt.compare handles missing hash gracefully via early return.
    const passOk = admin ? await bcrypt.compare(password, admin.password_hash) : false;
    const authOk = admin ? admin.auth_code === authCode.trim().toUpperCase() : false;

    if (!admin || !passOk || !authOk) {
      return res.status(401).json({ error: "Invalid credentials or auth code." });
    }

    const payload = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      badge: admin.badge_class,
    };
    const token = jwt.sign(payload, process.env.EWORLD_JWT_SECRET, {
      expiresIn: process.env.EWORLD_JWT_EXPIRES_IN || "8h",
    });

    res.json({ token, admin: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login." });
  }
});

module.exports = router;
