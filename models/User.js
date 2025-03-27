const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  otp: String,
  otpExpiry: Date,
  role: { type: String, enum: ["user", "shop_owner", "admin"], required: true },
  gender: String,
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  name: { type: String }, // Optional during registration
  email: { type: String, unique: true}, // ✅ Fix for duplicate null issue
  address: String,  // Optional field for address
});

module.exports = mongoose.model("User", userSchema);
