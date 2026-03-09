const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const router = express.Router();

const User = require("../models/User");
const OTP = require("../models/OTP");
const { verifyToken, adminOnly } = require("../middleware/auth");
const { sendOTPEmail } = require("../utils/sendMail");

// ──────────────────────────────────────────
// Helper: Generate JWT token
// ──────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ──────────────────────────────────────────
// Helper: Generate 6-digit OTP
// ──────────────────────────────────────────
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ──────────────────────────────────────────
// POST /api/user/
// Register a new customer
// ──────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || "",
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

// ──────────────────────────────────────────
// POST /api/user/login
// Email + Password Login
// ──────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Google-only accounts can't login with password
    if (user.isGoogleUser && !user.password) {
      return res.status(401).json({
        message:
          "This account was created with Google. Please use Google Sign-In.",
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// ──────────────────────────────────────────
// POST /api/user/google
// Google OAuth Login / Register
// ──────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res
        .status(400)
        .json({ message: "Google access token is required" });
    }

    // Fetch user info from Google
    const googleResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const { email, given_name, family_name, picture } = googleResponse.data;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Could not retrieve email from Google" });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Auto-register Google user
      user = new User({
        firstName: given_name || "Google",
        lastName: family_name || "User",
        email: email.toLowerCase(),
        profilePicture: picture || "",
        isGoogleUser: true,
      });
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      message: "Google login successful",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Google login error:", error.message);
    res.status(500).json({ message: "Google authentication failed" });
  }
});

// ──────────────────────────────────────────
// GET /api/user/current
// Get currently logged-in user (Protected)
// ──────────────────────────────────────────
router.get("/current", verifyToken, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: "Failed to get user data" });
  }
});

// ──────────────────────────────────────────
// POST /api/user/sendMail
// Send OTP email for password reset
// ──────────────────────────────────────────
router.post("/sendMail", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with this email" });
    }

    if (user.isGoogleUser && !user.password) {
      return res.status(400).json({
        message:
          "This account uses Google Sign-In. Password reset is not available.",
      });
    }

    // Delete any previous OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
    });

    // Send email
    await sendOTPEmail(email, otp);

    res.json({ message: "OTP sent to your email successfully" });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

// ──────────────────────────────────────────
// POST /api/user/changePW
// Verify OTP and change password
// ──────────────────────────────────────────
router.post("/changePW", async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      expiresAt: { $gt: new Date() }, // Must not be expired
    });

    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP. Please request a new one." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await User.updateOne(
      { email: email.toLowerCase() },
      { password: hashedPassword },
    );

    // Delete used OTP
    await OTP.deleteMany({ email: email.toLowerCase() });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res
      .status(500)
      .json({ message: "Failed to change password. Please try again." });
  }
});

// ──────────────────────────────────────────
// GET /api/user (Admin only)
// Get all users
// ──────────────────────────────────────────
router.get("/", verifyToken, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ──────────────────────────────────────────
// DELETE /api/user/:id (Admin only)
// Delete a user
// ──────────────────────────────────────────
router.delete("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;
