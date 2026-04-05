const mongoose = require("mongoose");
const OTP = require("../models/OTP");
const User = require("../models/User");
const Order = require("../models/Order");
const Message = require("../models/Message");
const Review = require("../models/Review");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { sendOTPEmail } = require("../utils/sendMail");
const admin = require("../utils/firebaseAdmin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// ─── Helper ────────────────────────────────────────────────────────────────
const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const safeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profilePicture: user.profilePicture,
});

// ─── Controllers ───────────────────────────────────────────────────────────

// @desc    Register a new user
// @route   POST /api/user
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
    });
    const token = generateToken(user);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: safeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Login with email & password
// @route   POST /api/user/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.isGoogleUser && !user.password)
      return res.status(400).json({ message: "Please sign in with Google" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({ message: "Login successful", token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Login / register with Google OAuth
// @route   POST /api/user/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken)
      return res.status(400).json({ message: "Access token is required" });

    const { data: googleUser } = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      user = await User.create({
        firstName: googleUser.given_name || googleUser.name.split(" ")[0],
        lastName:
          googleUser.family_name ||
          googleUser.name.split(" ").slice(1).join(" "),
        email: googleUser.email,
        profilePicture: googleUser.picture,
        isGoogleUser: true,
      });
    }

    const token = generateToken(user);
    res.json({
      message: "Google login successful",
      token,
      user: safeUser(user),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Google authentication failed", error: err.message });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/user/current
// @access  Protected
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Send OTP to email for password reset
// @route   POST /api/user/sendMail
// @access  Public
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account with that email" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.findOneAndDelete({ email });
    await OTP.create({ email, otp, expiresAt });
    await sendOTPEmail(email, otp);

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP", error: err.message });
  }
};

// @desc    Get admin notification stats
// @route   GET /api/user/admin-stats
// @access  Private (Admin only)
const getAdminStats = async (req, res) => {
  try {
    // 1. Pending Orders (using mongoose.model to ensure it's registered)
    const pendingOrders = await mongoose.model("Order").countDocuments({ status: "Pending" });
    const processingOrders = await mongoose.model("Order").countDocuments({ status: "Processing" });

    // 2. Unapproved Reviews
    const unapprovedReviews = await mongoose.model("Review").countDocuments({ isApproved: false });

    // 3. Unread Messages
    const unreadMessages = await mongoose.model("Message").countDocuments({ status: "Unread" });

    // 4. New Users (Last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newUsers = await mongoose.model("User").countDocuments({ createdAt: { $gte: twentyFourHoursAgo } });

    // 5. New Products (Last 24 hours)
    const newProducts = await mongoose.model("Product").countDocuments({ createdAt: { $gte: twentyFourHoursAgo } });

    console.log(`[AdminStats Sync] Orders: ${pendingOrders}, Processing: ${processingOrders}, Products: ${newProducts}`);

    res.json({
      orders: pendingOrders,
      processingOrders: processingOrders,
      products: newProducts,
      reviews: unapprovedReviews,
      messages: unreadMessages,
      users: newUsers,
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// @desc    Change password using OTP
// @route   POST /api/user/changePW
// @access  Public
const changePassword = async (req, res) => {
  try {
    const { email, otp, newPassword, password } = req.body;
    const nextPassword = newPassword || password;

    if (!email || !otp || !nextPassword)
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required" });

    const record = await OTP.findOne({ email });
    if (!record)
      return res.status(400).json({ message: "OTP not found or already used" });

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ email });
      return res.status(400).json({ message: "OTP has expired" });
    }

    const hashedPassword = await bcrypt.hash(nextPassword, 12);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    await OTP.deleteOne({ email });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get all users
// @route   GET /api/user
// @access  Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/user/:id
// @access  Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Make a user admin (Development only)
// @route   GET /api/user/makeMeAdmin/:email
const makeMeAdmin = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { email: req.params.email },
      { role: "admin" },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found with that email" });
    
    // We send HTML so it displays nicely in the browser
    res.send(`<h1>Success!</h1><p><b>${user.email}</b> is now an admin!</p><p>Please completely log out of the frontend and log back in to get your new Admin token.</p>`);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Sync Firebase user with MongoDB (for Google login or existing Firebase users)
// @route   POST /api/user/firebase-sync
// @access  Public (Expects Firebase ID Token)
const firebaseSync = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID Token is required" });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if not exists (Auto-registration for Google users)
      const names = name ? name.split(" ") : ["User", ""];
      user = await User.create({
        firstName: names[0],
        lastName: names.slice(1).join(" ") || " ",
        email,
        profilePicture: picture,
        isGoogleUser: true, // Mark as social user
        firebaseUid: uid,
      });
    } else if (!user.firebaseUid) {
      // Link existing user to Firebase
      user.firebaseUid = uid;
      await user.save();
    }

    res.json({
      message: "User synchronized successfully",
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Firebase sync error:", err.message);
    res.status(500).json({ message: "Synchronization failed", error: err.message });
  }
};

// @desc    Create MongoDB user after Firebase registration
// @route   POST /api/user/register-firebase
// @access  Public (Expects Firebase ID Token + Details)
const registerFirebase = async (req, res) => {
  try {
    const { idToken, firstName, lastName, phone } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID Token is required" });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid } = decodedToken;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists in database" });

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      firebaseUid: uid,
    });

    res.status(201).json({
      message: "User registered and synced successfully",
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Firebase registration error:", err.message);
    res.status(500).json({ message: "Registration sync failed", error: err.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  getCurrentUser,
  sendOTP,
  changePassword,
  getAllUsers,
  deleteUser,
  makeMeAdmin,
  firebaseSync,
  registerFirebase,
  getAdminStats,
};
