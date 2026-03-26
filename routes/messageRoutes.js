const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessages,
  updateMessageStatus,
  deleteMessage,
  replyToMessage,
} = require("../controller/messageController");

const { verifyToken, adminOnly } = require("../middlewear/auth");

router.post("/", createMessage);
router.get("/", verifyToken, adminOnly, getMessages);
router.put("/:id/status", verifyToken, adminOnly, updateMessageStatus);
router.post("/:id/reply", verifyToken, adminOnly, replyToMessage);
router.delete("/:id", verifyToken, adminOnly, deleteMessage);

module.exports = router;
