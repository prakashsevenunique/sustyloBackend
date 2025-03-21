const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format: "YYYY-MM-DD"
    timeSlot: { type: String, required: true }, // Example: "10:00 AM - 11:00 AM"
    seatNumber: { type: Number, required: true },
    serviceDuration: { type: Number, required: true }, // In minutes
    status: { type: String, enum: ["Confirmed", "Cancelled"], default: "Confirmed" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);