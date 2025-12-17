const router = require("express").Router();
const userCtrl = require("../controller/userController");
const auth = require("../middlewear/auth");

router.post("/register", userCtrl.register);
router.post("/login", userCtrl.login);
router.get("/infor", auth, userCtrl.getUser);

module.exports = router;
