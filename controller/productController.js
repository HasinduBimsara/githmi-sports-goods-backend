const Products = require("../models/product");

const productController = {
  getProducts: async (req, res) => {
    try {
      const products = await Products.find();
      res.json(products);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  createProduct: async (req, res) => {
    try {
      const {
        product_id,
        title,
        price,
        description,
        content,
        images,
        category,
      } = req.body;
      if (!images) return res.status(400).json({ msg: "No image upload" });

      const product = await Products.findOne({ product_id });
      if (product)
        return res.status(400).json({ msg: "Product already exists." });

      const newProduct = new Products({
        product_id,
        title,
        price,
        description,
        content,
        images,
        category,
      });
      await newProduct.save();
      res.json({ msg: "Created a product" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = productController;
