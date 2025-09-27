const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    res.json({ message: "User registered", id: user._id });
  } catch {
    res.status(400).json({ message: "User exists" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await user.matchPassword(password)) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, username: user.username, id: user._id });
  } else {
    res.status(400).json({ message: "Invalid credentials" });
  }
});

// NEW: get all users except self
router.get("/users", authMiddleware, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user } }, "username");
  res.json(users);
});

module.exports = router;
