const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: String,
  completed: {
    type: Boolean,
    default: false
  },
  deadline: Date   // ✅ NEW FIELD
});

module.exports = mongoose.model("Task", taskSchema);