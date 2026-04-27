const express = require("express");
const router = express.Router();
const { verifyToken, adminOnly } = require("../middlewares/auth");
const {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");

router.get("/", verifyToken, adminOnly, getAllOrders);
router.get("/my", verifyToken, getMyOrders);
router.post("/", verifyToken, createOrder);
router.put("/:orderId", verifyToken, adminOnly, updateOrderStatus);
router.delete("/:orderId", verifyToken, adminOnly, deleteOrder);
router.get("/:orderId", verifyToken, getOrderById);

module.exports = router;
