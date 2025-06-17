const mongoose = require("mongoose");

// Reply Schema with timestamps and optional author info
const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    author: {
      name: { type: String, default: "Admin" }, // Optional: who replied
      role: { type: String, enum: ["admin", "user"], default: "admin" }
    }
  },
  { timestamps: true }
);

// Comment Schema with timestamps
const commentSchema = new mongoose.Schema(
  {
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
    replies: [replySchema]
  },
  { timestamps: true }
);

// Prevent OverwriteModelError in dev
module.exports = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
