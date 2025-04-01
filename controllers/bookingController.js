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

        // ✅ Create a pending booking with history entry
        const booking = new Booking({
            salonId,
            userId,
            date,
            timeSlot,
            seatNumber,
            serviceDuration,
            status: "Pending", // Initially pending until payment
            paymentStatus: "Pending",
            bookingHistory: [{ status: "Pending", changedAt: new Date() }]
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

        // ✅ Add to history
        booking.bookingHistory.push({ status: "Confirmed", changedAt: new Date() });

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

            // ✅ Add to booking history
            booking.bookingHistory.push({ status: "Cancelled", changedAt: new Date() });

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

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        const user = await User.findById(booking.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // ✅ Check if it's user's first completed booking
        const completedBookingsCount = await Booking.countDocuments({ userId: user._id, status: "Completed" });

        if (completedBookingsCount === 0 && user.referredBy) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
                // ✅ Ensure Wallet exists
                let referrerWallet = await Wallet.findOne({ userId: referrer._id });
                if (!referrerWallet) {
                    referrerWallet = new Wallet({ userId: referrer._id, balance: 0 });
                }

                // ✅ Apply Referral Bonus
                referrerWallet.balance += 100;
                await referrerWallet.save();
                console.log("Referral bonus applied to referrer:", referrer._id);
            }
        }

        // ✅ Mark Booking as Completed & Save History
        booking.status = "Completed";
        booking.bookingHistory.push({ status: "Completed", changedAt: new Date() });

        await booking.save();
        res.status(200).json({ message: "Booking completed successfully, referral bonus applied if eligible", booking });

    } catch (error) {
        console.error("Error in completeBooking:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};
