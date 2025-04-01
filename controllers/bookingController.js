  const Booking = require('../models/Booking');
  const Salon = require('../models/salon');
  const User = require('../models/User'); // Assuming you have a User model
  const Wallet = require("../models/Wallet");
  const referralService = require("../services/referralService");


  exports.createBooking = async (req, res) => {
    try {
        const { salonId, userId, date, timeSlot, seatNumber, serviceDuration } = req.body;

        if (!salonId || !userId || !date || !timeSlot || !seatNumber || !serviceDuration) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // ✅ Check if seat is already booked
        const existingBooking = await Booking.findOne({ salonId, date, timeSlot, seatNumber, status: "Confirmed" });

        if (existingBooking) {
            return res.status(400).json({ error: "This seat is already booked for the selected time slot" });
        }

        // ✅ Create a pending booking
        const booking = new Booking({
            salonId,
            userId,
            date,
            timeSlot,
            seatNumber,
            serviceDuration,
            status: "Pending", // Initially pending until payment
            paymentStatus: "Pending"
        });

        await booking.save();

        res.status(201).json({ message: "Booking initiated. Please complete payment.", bookingId: booking._id });

    } catch (error) {
        console.error("Error in createBooking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

  // Get all bookings for a user
  exports.getUserBookings = async (req, res) => {
    try {
        const { userId } = req.params;

        // Correct field name: userId instead of user
        const bookings = await Booking.find({ userId: userId }).populate('salonId');
        console.log("booking is : ", bookings);
        res.status(200).json({ bookings });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};


  // Get all bookings for a salon
  exports.getSalonBookings = async (req, res) => {
      try {
          const { salonId } = req.params;

          const bookings = await Booking.find({ salonId: salonId }).populate('userId');
          res.status(200).json({ bookings });
      } catch (error) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
      }
  };

 // ✅ Confirm Booking After Payment
exports.confirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        // ✅ Update status after successful payment
        booking.status = "Confirmed";
        booking.paymentStatus = "Paid";
        await booking.save();

        res.status(200).json({ message: "Payment successful! Booking confirmed.", booking });

    } catch (error) {
        console.error("Error in confirmBooking:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.cancelUnpaidBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (booking.paymentStatus === "Pending") {
            booking.status = "Cancelled";
            booking.paymentStatus = "Failed";
            await booking.save();

            res.status(200).json({ message: "Booking cancelled due to non-payment." });
        } else {
            res.status(400).json({ error: "Booking cannot be canceled. Payment is already completed." });
        }

    } catch (error) {
        console.error("Error in cancelUnpaidBooking:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

  // ✅ Cancel Booking Manually
exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        booking.status = 'Cancelled';
        await booking.save();

        res.status(200).json({ message: 'Booking cancelled!', booking });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

  // ✅ Mark Booking as Completed (Apply Referral Bonus)
  exports.completeBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Booking ko find karo
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        console.log("Booking is:", booking);

        // Booking se userId retrieve karo
        const userId = booking.userId;
        console.log("User ID is:", userId);

        // User ko find karo using User model
        const user = await User.findById(userId);
        console.log("User is:", user);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check karo ki user ki pehli completed booking hai ya nahi
        const completedBookingsCount = await Booking.countDocuments({ userId: user._id, status: "Completed" });
        console.log("Completed bookings count:", completedBookingsCount);

        // Agar pehli booking hai aur user ne kisi se referral liya hai, to referral bonus apply karo
        if (completedBookingsCount === 0 && user.referredBy) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
                // Assume karo ki referrer ke paas walletBalance field exist karti hai
                referrer.walletBalance = (referrer.walletBalance || 0) + 100;
                await referrer.save();
                console.log("Referral bonus applied to referrer:", referrer._id);
            }
        }

        // Booking status ko "Completed" set karo aur save karo
        booking.status = "Completed";
        await booking.save();

        res.status(200).json({ message: "Booking completed successfully, referral bonus applied if eligible" });
    } catch (error) {
        console.error("Error in completeBooking:", error);
    }}
