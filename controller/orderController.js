const Orders = require("../models/orders");

const orderController = {
  getOrders: async (req, res) => {
    try {
      const orders = await Orders.find();
      res.json(orders);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  createOrder: async (req, res) => {
    try {
      const user = await Users.findById(req.user.id).select("name email");
      if (!user) return res.status(400).json({ msg: "User not found." });

      const { cart, address } = req.body;
      const newOrder = new Orders({
        user_id: user._id,
        name: user.name,
        email: user.email,
        cart,
        address,
      });
      await newOrder.save();
      res.json({ msg: "Order placed successfully!" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = orderController;
