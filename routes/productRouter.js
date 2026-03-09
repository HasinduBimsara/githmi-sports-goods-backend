const express = require("express");
const router = express.Router();

const Product = require("../models/Product");
const { verifyToken, adminOnly } = require("../middleware/auth");

// ──────────────────────────────────────────
// GET /api/product
// Get all products (Public) with optional search
// ──────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 100,
    } = req.query;

    const query = { isActive: true };

    // Text search across name, altNames, productId
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { altNames: { $elemMatch: { $regex: search, $options: "i" } } },
        { productId: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      query.category = { $regex: category, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// ──────────────────────────────────────────
// GET /api/product/:productId
// Get a single product by productId (Public)
// ──────────────────────────────────────────
router.get("/:productId", async (req, res) => {
  try {
    const product = await Product.findOne({
      productId: req.params.productId.toUpperCase(),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

// ──────────────────────────────────────────
// POST /api/product
// Add a new product (Admin only)
// ──────────────────────────────────────────
router.post("/", verifyToken, adminOnly, async (req, res) => {
  try {
    const {
      productId,
      name,
      altNames,
      price,
      labeledPrice,
      description,
      stock,
      images,
      category,
    } = req.body;

    if (!productId || !name || !price || !labeledPrice) {
      return res.status(400).json({
        message: "Product ID, name, price, and labeled price are required",
      });
    }

    // Check duplicate productId
    const existing = await Product.findOne({
      productId: productId.toUpperCase(),
    });
    if (existing) {
      return res.status(400).json({ message: "Product ID already exists" });
    }

    const product = new Product({
      productId: productId.toUpperCase(),
      name,
      altNames: Array.isArray(altNames) ? altNames : [],
      price: Number(price),
      labeledPrice: Number(labeledPrice),
      description: description || "",
      stock: Number(stock) || 0,
      images: Array.isArray(images) ? images : [],
      category: category || "General",
    });

    await product.save();
    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// ──────────────────────────────────────────
// PUT /api/product/:productId
// Update a product (Admin only)
// ──────────────────────────────────────────
router.put("/:productId", verifyToken, adminOnly, async (req, res) => {
  try {
    const {
      name,
      altNames,
      price,
      labeledPrice,
      description,
      stock,
      images,
      category,
    } = req.body;

    const product = await Product.findOneAndUpdate(
      { productId: req.params.productId.toUpperCase() },
      {
        $set: {
          name,
          altNames: Array.isArray(altNames) ? altNames : [],
          price: Number(price),
          labeledPrice: Number(labeledPrice),
          description,
          stock: Number(stock),
          images: Array.isArray(images) ? images : [],
          category: category || "General",
        },
      },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
});

// ──────────────────────────────────────────
// DELETE /api/product/:productId
// Delete a product (Admin only)
// ──────────────────────────────────────────
router.delete("/:productId", verifyToken, adminOnly, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      productId: req.params.productId.toUpperCase(),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product" });
  }
});

module.exports = router;
