const mongoose = require("mongoose");

const SalonSchema = new mongoose.Schema({
  ownerName: { type: String, required: true },
  salonName: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  salonAddress: { type: String, required: true },
  latitude: { type: Number },  // ✅ Add this if missing
  longitude: { type: Number }, // ✅ Add this if missing
  status: { type: String, enum: ["pending", "approved"], default: "pending" },
  services: [
    {
      name: String,
      rate: Number,
      duration: String,
      gender: { type: String, enum: ["male", "female", "unisex"] }
    },
  ],
  locationMapUrl: { type: String },
  gstNumber: { type: String },
  salonAgreement: { type: String },
  salonPhotos: [String],
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  ownerAadhar: { type: String },
  ownerPan: { type: String },
  category: { type: String },  // Optional field for salon category (e.g., "beauty", "hair", etc.)
}, { timestamps: true });

module.exports = mongoose.model("Salon", SalonSchema);
