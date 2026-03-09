const Order = require("../models/Order");
const Product = require("../models/product");
const { sendOrderConfirmationEmail } = require("../utils/sendMail");

// @desc    Get all orders
// @route   GET /api/order
// @access  Admin
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      orders,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get current user's orders
// @route   GET /api/order/my
// @access  Protected
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ email: req.user.email }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get a single order by orderId
// @route   GET /api/order/:orderId
// @access  Protected (owner or admin)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = order.email === req.user.email;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin)
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Place a new order
// @route   POST /api/order
// @access  Protected
const createOrder = async (req, res) => {
  try {
    const { name, address, phoneNumber, items } = req.body;

    if (!name || !address || !phoneNumber || !items?.length)
      return res.status(400).json({
        message: "name, address, phoneNumber, and items are required",
      });

    // Build bill items from server-side product data
    let total = 0;
    const billItems = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity < 1)
        return res.status(400).json({ message: `Invalid item: ${productId}` });

      const product = await Product.findOne({
        productId: productId.toUpperCase(),
        isActive: true,
      });
      if (!product)
        return res
          .status(404)
          .json({ message: `Product not found: ${productId}` });

      if (product.stock < quantity)
        return res
          .status(400)
          .json({ message: `Insufficient stock for: ${product.name}` });

      const itemTotal = product.price * quantity;
      total += itemTotal;

      billItems.push({
        productId: product.productId,
        productName: product.name,
        image: product.images[0] || "",
        quantity,
        price: product.price,
      });
    }

    // Save order
    const order = await Order.create({
      email: req.user.email,
      name,
      address,
      phoneNumber,
      billItems,
      total,
      status: "Pending",
      date: new Date(),
    });

    // Deduct stock for each item
    for (const item of items) {
      await Product.findOneAndUpdate(
        { productId: item.productId.toUpperCase() },
        { $inc: { stock: -item.quantity } },
      );
    }

    // Send confirmation email (non-blocking)
    sendOrderConfirmationEmail(req.user.email, order).catch((err) =>
      console.error("Email error:", err.message),
    );

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Update order status
// @route   PUT /api/order/:orderId
// @access  Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Processing", "Delivered", "Cancelled"];

    if (!validStatuses.includes(status))
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    // Restore stock if cancelled
    if (status === "Cancelled" && previousStatus !== "Cancelled") {
      for (const item of order.billItems) {
        await Product.findOneAndUpdate(
          { productId: item.productId },
          { $inc: { stock: item.quantity } },
        );
      }
    }

    res.json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
};
