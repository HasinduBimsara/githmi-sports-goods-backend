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
} = require("../controller/userController");

router.post("/", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.get("/current", verifyToken, getCurrentUser);
router.post("/sendMail", sendOTP);
router.post("/changePW", changePassword);
router.get("/", verifyToken, adminOnly, getAllUsers);
router.delete("/:id", verifyToken, adminOnly, deleteUser);

module.exports = router;
