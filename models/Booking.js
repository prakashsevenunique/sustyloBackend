const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    seatNumber: { type: Number, required: true },

    // ✅ Updated: Services Array
    services: [
        {
            title: { type: String, required: true },
            description: String,
            rate: { type: Number, required: true },
            duration: { type: String, required: true },
            discount: { type: Number, default: 0 },
            gender: { type: String, enum: ["male", "female", "unisex"], required: true },
        }
    ],

    // ✅ New fields
    totalAmount: { type: Number, required: true },
    totalDuration: { type: String, required: true },

    status: { type: String, enum: ["Pending", "Confirmed", "Cancelled", "Completed"], default: "Pending" },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },

    // ✅ Booking history tracking
    bookingHistory: [
        {
            status: String,
            changedAt: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
