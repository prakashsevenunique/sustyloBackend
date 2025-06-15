const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Blog",
    required: true
  },
  name: { type: String, required: true },
  email: { type: String },
  number: { type: String },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved"],
    default: "pending"
  },
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
