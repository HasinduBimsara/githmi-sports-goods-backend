const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    const serviceAccount = require("../service-account.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized successfully using service-account.json.");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error.message);
  }
}

module.exports = admin;
