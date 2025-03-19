const Booking = require('../models/Booking');
const mongoose = require("mongoose");

// Create Booking (User Request)
exports.createBooking = async (req, res) => {
    try {
        const { userId, salonId, serviceId, date, timeSlot } = req.body;

        // Check if slot is already confirmed
        const existingBooking = await Booking.findOne({ 
            salon: salonId, date, time: timeSlot, status: 'confirmed' 
        });

        if (existingBooking) {
            return res.status(400).json({ error: 'Time slot not available' });
        }

        // Create a pending booking request
        const newBooking = new Booking({ 
            user: userId, 
            salon: salonId, 
            service: serviceId, 
            date, 
            time: timeSlot, 
            status: 'pending' 
        });

        await newBooking.save();

        res.status(201).json({ message: 'Booking request sent to salon for approval!', booking: newBooking });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Handle Booking Request (Salon Owner Confirm/Cancel)
exports.handleBookingRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // action: 'confirm' or 'cancel'

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid booking ID" });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        if (action === "confirm") {
            booking.status = "confirmed";
        } else if (action === "cancel") {
            booking.status = "cancelled";
        } else {
            return res.status(400).json({ error: "Invalid action. Use 'confirm' or 'cancel'." });
        }

        await booking.save();

        res.status(200).json({ message: `Booking ${booking.status}!`, booking });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

// Get All Pending Bookings for a Salon (For Approval)
exports.getPendingBookings = async (req, res) => {
    try {
        const { salonId } = req.params;
        
        console.log(" Received salonId from request:", salonId);

        //  Convert salonId to ObjectId before querying
        const salonObjectId = new mongoose.Types.ObjectId(salonId);
        console.log(" Converted salonId to ObjectId:", salonObjectId);

        //  Check direct database query
        const rawQuery = { salon: salonObjectId, status: "pending" };
        console.log(" Querying with:", rawQuery);

        //  Fetch pending bookings
        const pendingBookings = await Booking.find(rawQuery).populate("user");

        console.log(" Pending Bookings Found:", pendingBookings);

        if (pendingBookings.length === 0) {
            return res.status(404).json({ 
                message: "No pending bookings found", 
                debugSalonId: salonId 
            });
        }

        res.status(200).json({ bookings: pendingBookings });
    } catch (error) {
        console.error(" Error in getPendingBookings:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

// Cancel Booking (User Cancel Request)
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid booking ID" });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        booking.status = "cancelled";
        await booking.save();

        res.status(200).json({ message: "Booking cancelled!", booking });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

// Get All Bookings for a User
exports.getUserBookings = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const bookings = await Booking.find({ user: userId }).populate('salon service');
        res.status(200).json({ bookings });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

// Get All Bookings for a Salon
exports.getSalonBookings = async (req, res) => {
    try {
        const { salonId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(salonId)) {
            return res.status(400).json({ error: "Invalid salon ID" });
        }

        const bookings = await Booking.find({ salon: salonId }).populate('user service');
        res.status(200).json({ bookings });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

// Mark Booking as Completed
exports.completeBooking = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid booking ID" });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        booking.status = "completed";
        await booking.save();

        res.status(200).json({ message: "Booking marked as completed!", booking });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};
