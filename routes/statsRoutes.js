const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Review = require("../models/Review");

// @route   GET /api/stats
// @desc    Get aggregate platform statistics
// @access  Public (for splash page)
router.get("/", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    
    const premiumProducts = await Product.countDocuments({ 
      $or: [{ isBestDeal: true }, { isPremium: true }] 
    });
    
    const reviewStats = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);
    
    let satisfaction = 95; // Default baseline if no reviews
    if (reviewStats.length > 0 && reviewStats[0].avgRating) {
      satisfaction = Math.round((reviewStats[0].avgRating / 5) * 100);
    }
    
    res.json({
      users: userCount || 0,
      products: productCount || 0,
      brands: premiumProducts || 0, 
      satisfaction: satisfaction
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Server Error", users: 0, products: 0, brands: 0, satisfaction: 0 });
  }
});

module.exports = router;
