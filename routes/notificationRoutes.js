const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require("../controllers/notificationController");
const { verifyToken } = require("../middlewares/auth");

router.get("/", verifyToken, getNotifications);
router.put("/read-all", verifyToken, markAllAsRead);
router.put("/:id/read", verifyToken, markAsRead);
router.delete("/", verifyToken, deleteAllNotifications);
router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;

