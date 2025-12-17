const router = require("express").Router();
const orderCtrl = require("../controller/orderController");
const auth = require("../middlewear/auth");

router
  .route("/")
  .get(auth, orderCtrl.getOrders)
  .post(auth, orderCtrl.createOrder);

module.exports = router;
