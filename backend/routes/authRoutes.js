const express = require("express");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");

// mail setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "YOUR_EMAIL@gmail.com",
    pass: "YOUR_APP_PASSWORD"
  }
});

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "User or email already exists" });
    }

    const user = new User({ username, email, password });
    await user.save();

    // send mail
    const link = `http://localhost:5000/auth/verify/${user._id}`;
    let mailSent = false;

    try {
      await transporter.sendMail({
        to: user.email,
        subject: "Verify your account",
        html: `<h2>Click to verify</h2><a href="${link}">Verify</a>`
      });
      mailSent = true;
    } catch (mailError) {
      console.error("Verification email failed:", mailError.message);
      // Auto-verify when email cannot be sent in local/dev mode
      user.verified = true;
      await user.save();
    }

    if (mailSent) {
      res.json({ message: "Verification email sent. Please check your email." });
    } else {
      res.json({ message: "Account created successfully. Email could not be sent, but your account is active." });
    }
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
});

// VERIFY
router.get("/verify/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { verified: true });
  res.send("Account verified ✅");
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.verified) {
      return res.status(400).json({ message: "Verify email first" });
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Update last login and login streak
    const now = new Date();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    let loginStreak = user.loginStreak || 0;

    // Check if it's a new day
    if (!lastLogin || (now.getDate() !== lastLogin.getDate())) {
      loginStreak += 1;
    }

    user.lastLogin = now;
    user.loginStreak = loginStreak;
    await user.save();

    res.json({
      message: "Login success",
      userId: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      loginStreak: user.loginStreak
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});
// UPDATE USER
router.put("/update/:id", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }

    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      userId: user._id,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});

module.exports = router;