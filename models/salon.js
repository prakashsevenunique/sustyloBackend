const mongoose = require("mongoose");

// Owner Schema
const ownerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  otp: String,
  otpExpiry: Date,
  panCard: { type: String, required: true },
  aadhar: { type: String, required: true },
  bankDetails: {
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    bankName: { type: String, required: true },
  },
  photos: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

// Salon Schema
const salonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
  location: { type: String, required: true },
  locationMapUrl: { type: String },
  services: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "unisex"], required: true },
  }],
  gstNumber: { type: String },
  salonAgreement: { type: String },
  photos: [{ type: String }],
  status: { type: String, enum: ["pending", "approved"], default: "pending" }, // Admin must approve
  createdAt: { type: Date, default: Date.now },
});

const Owner = mongoose.model("Owner", ownerSchema);
const Salon = mongoose.model("Salon", salonSchema);

module.exports = { Owner, Salon };
