const admin = require("../utils/firebaseAdmin");
const User = require("../models/user");

// ──────────────────────────────────────────
// Verify Firebase ID token from Authorization header
// ──────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No token provided. Access denied." });
    }

    const idToken = authHeader.split(" ")[1];
    
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Find user in MongoDB by email or Firebase UID
    // Note: We might store firebaseUid in the model later, for now we match by email
    const user = await User.findOne({ email: decodedToken.email }).select("-password");
    
    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found in database. Please register." });
    }

    req.user = user;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// ──────────────────────────────────────────
// Restrict to admin role only
// ──────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }
};

module.exports = { verifyToken, adminOnly };
