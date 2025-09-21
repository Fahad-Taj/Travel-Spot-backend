const express = require("express");
const { check } = require("express-validator");

const fileUpload = require("../middleware/file-upload.js");
const userController = require("../controllers/user-controllers.js");

const router = express.Router();

router.post(
  "/signup",
  fileUpload.single("image"), // image is the key of the incoming request that contains the image file
  [
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 5 }),
  ],
  userController.signupController
);
router.post("/login", userController.loginController);
router.get("/", userController.getUsers);

module.exports = router;
