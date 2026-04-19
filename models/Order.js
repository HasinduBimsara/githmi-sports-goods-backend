const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  image: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  size: { type: String, default: "" },
  color: { type: String, default: "" },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Customer email is required"],
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
    },
    address: {
      type: String,
      required: [true, "Delivery address is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Delivered", "Cancelled"],
      default: "Pending",
    },
    billItems: {
      type: [billItemSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Order must have at least one item",
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

orderSchema.index({ email: 1 });
orderSchema.index({ status: 1 });

// Auto-generate orderId before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderId = `ORD${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
