const jwt = require('jsonwebtoken');

// Verifies the Bearer token and attaches { id, username, role } to req.admin
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });

  try {
    const payload = jwt.verify(token, process.env.EWORLD_JWT_SECRET);
    req.admin = payload; // { id, username, role, badge }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Only Project Manager may add/edit/delete students (mirrors the
// original front-end's isManager restriction).
function requireManager(req, res, next) {
  if (!req.admin || req.admin.role !== 'Project Manager') {
    return res.status(403).json({ error: 'Only a Project Manager can perform this action.' });
  }
  next();
}

module.exports = { requireAuth, requireManager };
