const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Salon = require("../models/salon");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const referralService = require("../services/referralService");
const Commission = require("../models/commissionModel");

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { salonId, userId, date, timeSlot, seatNumber, services } = req.body;

    // Validate input fields
    if (
      !salonId ||
      !userId ||
      !date ||
      !timeSlot ||
      !seatNumber ||
      !services ||
      !Array.isArray(services) ||
      services.length === 0
    ) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "All fields and at least one service are required" });
    }

    // Check seat availability
    const existingBooking = await Booking.findOne({
      salonId,
      date,
      timeSlot,
      seatNumber,
      status: { $in: ["Confirmed", "Pending"] },
    }).session(session);

    if (existingBooking) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({
          error: "This seat is already booked for the selected time slot",
        });
    }

    // Calculate total amount and duration
    let totalAmount = 0;
    let totalMinutes = 0;

    services.forEach((service) => {
      const effectiveRate = service.discount
        ? service.price - (service.price * service.discount) / 100
        : service.price;

      totalAmount += effectiveRate;

      const matches = service.duration.match(
        /(\d+)\s*hr[s]?\s*(\d+)?\s*min[s]?|(\d+)\s*min[s]?/i
      );
      if (matches) {
        if (matches[1]) {
          totalMinutes +=
            parseInt(matches[1]) * 60 + (parseInt(matches[2]) || 0);
        } else if (matches[3]) {
          totalMinutes += parseInt(matches[3]);
        }
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalDuration = `${hours ? hours + " hr " : ""}${minutes} min`;

    // Check user wallet balance
    const user = await User.findById(userId).session(session);
    const admin = await User.findOne({ role: "admin" }).session(session);

    if (!user || !admin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "User or admin not found" });
    }

    const userWallet = await Wallet.findOne({ user: userId }).session(session);
    const salonOwnerWallet = await Wallet.findOne({ user: salonId }).session(
      session
    );
    const adminWallet = await Wallet.findOne({ user: admin._id }).session(
      session
    );

    if (!userWallet || !salonOwnerWallet || !adminWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (userWallet.balance < totalAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const commission = await Commission.findOne({
      userId: user._id,
      serviceType: "booking",
      minAmount: { $lte: totalAmount },
      maxAmount: { $gte: totalAmount },
    }).session(session);

    if (!commission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send("No commission package configured for user.");
    }

    let adminCommission = 0;
    let ownerAmount = 0;

    if (commission.type === "percentage") {
      adminCommission = (totalAmount * commission.commission) / 100;
    } else {
      adminCommission = commission.commission;
    }

    ownerAmount = totalAmount - adminCommission;

    // Deduct amount from user wallet
    userWallet.balance -= totalAmount;
    userWallet.transactions.push({
      type: "Debit",
      amount: totalAmount,
      description: "Payment for salon booking",
    });
    await userWallet.save({ session });

    // Add commission to admin wallet
    adminWallet.balance += adminCommission;
    adminWallet.transactions.push({
      type: "Credit",
      amount: adminCommission,
      description: "Commission for salon booking",
    });
    await adminWallet.save({ session });

    // Add owner's share to salon owner wallet
    salonOwnerWallet.balance += ownerAmount;
    salonOwnerWallet.transactions.push({
      type: "Credit",
      amount: ownerAmount,
      description: "Amount for salon booking after Commission deduction",
    });
    await salonOwnerWallet.save({ session });

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
      status: "Confirmed",
      paymentStatus: "Paid",
      bookingHistory: [
        {
          status: "Confirmed",
          changedAt: new Date(),
          note: "Payment completed via wallet",
        },
      ],
    });

    await booking.save({ session });

    // Commit the transaction if all operations succeed
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Booking confirmed successfully",
      bookingId: booking._id,
      newWalletBalance: userWallet.balance,
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error("Error in createBooking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email mobileNumber") // Optional: adjust fields
      .populate("salonId", "salonName salonAddress salonPhotos");

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Error in getAllBookings:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.find({ userId: userId }).populate(
      "salonId",
      "salonName salonAddress salonTitle salonPhotos"
    );
    console.log("booking is : ", bookings);
    res.status(200).json({ bookings });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

exports.getSalonBookings = async (req, res) => {
  try {
    const { salonId } = req.params;

    const bookings = await Booking.find({ salonId: salonId }).populate(
      "userId"
    );
    res.status(200).json({ bookings });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
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
    res
      .status(200)
      .json({ message: "Payment successful! Booking confirmed.", booking });
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

      booking.bookingHistory.push({
        status: "Cancelled",
        changedAt: new Date(),
      });

      await booking.save();
      res
        .status(200)
        .json({ message: "Booking cancelled due to non-payment." });
    } else {
      res
        .status(400)
        .json({
          error: "Booking cannot be canceled. Payment is already completed.",
        });
    }
  } catch (error) {
    console.error("Error in cancelUnpaidBooking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.cancelBooking = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { bookingId } = req.params;
      const { cancelReason } = req.body;
  
      // Validate input
      if (!cancelReason) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Cancel reason is required" });
      }
  
      // Parallelize initial data fetching with session
      const [booking, admin] = await Promise.all([
        Booking.findById(bookingId).session(session),
        User.findOne({ role: "admin" }).session(session),
      ]);
  
      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: "Booking not found" });
      }
  
      // Check if booking is already cancelled
      if (booking.status === "Cancelled") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Booking is already cancelled" });
      }
  
      // Fetch remaining data in parallel with session
      const [user, userWallet, salonOwnerWallet, adminWallet, commission] = await Promise.all([
        User.findById(booking.userId).session(session),
        Wallet.findOne({ user: booking.userId }).session(session),
        Wallet.findOne({ user: booking.salonId }).session(session),
        Wallet.findOne({ user: admin._id }).session(session),
        Commission.findOne({
          userId: booking.salonId,
          serviceType: "booking",
          minAmount: { $lte: booking.totalAmount },
          maxAmount: { $gte: booking.totalAmount },
        }).session(session),
      ]);
  
      if (!user || !userWallet || !salonOwnerWallet || !adminWallet) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: "Required records not found" });
      }
  
      if (!commission) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "No commission package configured for this booking." });
      }
  
      const totalAmount = booking.totalAmount;
      let adminCommission = 0;
      let ownerAmount = 0;
  
      if (commission.type === "percentage") {
        adminCommission = (totalAmount * commission.commission) / 100;
      } else {
        adminCommission = commission.commission;
      }
  
      ownerAmount = totalAmount - adminCommission;
  
      // Prepare wallet updates
      userWallet.transactions.push({
        type: "Credit",
        amount: totalAmount,
        description: "Refund for cancelled booking",
      });
      userWallet.balance += totalAmount;
  
      adminWallet.transactions.push({
        type: "Debit",
        amount: adminCommission,
        description: "Commission reversal for cancelled booking",
      });
      adminWallet.balance -= adminCommission;
  
      salonOwnerWallet.transactions.push({
        type: "Debit",
        amount: ownerAmount,
        description: "Payment reversal for cancelled booking",
      });
      salonOwnerWallet.balance -= ownerAmount;
  
      // Update booking status
      booking.status = "Cancelled";
      booking.paymentStatus = "Refunded";
      booking.cancelReason = cancelReason;
      booking.bookingHistory.push({
        status: "Cancelled",
        changedAt: new Date(),
        note: `Booking cancelled: ${cancelReason}`,
      });
  
      // Execute all operations within the transaction
      await Promise.all([
        userWallet.save({ session }),
        adminWallet.save({ session }),
        salonOwnerWallet.save({ session }),
        booking.save({ session }),
      ]);
  
      // Commit the transaction if all operations succeed
      await session.commitTransaction();
      session.endSession();
  
      res.status(200).json({
        message: "Booking cancelled successfully",
        booking,
        newWalletBalance: userWallet.balance,
      });
  
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      
      console.error("Error in cancelBooking:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    }
  };

exports.completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const user = await User.findById(booking.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const completedBookingsCount = await Booking.countDocuments({
      userId: user._id,
      status: "Completed",
    });

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
    res
      .status(200)
      .json({
        message:
          "Booking completed successfully, referral bonus applied if eligible",
        booking,
      });
  } catch (error) {
    console.error("Error in completeBooking:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

exports.ownerCompleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const salonId = req.user.salonId;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status === "Completed") {
      return res
        .status(400)
        .json({ error: "Booking already marked as completed" });
    }

    booking.status = "Completed";
    booking.bookingHistory.push({ status: "Completed", changedAt: new Date() });

    await booking.save();

    res.status(200).json({
      message: "Booking marked as completed successfully by owner.",
      booking,
    });
  } catch (error) {
    console.error("Error in ownerCompleteBooking:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
