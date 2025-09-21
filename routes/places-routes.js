const express = require("express");
const { check } = require("express-validator");

const placeController = require("../controllers/place-controllers");
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get("/user/:userId", placeController.getPlacesByUserId);

router.get("/:placeId", placeController.getPlaceByPlaceId);

router.use(checkAuth);

router.post(
  "/",
  fileUpload.single('image'),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placeController.createPlace
);
router.get("/", placeController.homeFunction);
router.patch(
  "/:placeId",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placeController.updatePlaceById
);

router.delete("/:placeId", placeController.deletePlaceById);

module.exports = router;
