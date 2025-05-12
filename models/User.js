const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true },
  role: { type: String, enum: ["user", "shop_owner", "admin"], required: true, default: "user" },
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  gender: { type: String, enum: ["male", "female", "other"] },
  address: { type: String },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
  profilePhoto: { type: String, default: "" },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  isVerified: { type: Boolean, default: true },
  notificationToken: { type: String },
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

userSchema.pre('save', async function (next) {
  if (this.isNew && this.role === 'admin') {
    const existingAdmin = await mongoose.models.User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return next(new Error('Only one admin user is allowed.'));
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
