const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: "Salon", required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    seatNumber: { type: Number, required: true },

    
    services: [
        {
            name: { type: String, required: true },
            description: String,
            price: { type: Number, required: true },
            duration: { type: String, required: true },
            discount: { type: Number, default: 0 },
            gender: { type: String, enum: ["male", "female", "unisex"], required: true },
        }
    ],

   
    totalAmount: { type: Number, required: true },
    totalDuration: { type: String, required: true },

    status: { type: String, enum: ["Pending", "Confirmed", "Cancelled", "Completed"], default: "Pending" },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },

  
    bookingHistory: [
        {
            status: String,
            changedAt: { type: Date, default: Date.now }
        }
    ],
    
    reminder24hSent: { type: Boolean, default: false },
reminder1hSent: { type: Boolean, default: false },
reminder10mSent: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
