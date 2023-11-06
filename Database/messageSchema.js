const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.ObjectId,
    required: true,
  },
  receiverId: {
    type: mongoose.ObjectId,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  read: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("message", messageSchema);
