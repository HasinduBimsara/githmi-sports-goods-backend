const admin = require("../utils/firebaseAdmin");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// ──────────────────────────────────────────
// Verify Token (Handles both standard JWT and Firebase)
// ──────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No token provided. Access denied." });
    }

    const token = authHeader.split(" ")[1];
    
    try {
      // 1. Try standard JSON Web Token first
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found in database." });
      }
      req.user = user;
      return next();
    } catch (jwtError) {
      try {
        // 2. If JWT fails, try Firebase ID Token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const user = await User.findOne({ email: decodedToken.email }).select("-password");
        
        if (!user) {
          return res.status(401).json({ message: "User not found in database. Please register." });
        }

        req.user = user;
        req.firebaseUser = decodedToken;
        return next();
      } catch (fbError) {
        console.error("Token verification error:", fbError.message);
        return res.status(401).json({ message: "Invalid or expired token." });
      }
    }
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ message: "Invalid auth sequence." });
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
