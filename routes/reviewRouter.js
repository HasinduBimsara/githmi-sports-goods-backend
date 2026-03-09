const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const { verifyToken, adminOnly } = require("../middleware/auth");

// GET all approved reviews (public) or all reviews (admin)
router.get("/", async (req, res) => {
  try {
    const { productId, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Check if admin token provided
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          authHeader.split(" ")[1],
          process.env.JWT_SECRET,
        );
        if (decoded.role === "admin") isAdmin = true;
      } catch (_) {}
    }

    if (!isAdmin) filter.isApproved = true;
    if (productId) filter.productId = productId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      reviews,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET single review by ID
router.get("/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST create a review (protected)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { productId, title, comment, rating, avatar } = req.body;

    if (!productId || !title || !comment || !rating) {
      return res
        .status(400)
        .json({
          message: "productId, title, comment, and rating are required",
        });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Check if user already reviewed this product
    const existing = await Review.findOne({ productId, email: req.user.email });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    const review = new Review({
      productId,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      title,
      comment,
      rating,
      avatar: avatar || req.user.profilePicture || "",
      role: req.user.role,
      isApproved: false,
    });

    await review.save();
    res
      .status(201)
      .json({ message: "Review submitted and pending approval", review });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT approve/reject a review (admin only)
router.put("/:id/approve", verifyToken, adminOnly, async (req, res) => {
  try {
    const { isApproved } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true },
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({
      message: `Review ${isApproved ? "approved" : "rejected"}`,
      review,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT update own review (protected)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Only the owner or admin can update
    if (review.email !== req.user.email && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, comment, rating } = req.body;
    if (rating && (rating < 1 || rating > 5)) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (rating) review.rating = rating;
    review.isApproved = false; // Re-approval required after edit

    await review.save();
    res.json({ message: "Review updated and pending re-approval", review });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE a review (admin or owner)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.email !== req.user.email && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await review.deleteOne();
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
