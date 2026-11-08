"use strict";

const admin = require("firebase-admin");

function initializeFirebaseAdmin() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const serviceAccount = JSON.parse(raw);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

async function requireFirebaseUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer (.+)$/i);
    if (!match) return res.status(401).json({ error: "Sign in to use the adaptive quiz." });
    req.user = await admin.auth().verifyIdToken(match[1]);
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
  }
}

module.exports = { admin, initializeFirebaseAdmin, requireFirebaseUser };
