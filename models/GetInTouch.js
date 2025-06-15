const mongoose = require("mongoose");

const getInTouchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  type: {
    type: String,
    enum: ["user", "salonOwner"],
    required: true
  },
  status: {
    type: String,
    enum: ["unresolved", "resolved"],
    default: "unresolved"
  }
}, { timestamps: true });

module.exports = mongoose.model("GetInTouch", getInTouchSchema);
