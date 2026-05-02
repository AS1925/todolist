const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Auth routes working" });
});

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/verify/:userId", authController.verifyEmail);

// Protected routes
router.get("/me", authMiddleware, authController.getCurrentUser);

module.exports = router;