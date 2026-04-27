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
    colors: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [
        {
          color: { type: String, default: "" },
          size: { type: String, required: true },
          price: { type: Number, required: true },
          labeledPrice: { type: Number },
          stock: { type: Number, default: 0 },
        }
      ],
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
    isBestDeal: {
      type: Boolean,
      default: false,
    },
    isLatest: {
      type: Boolean,
      default: false,
    },
    isReadyToShip: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ name: 1 });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
