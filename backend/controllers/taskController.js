const Task = require("../models/task");

// Get all tasks for logged-in user
exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, priority, sort } = req.query;

    // Build filter object
    let filter = { userId };

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }

    // Build sort object
    let sortBy = { createdAt: -1 };
    if (sort === "deadline") {
      sortBy = { deadline: 1 };
    } else if (sort === "priority") {
      sortBy = { priority: -1 };
    }

    const tasks = await Task.find(filter).sort(sortBy);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
  }
};

// Get single task
exports.getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const task = await Task.findOne({ _id: taskId, userId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error fetching task", error: error.message });
  }
};

// Create new task
exports.createTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, description, status, priority, deadline } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const task = new Task({
      userId,
      title,
      description: description || "",
      status: status || "pending",
      priority: priority || "medium",
      deadline: deadline || null
    });

    await task.save();
    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Error creating task", error: error.message });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const { title, description, status, priority, deadline, completed } = req.body;

    const task = await Task.findOne({ _id: taskId, userId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Update fields if provided
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (deadline !== undefined) task.deadline = deadline;
    if (completed !== undefined) {
      task.completed = completed;
      task.status = completed ? "completed" : task.status;
    }

    task.updatedAt = new Date();
    await task.save();

    res.json({ message: "Task updated successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error: error.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const task = await Task.findOneAndDelete({ _id: taskId, userId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error: error.message });
  }
};

// Toggle task completion
exports.toggleTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const task = await Task.findOne({ _id: taskId, userId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.completed = !task.completed;
    task.status = task.completed ? "completed" : "pending";
    task.updatedAt = new Date();

    await task.save();
    res.json({ message: "Task toggled successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Error toggling task", error: error.message });
  }
};
