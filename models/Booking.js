const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },
    date: { type: String, required: true }, 
    timeSlot: { type: String, required: true },
    seatNumber: { type: Number, required: true },
    serviceDuration: { type: Number, required: true },
    status: { type: String, enum: ["Confirmed", "Completed", "Cancelled"], default: "Confirmed" },
    paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" }
});

module.exports = mongoose.model("Booking", BookingSchema);
