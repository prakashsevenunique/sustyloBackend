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
    
        // ✅ Create Booking
        const booking = new Booking({ salonId, userId, date, timeSlot, seatNumber, serviceDuration });
        await booking.save();
    
        res.status(201).json({ message: "Booking successful", booking });
      } catch (error) {
        console.error("Error in createBooking:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    };

  // Get all bookings for a user
  exports.getUserBookings = async (req, res) => {
      try {
          const { userId } = req.params;

          const bookings = await Booking.find({ user: userId }).populate('salon');
          res.status(200).json({ bookings });
      } catch (error) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
      }
  };

  // Get all bookings for a salon
  exports.getSalonBookings = async (req, res) => {
      try {
          const { salonId } = req.params;

          const bookings = await Booking.find({ salon: salonId }).populate('user');
          res.status(200).json({ bookings });
      } catch (error) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
      }
  };

  // Confirm Booking After Payment
  exports.confirmBooking = async (req, res) => {
      try {
          const { bookingId } = req.params;

          const booking = await Booking.findById(bookingId);
          if (!booking) return res.status(404).json({ error: 'Booking not found' });

          booking.status = 'confirmed';
          booking.paymentStatus = 'paid';
          await booking.save();

          // ✅ Referral Bonus on First Booking
          const user = await User.findById(booking.userId);
          if (user && user.referredBy) {
              const referrer = await User.findById(user.referredBy);
              if (referrer) {
                  let referrerWallet = await Wallet.findOne({ user: referrer._id });
                  if (!referrerWallet) {
                      referrerWallet = new Wallet({ user: referrer._id, balance: 0 });
                  }
                  referrerWallet.balance += 50; // ✅ Bonus for First Booking
                  await referrerWallet.save();
              }
          }

          res.status(200).json({ message: "Booking confirmed successfully", booking });
      } catch (error) {
          console.error("Error in confirmBooking:", error);
          res.status(500).json({ error: "Internal server error" });
      }
  };

  // Cancel Booking
  exports.cancelBooking = async (req, res) => {
      try {
          const { bookingId } = req.params;

          const booking = await Booking.findById(bookingId);
          if (!booking) return res.status(404).json({ error: 'Booking not found' });

          booking.status = 'cancelled';
          await booking.save();

          res.status(200).json({ message: 'Booking cancelled!', booking });
      } catch (error) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
      }
  };

  // Mark Booking as Completed
  exports.completeBooking = async (req, res) => {
    try {
      const { userId, bookingId } = req.body;

      // ✅ Find the booking
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.status === "completed") {
        return res.status(400).json({ message: "Booking already completed" });
      }

      // ✅ Mark booking as completed
      booking.status = "completed";
      await booking.save();

      // ✅ Check if this is the user's first booking
      const userBookings = await Booking.countDocuments({ user: userId, status: "completed" });
      if (userBookings === 1) {
        // ✅ Add referral bonus to the referrer
        const user = await User.findById(userId);
        if (user.referredBy) {
          await referralService.addReferralBonus(user.referredBy, userId);
        }
      }

      res.status(200).json({ message: "Booking completed successfully" });

    } catch (error) {
      console.error("Error in completeBooking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
