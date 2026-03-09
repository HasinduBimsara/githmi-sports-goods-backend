const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      default: "general",
    },
    name: {
      type: String,
      required: [true, "Reviewer name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
    },
    title: {
      type: String,
      default: "",
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5,
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "Verified Buyer",
    },
    isApproved: {
      type: Boolean,
      default: true, // Auto-approve; set false to require manual approval
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Review", reviewSchema);
