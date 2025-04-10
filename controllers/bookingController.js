  const Booking = require('../models/Booking');
  const Salon = require('../models/salon');
  const User = require('../models/User'); 
  const Wallet = require("../models/Wallet");
  const referralService = require("../services/referralService");
const Payout = require("../models/payout");
const PayIn  = require('../models/payin');

//   exports.createBooking = async (req, res) => {
//     try {
//         const { salonId, userId, date, timeSlot, seatNumber, services } = req.body;

//         if (!salonId || !userId || !date || !timeSlot || !seatNumber || !services || !Array.isArray(services) || services.length === 0) {
//             return res.status(400).json({ error: "All fields and at least one service are required" });
//         }

     
//         const existingBooking = await Booking.findOne({
//             salonId, date, timeSlot, seatNumber, status: "Confirmed"
//         });

//         if (existingBooking) {
//             return res.status(400).json({ error: "This seat is already booked for the selected time slot" });
//         }

        
//         let totalAmount = 0;
//         let totalMinutes = 0;

//         services.forEach(service => {
//             const effectiveRate = service.discount
//                 ? service.price - (service.price * service.discount) / 100
//                 : service.price;

//             totalAmount += effectiveRate;

         
//             const matches = service.duration.match(/(\d+)\s*hr[s]?\s*(\d+)?\s*min[s]?|(\d+)\s*min[s]?/i);
//             if (matches) {
//                 if (matches[1]) {
//                     totalMinutes += parseInt(matches[1]) * 60 + (parseInt(matches[2]) || 0);
//                 } else if (matches[3]) {
//                     totalMinutes += parseInt(matches[3]);
//                 }
//             }
//         });

//         const hours = Math.floor(totalMinutes / 60);
//         const minutes = totalMinutes % 60;
//         const totalDuration = `${hours ? hours + ' hr ' : ''}${minutes} min`;

        
//         const booking = new Booking({
//             salonId,
//             userId,
//             date,
//             timeSlot,
//             seatNumber,
//             services,
//             totalAmount,
//             totalDuration,
//             status: "Pending",
//             paymentStatus: "Pending",
//             bookingHistory: [{ status: "Pending", changedAt: new Date() }]
//         });

//         await booking.save();
//         res.status(201).json({ message: "Booking initiated. Please complete payment.", bookingId: booking._id });

//     } catch (error) {
//         console.error("Error in createBooking:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };

 
exports.createBooking = async (req, res) => {
    try {
        const { salonId, userId, date, timeSlot, seatNumber, services } = req.body;

        // Validate input fields
        if (!salonId || !userId || !date || !timeSlot || !seatNumber || !services || !Array.isArray(services) || services.length === 0) {
            return res.status(400).json({ error: "All fields and at least one service are required" });
        }

        // Check seat availability
        const existingBooking = await Booking.findOne({
            salonId, 
            date, 
            timeSlot, 
            seatNumber, 
            status: { $in: ["Confirmed", "Pending"] } // Include pending bookings in check
        });

        if (existingBooking) {
            return res.status(400).json({ error: "This seat is already booked for the selected time slot" });
        }

        // Calculate total amount and duration
        let totalAmount = 0;
        let totalMinutes = 0;

        services.forEach(service => {
            const effectiveRate = service.discount
                ? service.price - (service.price * service.discount) / 100
                : service.price;

            totalAmount += effectiveRate;

            const matches = service.duration.match(/(\d+)\s*hr[s]?\s*(\d+)?\s*min[s]?|(\d+)\s*min[s]?/i);
            if (matches) {
                if (matches[1]) {
                    totalMinutes += parseInt(matches[1]) * 60 + (parseInt(matches[2]) || 0);
                } else if (matches[3]) {
                    totalMinutes += parseInt(matches[3]);
                }
            }
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const totalDuration = `${hours ? hours + ' hr ' : ''}${minutes} min`;

        // Check user wallet balance
        const user = await User.findById(userId).populate("wallet");
        const userWallet = await Wallet.findOne({user: userId});
        console.log("user wallet is:", userWallet);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (userWallet.balance < totalAmount) {
            return res.status(400).json({ error: "Insufficient wallet balance" });
        }

        // Deduct amount from wallet
        userWallet.balance -= totalAmount;
        await userWallet.save();

        // Create payout transaction record
        const payOutData = new Payout({
            userId,
            amount: totalAmount,
            remark: "Salon Booking",
            status: "Approved",
            name: user.name,
            email: user.email,
            mobile: user.mobileNumber,
            reference: `BOOKING-${Date.now()}`
        });
        await payOutData.save();

        // Create booking
        const booking = new Booking({
            salonId,
            userId,
            date,
            timeSlot,
            seatNumber,
            services,
            totalAmount,
            totalDuration,
            status: "Confirmed", // Changed from Pending to Confirmed since payment is done
            paymentStatus: "Paid",
            transactionId: payOutData.reference,
            bookingHistory: [
                { 
                    status: "Confirmed", 
                    changedAt: new Date(),
                    note: "Payment completed via wallet"
                }
            ]
        });

        await booking.save();

        res.status(201).json({ 
            message: "Booking confirmed successfully", 
            bookingId: booking._id,
            newWalletBalance: user.walletBalance
        });

    } catch (error) {
        console.error("Error in createBooking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


  exports.getUserBookings = async (req, res) => {
    try {
        const { userId } = req.params;

        
        const bookings = await Booking.find({ userId: userId }).populate('salonId', 'salonName salonAddress salonTitle salonPhotos');
        console.log("booking is : ", bookings);
        res.status(200).json({ bookings });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};


 
  exports.getSalonBookings = async (req, res) => {
      try {
          const { salonId } = req.params;

          const bookings = await Booking.find({ salonId: salonId }).populate('userId');
          res.status(200).json({ bookings });
      } catch (error) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
      }
  };


 exports.confirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

       
        booking.status = "Confirmed";
        booking.paymentStatus = "Paid";

       
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

 
exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        const user = await User.findById(booking.userId);
        if (!user) return res.status(404).json({ error: 'User not found'})
        const userWallet = await Wallet.findOne({user: booking.userId});
        console.log("user wallet is:", userWallet);
        
        // Deduct amount from wallet
        userWallet.balance += booking.totalAmount;
        await userWallet.save();

        const payInData = new PayIn({
            userId: user._id,
            amount: booking.totalAmount,
            remark: "Salon Booking",
            status: "Approved",
            name: user.name,
            email: user.email,
            mobile: user.mobileNumber,
            reference: `BOOKING-${Date.now()}`
        });
        await payInData.save();
        booking.status = 'Cancelled';
        await booking.save();

        res.status(200).json({ message: 'Booking cancelled!', booking });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};


  exports.completeBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        const user = await User.findById(booking.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        
        const completedBookingsCount = await Booking.countDocuments({ userId: user._id, status: "Completed" });

        if (completedBookingsCount === 0 && user.referredBy) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
               
                let referrerWallet = await Wallet.findOne({ userId: referrer._id });
                if (!referrerWallet) {
                    referrerWallet = new Wallet({ userId: referrer._id, balance: 0 });
                }

               
                referrerWallet.balance += 100;
                await referrerWallet.save();
                console.log("Referral bonus applied to referrer:", referrer._id);
            }
        }

       
        booking.status = "Completed";
        booking.bookingHistory.push({ status: "Completed", changedAt: new Date() });

        await booking.save();
        res.status(200).json({ message: "Booking completed successfully, referral bonus applied if eligible", booking });

    } catch (error) {
        console.error("Error in completeBooking:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};
