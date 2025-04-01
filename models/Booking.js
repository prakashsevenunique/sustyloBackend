const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    seatNumber: { type: Number, required: true },
    serviceDuration: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Confirmed", "Cancelled", "Completed"], default: "Pending" },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },

    // ✅ Booking history tracking
    bookingHistory: [
        {
            status: String,
            changedAt: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true }); // ✅ Adds createdAt & updatedAt automatically

module.exports = mongoose.model('Booking', bookingSchema);
