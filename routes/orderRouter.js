const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");
const { verifyToken, adminOnly } = require("../middleware/auth");
const { sendOrderConfirmationEmail } = require("../utils/sendMail");

// ──────────────────────────────────────────
// GET /api/order
// Get all orders (Admin only)
// ──────────────────────────────────────────
router.get("/", verifyToken, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ──────────────────────────────────────────
// GET /api/order/my
// Get orders of logged-in customer (Protected)
// ──────────────────────────────────────────
router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ email: req.user.email }).sort({
      date: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your orders" });
  }
});

// ──────────────────────────────────────────
// POST /api/order
// Place a new order (Protected customer)
// ──────────────────────────────────────────
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, address, phoneNumber, billItems } = req.body;

    // Validate required fields
    if (
      !name ||
      !address ||
      !phoneNumber ||
      !billItems ||
      billItems.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "All order details are required" });
    }

    // ── Build full bill items by looking up products ──
    const populatedItems = [];
    let total = 0;

    for (const item of billItems) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res
          .status(400)
          .json({
            message: `Invalid item data for productId: ${item.productId}`,
          });
      }

      const product = await Product.findOne({
        productId: item.productId.toUpperCase(),
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          message: `Product "${item.productId}" not found or is unavailable`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Only ${product.stock} left.`,
        });
      }

      populatedItems.push({
        productId: product.productId,
        productName: product.name,
        image: product.images[0] || "",
        quantity: item.quantity,
        price: product.price,
      });

      total += product.price * item.quantity;
    }

    // ── Create the order ──
    const order = new Order({
      email: req.user.email,
      name,
      address,
      phoneNumber,
      billItems: populatedItems,
      total,
    });

    await order.save();

    // ── Deduct stock after successful order ──
    for (const item of populatedItems) {
      await Product.updateOne(
        { productId: item.productId },
        { $inc: { stock: -item.quantity } },
      );
    }

    // ── Send confirmation email (non-blocking) ──
    sendOrderConfirmationEmail(req.user.email, order).catch((err) =>
      console.error("Order email error:", err.message),
    );

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order.orderId,
    });
  } catch (error) {
    console.error("Place order error:", error);
    res
      .status(500)
      .json({ message: "Failed to place order. Please try again." });
  }
});

// ──────────────────────────────────────────
// PUT /api/order/:orderId
// Update order status (Admin only)
// ──────────────────────────────────────────
router.put("/:orderId", verifyToken, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["Pending", "Processing", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { $set: { status } },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If cancelled — restore stock
    if (status === "Cancelled") {
      for (const item of order.billItems) {
        await Product.updateOne(
          { productId: item.productId },
          { $inc: { stock: item.quantity } },
        );
      }
    }

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

// ──────────────────────────────────────────
// GET /api/order/:orderId
// Get single order details (Admin or owner)
// ──────────────────────────────────────────
router.get("/:orderId", verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only admin or the order owner can view
    if (req.user.role !== "admin" && order.email !== req.user.email) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

module.exports = router;
