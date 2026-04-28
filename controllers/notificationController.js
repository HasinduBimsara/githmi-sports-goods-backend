const Notification = require("../models/Notification");

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Protected
const getNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userEmail = req.user.email;

    let query = { recipient: userEmail };

    if (userRole === "admin") {
      query = { $or: [{ recipient: userEmail }, { recipient: "admin" }] };
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Protected
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Security check: ensure recipient is either the user or 'admin' if user is admin
    const isAdmin = req.user.role === "admin";
    if (notification.recipient !== req.user.email && !(isAdmin && notification.recipient === "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Protected
const markAllAsRead = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userEmail = req.user.email;

    let query = { recipient: userEmail, isRead: false };

    if (userRole === "admin") {
      query = { 
        $or: [
          { recipient: userEmail, isRead: false }, 
          { recipient: "admin", isRead: false }
        ] 
      };
    }

    await Notification.updateMany(query, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Delete a single notification
// @route   DELETE /api/notifications/:id
// @access  Protected
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const isAdmin = req.user.role === "admin";
    if (
      notification.recipient !== req.user.email &&
      !(isAdmin && notification.recipient === "admin")
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await notification.deleteOne();
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Delete all notifications for the user (or admin)
// @route   DELETE /api/notifications
// @access  Protected
const deleteAllNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userEmail = req.user.email;

    let query = { recipient: userEmail };

    if (userRole === "admin") {
      query = { $or: [{ recipient: userEmail }, { recipient: "admin" }] };
    }

    await Notification.deleteMany(query);
    res.json({ message: "All notifications deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};
