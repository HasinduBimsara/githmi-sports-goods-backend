const router = require("express").Router();
const productCtrl = require("../controller/productController");

router.route("/").get(productCtrl.getProducts).post(productCtrl.createProduct);

module.exports = router;
