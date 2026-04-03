const express = require("express");
const router = express.Router();
const { verifyToken, adminOnly } = require("../middlewear/auth");
const {
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
} = require("../controller/userController");

router.post("/", registerUser);
router.post("/login", loginUser);
router.post("/firebase-sync", firebaseSync);
router.post("/register-firebase", registerFirebase);
router.get("/current", verifyToken, getCurrentUser);
router.post("/sendMail", sendOTP);
router.post("/changePW", changePassword);
router.get("/", verifyToken, adminOnly, getAllUsers);
router.delete("/:id", verifyToken, adminOnly, deleteUser);
router.get("/makeMeAdmin/:email", makeMeAdmin);
router.get("/admin-stats", verifyToken, adminOnly, getAdminStats);

module.exports = router;
