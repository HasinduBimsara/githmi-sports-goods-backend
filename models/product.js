const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, "Product ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    altNames: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be positive"],
    },
    labeledPrice: {
      type: Number,
      required: [true, "Labeled price is required"],
      min: [0, "Labeled price must be positive"],
    },
    description: {
      type: String,
      default: "",
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      default: "General",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
