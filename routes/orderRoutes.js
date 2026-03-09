const express = require("express");
const router = express.Router();
const { verifyToken, adminOnly } = require("../middleware/auth");
const {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
} = require("../controllers/orderController");

router.get("/", verifyToken, adminOnly, getAllOrders);
router.get("/my", verifyToken, getMyOrders);
router.post("/", verifyToken, createOrder);
router.put("/:orderId", verifyToken, adminOnly, updateOrderStatus);
router.get("/:orderId", verifyToken, getOrderById);

module.exports = router;
