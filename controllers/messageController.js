const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { sendReplyEmail } = require("../utils/sendMail");


// @desc    Create a new message
// @route   POST /api/messages
// @access  Public
const createMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    const newMessage = await Message.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    res.status(201).json({ message: "Message sent successfully", data: newMessage });

    // Create Notification for Admin (non-blocking)
    Notification.create({
      recipient: "admin",
      title: "New Message Received",
      message: `You have a new message from ${name} (${subject}).`,
      type: "message",
      link: "/admin/messages",
    }).catch(err => console.error("Notification error:", err));

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private/Admin
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.status(200).json({ count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Mark message as read/unread
// @route   PUT /api/messages/:id/status
// @access  Private/Admin
const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!["Unread", "Read"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.status(200).json({ message: "Status updated", data: message });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private/Admin
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reply to a message via email
// @route   POST /api/messages/:id/reply
// @access  Private/Admin
const replyToMessage = async (req, res) => {
  try {
    const { replyMessage } = req.body;
    if (!replyMessage) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const messageRecord = await Message.findById(req.params.id);
    if (!messageRecord) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Send the email
    await sendReplyEmail(
      messageRecord.email,
      messageRecord.name,
      messageRecord.subject,
      replyMessage
    );

    // Mark as read automatically when replied
    messageRecord.status = "Read";
    await messageRecord.save();

    res.status(200).json({ message: "Reply sent successfully", data: messageRecord });
  } catch (error) {
    res.status(500).json({ message: "Failed to send email reply", error: error.message });
  }
};

module.exports = {
  createMessage,
  getMessages,
  updateMessageStatus,
  deleteMessage,
  replyToMessage,
};
