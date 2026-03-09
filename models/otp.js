const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    // TTL index: MongoDB auto-deletes expired OTPs
    index: { expires: 0 },
  },
});

module.exports = mongoose.model("OTP", otpSchema);
