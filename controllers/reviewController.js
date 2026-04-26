const Review = require("../models/Review");
const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");

// @desc    Get all reviews (approved for public, all for admin)
// @route   GET /api/reviews
// @access  Public / Admin
const getReviews = async (req, res) => {
  try {
    const { productId, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Detect admin from optional token
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
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
};

// @desc    Get single review by ID
// @route   GET /api/reviews/:id
// @access  Public
const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Submit a review
// @route   POST /api/reviews
// @access  Protected
const createReview = async (req, res) => {
  try {
    const { productId, title, comment, rating, avatar } = req.body;

    if (!productId || !title || !comment || !rating)
      return res
        .status(400)
        .json({
          message: "productId, title, comment, and rating are required",
        });

    if (rating < 1 || rating > 5)
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const reviewEmail = req.user.email;
    const reviewName = `${req.user.firstName} ${req.user.lastName}`.trim();

    const existing = await Review.findOne({ productId, email: reviewEmail });
    if (existing)
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });

    const review = await Review.create({
      productId,
      name: reviewName,
      email: reviewEmail,
      title,
      comment,
      rating,
      avatar: avatar || req.user?.profilePicture || "",
      role: req.user?.role || "Customer",
      isApproved: true,
    });

    res
      .status(201)
      .json({ message: "Review submitted successfully", review });

    // Create Notification for Admin (non-blocking)
    Notification.create({
      recipient: "admin",
      title: "New Product Review",
      message: `${reviewName} left a ${rating}-star review for product ${productId}.`,
      type: "system",
      link: "/admin/reviews",
    }).catch(err => console.error("Notification error:", err));

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Approve or reject a review
// @route   PUT /api/reviews/:id/approve
// @access  Admin
const approveReview = async (req, res) => {
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
};

// @desc    Update own review
// @route   PUT /api/reviews/:id
// @access  Protected (owner or admin)
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.email !== req.user.email && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized" });

    const { title, comment, rating, image } = req.body;

    if (rating && (rating < 1 || rating > 5))
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });

    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (rating) review.rating = rating;
    if (image !== undefined && req.user.role === "admin") review.image = image;
    
    // Only resets approval if non-admin is updating their own comment, etc.
    if (req.user.role !== "admin") {
      review.isApproved = false; // Requires re-approval after edit
    }

    await review.save();

    res.json({ message: "Review updated and pending re-approval", review });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Protected (owner or admin)
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.email !== req.user.email && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized" });

    await review.deleteOne();

    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getReviews,
  getReviewById,
  createReview,
  approveReview,
  updateReview,
  deleteReview,
};
