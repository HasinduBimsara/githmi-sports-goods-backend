const express = require("express");
const router = express.Router();
const { verifyToken, adminOnly } = require("../middlewear/auth");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controller/productController");

router.get("/", getProducts);
router.get("/:productId", getProductById);
router.post("/", verifyToken, adminOnly, createProduct);
router.put("/:productId", verifyToken, adminOnly, updateProduct);
router.delete("/:productId", verifyToken, adminOnly, deleteProduct);

module.exports = router;
