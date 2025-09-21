const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const User = require("../models/user");

const DUMMY_USERS = [
  {
    id: "u1",
    name: "Fahad Taj",
    email: "fahadtaj909@gmail.com",
    password: "FAHADtaj",
  },
  {
    id: "u2",
    name: "Aasif Ali",
    email: "aasif.21ali@gmail.com",
    password: "AasifFootballer",
  },
];

const loginController = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials", 401));
  }

  let isValid = false;
  try {
    isValid = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials",
      500
    );
    return next(error);
  }

  if (!isValid) {
    const error = new HttpError(
      "Could not log you in, please check your credentials",
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email, token: token },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new HttpError("Could not log you in, please try again", 500));
  }

  res.json({
    message: "Logged in successfully",
    userId: existingUser.id,
    email: existingUser.email,
    token: token
  });
};

const signupController = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError(
        "Invalid input. Check your email. Also note that minimum password length is 5",
        422
      )
    );
  }

  console.log(req.body);
  const { name, email, password } = req.body;
  const error = new HttpError("Failed to signup, please try again", 422);

  try {
    await User.findOne({ email: email });
  } catch (err) {
    return next(err);
  }

  const image =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9Kjg25CncBl1K4iuq0ofmc2zn3VS5eQ7WqA&s"; // Static image

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError("Could not create user, please try again", 500));
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    // Duplicate key error
    if (err.code === 11000) {
      return next(
        new HttpError("Email already exists. Please use a different one.", 422)
      );
    }
    return next(new HttpError("Failed to signup, please try again.", 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.userId, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("Email already exists. Please use a different one.", 422)
    );
  }

  res.status(201).json({
    message: "Signed up successfully!",
    email: createdUser.email,
    userId: createdUser.id,
    token: token,
  });
};

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    // await User.find({}, 'name email'); This also works
    return next(
      new HttpError("Fetching users failed, please try again later", 500)
    );
  }
  res.json({ users: users.map((u) => u.toObject({ getters: true })) });
};

exports.loginController = loginController;
exports.signupController = signupController;
exports.getUsers = getUsers;
