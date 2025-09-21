const fs = require("fs");

const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");

const mongoose = require("mongoose");
const Place = require("../models/place");
const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const User = require("../models/user");

// const getPlacesByUserId = async (req, res, next) => {
//   const userId = req.params.userId;
//   const error = new HttpError("Could not find a place for the give user id", 404);

//   let places;
//   try {
//     places = await Place.find({ creator: userId });
//   } catch (err) {
//     return next(error);
//   }

//   if (!places) {
//     return next(
//       new HttpError("Could not find a place with the given user id", 404)
//     );
//   }
//   res.send({ place: places.map(p => p.toObject({getters: true})) });
// };

// Alternative method
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (error) {
    return next(new HttpError("User does not exist", 404));
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(new HttpError("User does not contain any places", 422));
  }
  res.json({
    places: userWithPlaces.places.map((p) => p.toObject({ getters: true })),
  });
};

const getPlaceByPlaceId = async (req, res, next) => {
  console.log("Function triggered !");
  const placeId = req.params.placeId;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(new HttpError("Something went wrong", 50));
  }
  // Do not remove the second error
  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided place id", 404)
    );
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const homeFunction = (req, res, next) => {
  res.json({ message: "It works!" });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Inputs are in-valid", 422));
  }

  const { title, description, address } = req.body; // Object destructuring

  console.log("Request body: " + address);
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(createdPlace.creator);
  } catch (err) {
    return next(
      new HttpError("Creating place failed, please try again later", 500)
    );
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  console.log(user);

  try {
    // MongoDB session
    // 2 separate operations but even if one fails indepedently of another, both should
    // be considered invalid
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace); // mongoose will establish a connection between the models behind the scenes
    // Only adds the places id behind the scenes.
    await user.save({ session: sess });
    await sess.commitTransaction();
    // All changes will be rolled back by mongodb if any one operation fails
  } catch (error) {
    return next(new HttpError(error, 500));
  }

  res.status(200).json({ place: createdPlace });
};

const updatePlaceById = async (req, res, next) => {
  const userId = req.userId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Inputs are in-valid", 422));
  }

  const placeId = req.params.placeId;
  const { title, description } = req.body;
  const error = new HttpError(
    "Could not find a update the place with the given placeId",
    404
  );

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(error);
  }

  if (place.creator.toString() !== userId) {
    const newError = new HttpError(
      "You are not allowed to edit this place",
      401
    );
    return next(newError);
  }

  place.title = title;
  place.description.description;

  try {
    await place.save();
  } catch (err) {
    return next(error);
  }

  res.json({ message: "Place updated successfully" });
};

const deletePlaceById = async (req, res, next) => {
  const userId = req.userId;
  const placeId = req.params.placeId;
  let place;
  // Find the place
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    // Imp method, allows this document to access related documents
    return next(
      new HttpError("Something went wrong while fetching place", 500)
    );
  }
  if (!place) {
    return next(new HttpError("Could not find the given place", 404));
  }
  // Find the user who created this place
  let user;
  try {
    user = await User.findById(place.creator);
    if(user.id.toString() !== userId){
      const newError = new HttpError("You are not allowed to delete this place", 401);
      return next(newError);
    }
  } catch (err) {
    return next(new HttpError("Something went wrong while fetching user", 500));
  }
  if (!user) {
    return next(new HttpError("Could not find user", 422));
  }

  const imagePath = place.image;

  try {
    // Start a session and a transaction, delete the place and remove it from the User document
    // Commit the transaction
    const sess = await mongoose.startSession();
    console.log("Session started");
    sess.startTransaction();
    console.log("Transaction started");
    await place.deleteOne({ session: sess });
    console.log("Place deleted");
    await place.creator.places.pull(place);
    console.log("Place removed from User document");
    await place.creator.save({ session: sess });
    console.log("New User saved");
    await sess.commitTransaction();
    console.log("Transaction committed");
    sess.endSession();
    console.log("Session ended");
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong while performing the transaction",
        500
      )
    );
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.json({ message: "Place deleted successfully" });
};

exports.getPlaceByPlaceId = getPlaceByPlaceId;
exports.getPlacesByUserId = getPlacesByUserId;
exports.homeFunction = homeFunction;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlaceById = deletePlaceById;
