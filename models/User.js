const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true },
  role: { type: String, enum: ["user", "shop_owner", "admin"], required: true },
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  gender: { type: String, enum: ["male", "female", "other"] },
  address: { type: String },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  referralCode: { type: String, unique: true }, // ✅ Referral Code Field
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ Referrer User Reference
});

module.exports = mongoose.model("User", userSchema);
