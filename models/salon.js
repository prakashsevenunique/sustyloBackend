const mongoose = require("mongoose");

// Subdocument for user reviews
const ReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Main Salon Schema
const SalonSchema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true },
    salonName: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    salonAddress: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    status: { type: String, enum: ["pending", "approved"], default: "pending" },
    services: [
      {
        name: String,
        rate: Number,
        duration: String,
        gender: { type: String, enum: ["male", "female", "unisex"] },
      },
    ],
    category: { type: String }, // Optional field for salon category
    reviews: [ReviewSchema],
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

// ✅ Geospatial Index for fast location-based queries
SalonSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Salon", SalonSchema);
