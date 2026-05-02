const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_jwt_secret_key";
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "Yes" : "Using fallback");

// Email transporter setup
let transporter;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const hasValidCredentials = emailUser && emailPass && 
                            emailUser.toLowerCase() !== "your_email@gmail.com" && 
                            emailPass !== "your_app_password_here" &&
                            emailPass !== "YOUR_APP_PASSWORD";

if (hasValidCredentials) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
  console.log("✅ Email verification enabled");
} else {
  transporter = null;
  console.log("📧 Email verification disabled (Development mode)");
}

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

// Sign Up
exports.signup = async (req, res) => {
  try {
    console.log("[1] Signup started");
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("[2] Validation passed");

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    console.log("[3] Password match check passed");

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    console.log("[4] User existence check passed");

    // Create new user (password will be hashed by Mongoose pre-save hook)
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      verified: !hasValidCredentials // Auto-verify in dev mode
    });

    console.log("[6] User object created");

    await user.save();

    console.log("[7] User saved to database");

    // Send verification email if email is configured
    if (hasValidCredentials) {
      try {
        await transporter.sendMail({
          from: emailUser,
          to: email,
          subject: "Email Verification",
          html: `<p>Please verify your email by clicking <a href="http://localhost:5000/auth/verify/${user._id}">here</a></p>`
        });
      } catch (emailError) {
        console.log("Email sending failed, but user created:", emailError.message);
      }
    }

    console.log("[8] Before generateToken, JWT_SECRET =", JWT_SECRET);

    const token = generateToken(user._id);

    console.log("[9] Token generated successfully");

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error("[ERROR] Signup error:", error.message, error.stack);
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.verified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    // Update login streak based on last login date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let loginStreak = user.loginStreak || 0;

    if (!user.lastLogin) {
      loginStreak = 1;
    } else {
      const lastLoginDate = new Date(user.lastLogin);
      const lastLoginDay = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate());
      const diffDays = Math.round((today - lastLoginDay) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        loginStreak += 1;
      } else if (diffDays > 1) {
        loginStreak = 1;
      }
    }

    user.lastLogin = now;
    user.loginStreak = loginStreak;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        loginStreak: user.loginStreak
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { verified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Email verified successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Verification failed", error: error.message });
  }
};

// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
};
