const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require("../utils/sendMail");


// @desc    Get all orders
// @route   GET /api/order
// @access  Admin
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { isHidden: { $ne: true } };
    if (status) filter.status = status;

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
    const orders = await Order.find({ 
      email: req.user.email, 
      isHidden: { $ne: true } 
    }).sort({
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
    const order = await Order.findOne({ 
      orderId: req.params.orderId, 
      isHidden: { $ne: true } 
    });
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
    const { name, address, phoneNumber } = req.body;
    const items = req.body.items || req.body.billItems;

    if (!name || !address || !phoneNumber || !items?.length)
      return res.status(400).json({
        message:
          "name, address, phoneNumber, and at least one order item are required",
      });

    // Build bill items from server-side product data
    let total = 0;
    const billItems = [];

    for (const item of items) {
      const { productId, quantity, size, color } = item;

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

      // Check variant stock if size/color specified, else check global stock
      if (size || color) {
        const variant = product.sizes.find(s => 
          (s.size === size || (!s.size && !size)) && 
          (s.color === (color || "") || (!s.color && !color))
        );
        if (variant && variant.stock < quantity) {
           return res.status(400).json({ message: `Insufficient variant stock for: ${product.name} (${color} ${size})` });
        } else if (!variant && product.stock < quantity) {
           // Fallback to global if variation mapping doesn't exist but global exists
           return res.status(400).json({ message: `Insufficient stock for: ${product.name}` });
        }
      } else if (product.stock < quantity) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for: ${product.name}` });
      }

      const itemTotal = product.price * quantity;
      total += itemTotal;

      billItems.push({
        productId: product.productId,
        productName: product.name,
        image: product.images[0] || "",
        quantity,
        price: product.price,
        size: size || "",
        color: color || "",
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

    // NOTE: Stock deduction is now deferred until the order is marked as 'Delivered' 
    // to ensure inventory levels reflect finalized sales, per user requirements.

    // Send confirmation email (non-blocking)
    sendOrderConfirmationEmail(req.user.email, order).catch((err) =>
      console.error("Email error:", err.message),
    );

    // Create Notification for Admin
    await Notification.create({
      recipient: "admin",
      title: "New Order Placed",
      message: `A new order (${order.orderId}) has been placed by ${name}.`,
      type: "new_order",
      link: `/admin/orders`,
    });

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

    // Logic for Stock Management based on status transitions
    if (status === "Delivered" && previousStatus !== "Delivered") {
      // 1. DEDUCT stock when moving TO Delivered (and INCREMENT soldCount)
      for (const item of order.billItems) {
        const product = await Product.findOne({ productId: item.productId });
        if (product) {
          product.stock = Math.max(0, product.stock - item.quantity);
          product.soldCount = (product.soldCount || 0) + item.quantity;
          
          if (item.size || item.color) {
            const variantIndex = product.sizes.findIndex(s => 
               s.size === item.size && (s.color === (item.color || ""))
            );
            if (variantIndex !== -1) {
              product.sizes[variantIndex].stock = Math.max(0, product.sizes[variantIndex].stock - item.quantity);
            }
          }
          await product.save();
        }
      }
    } else if (status !== "Delivered" && previousStatus === "Delivered") {
      // 2. RESTORE stock when moving AWAY FROM Delivered (and DECREMENT soldCount)
      for (const item of order.billItems) {
        const product = await Product.findOne({ productId: item.productId });
        if (product) {
          product.stock += item.quantity;
          product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
          
          if (item.size || item.color) {
            const variantIndex = product.sizes.findIndex(s => 
               s.size === item.size && (s.color === (item.color || ""))
            );
            if (variantIndex !== -1) {
              product.sizes[variantIndex].stock += item.quantity;
            }
          }
          await product.save();
        }
      }
    }

    // Send status update email to customer (non-blocking)
    console.log(`[Email] Sending '${order.status}' status email to: ${order.email}`);
    sendOrderStatusEmail(order.email, order)
      .then(() => console.log(`[Email] Status email sent successfully to ${order.email}`))
      .catch((err) => console.error(`[Email] Failed to send status email to ${order.email}:`, err.message));

    // Create Notification for Customer
    await Notification.create({
      recipient: order.email,
      title: "Order Status Updated",
      message: `Your order (${order.orderId}) is now ${status}.`,
      type: "order_update",
      link: `/orders`,
    });

    res.json({ message: "Order status updated", order });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Delete (hide) an order
// @route   DELETE /api/order/:orderId
// @access  Admin
const deleteOrder = async (req, res) => {
  try {
    console.log("Attempting to delete order:", req.params.orderId);
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      console.log("Order not found:", req.params.orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    order.isHidden = true;
    await order.save();

    res.json({ message: "Order removed from dashboard and history" });
  } catch (err) {
    console.error("Delete order error:", err);
    res.status(500).json({ message: "Server error during removal", error: err.message });
  }
};

module.exports = {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};
