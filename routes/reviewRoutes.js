const express = require("express");
const router = express.Router();
const { verifyToken, adminOnly } = require("../middlewares/auth");
const {
  getReviews,
  getReviewById,
  createReview,
  approveReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");

router.get("/", getReviews);
router.get("/:id", getReviewById);
router.post("/", verifyToken, createReview);
router.put("/:id/approve", verifyToken, adminOnly, approveReview);
router.put("/:id", verifyToken, updateReview);
router.delete("/:id", verifyToken, deleteReview);

module.exports = router;
