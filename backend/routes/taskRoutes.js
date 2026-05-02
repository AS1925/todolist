const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");

// All task routes require authentication
router.use(authMiddleware);

// Get all tasks with optional filtering
router.get("/", taskController.getAllTasks);

// Get specific task
router.get("/:taskId", taskController.getTaskById);

// Create new task
router.post("/", taskController.createTask);

// Update task
router.put("/:taskId", taskController.updateTask);

// Delete task
router.delete("/:taskId", taskController.deleteTask);

// Toggle task completion
router.patch("/:taskId/toggle", taskController.toggleTaskCompletion);

module.exports = router;