const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT env var.");
    } else {
      // Try resolving it dynamically to avoid Vercel build/bundle issues when missing
      const fs = require('fs');
      const path = require('path');
      const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin initialized using service-account.json.");
      } else {
        console.warn("Firebase Admin not initialized: No service account found.");
      }
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error.message);
  }
}

module.exports = admin;
