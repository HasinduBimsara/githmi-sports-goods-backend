const Product = require("../models/product");

// @desc    Get all products (with search, filter, pagination)
// @route   GET /api/product
// @access  Public
const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12,
    } = req.query;
    const filter = { isActive: true };

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { altNames: regex }, { productId: regex }];
    }

    if (category) filter.category = category;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      products,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get a single product by productId
// @route   GET /api/product/:productId
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      productId: req.params.productId.toUpperCase(),
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Create a new product
// @route   POST /api/product
// @access  Admin
const createProduct = async (req, res) => {
  try {
    const { productId, name, price, stock, category, images } = req.body;

    if (
      !productId ||
      !name ||
      !price ||
      stock === undefined ||
      !category ||
      !images?.length
    )
      return res.status(400).json({
        message:
          "productId, name, price, stock, category, and at least one image are required",
      });

    const existing = await Product.findOne({
      productId: productId.toUpperCase(),
    });
    if (existing)
      return res.status(400).json({ message: "Product ID already exists" });

    const product = await Product.create({
      ...req.body,
      productId: productId.toUpperCase(),
    });

    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Update a product
// @route   PUT /api/product/:productId
// @access  Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { productId: req.params.productId.toUpperCase() },
      req.body,
      { new: true, runValidators: true },
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/product/:productId
// @access  Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      productId: req.params.productId.toUpperCase(),
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
