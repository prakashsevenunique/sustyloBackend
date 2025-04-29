const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Salon = require("../models/salon");
const User = require("../models/User");
const { Wallet, WalletTransaction } = require("../models/Wallet");
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
//         const totalDuration = ${hours ? hours + ' hr ' : ''}${minutes} min;

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

let cachedAdminId = null;

async function getAdminId(session) {
  if (!cachedAdminId) {
    const admin = await User.findOne({ role: "admin" }).session(session).select("_id");
    cachedAdminId = admin?._id;
  }
  return cachedAdminId;
}

exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { salonId, userId, date, timeSlot, seatNumber, services } = req.body;

    // Validate input fields
    if (!salonId || !userId || !date || !timeSlot || !seatNumber || 
        !services || !Array.isArray(services) || services.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "All fields and at least one service are required" });
    }

    // Check seat availability using lean() for better performance
    const existingBooking = await Booking.findOne({
      salonId,
      date,
      timeSlot,
      seatNumber,
      status: { $in: ["Confirmed", "Pending"] },
    }).session(session).lean();

    if (existingBooking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "This seat is already booked for the selected time slot" });
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
        totalMinutes += matches[1] 
          ? parseInt(matches[1]) * 60 + (parseInt(matches[2]) || 0)
          : parseInt(matches[3]);
      }
    });

    // Get admin ID (cached)
    const adminId = await getAdminId(session);
    if (!adminId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Admin not found" });
    }

    // Atomic balance check and update for user wallet
    const userWalletUpdate = await Wallet.findOneAndUpdate(
      { user: userId, balance: { $gte: totalAmount } },
      { $inc: { balance: -totalAmount } },
      { new: true, session }
    );

    if (!userWalletUpdate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    // Get commission (consider caching these)
    const commission = await Commission.findOne({
      userId: userId,
      serviceType: "booking",
      minAmount: { $lte: totalAmount },
      maxAmount: { $gte: totalAmount },
    }).session(session).lean();

    if (!commission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send("No commission package configured for user.");
    }

    const adminCommission = commission.type === "percentage" 
      ? Math.round((totalAmount * commission.commission) / 100 * 100) / 100 // Round to 2 decimal places
      : commission.commission;
    const ownerAmount = totalAmount - adminCommission;

    // Process all wallet updates in parallel
    const [adminWalletUpdate, salonOwnerWalletUpdate] = await Promise.all([
      Wallet.findOneAndUpdate(
        { user: adminId },
        { $inc: { balance: adminCommission } },
        { new: true, session }
      ),
      Wallet.findOneAndUpdate(
        { user: salonId },
        { $inc: { balance: ownerAmount } },
        { new: true, session }
      )
    ]);

    // Create transaction records
    const bookingId = new mongoose.Types.ObjectId(); // Generate ID early for reference
    const [userTransaction, adminTransaction, salonTransaction] = [
      new WalletTransaction({
        wallet: userWalletUpdate._id,
        amount: totalAmount,
        type: "Debit",
        description: `Payment for booking at salon ${salonId}`,
        reference: `booking:${bookingId}`,
        metadata: { salonId, services }
      }),
      new WalletTransaction({
        wallet: adminWalletUpdate._id,
        amount: adminCommission,
        type: "Credit",
        description: `Commission from booking ${bookingId}`,
        reference: `booking:${bookingId}`,
        metadata: { userId, salonId, commissionRate: commission.commission }
      }),
      new WalletTransaction({
        wallet: salonOwnerWalletUpdate._id,
        amount: ownerAmount,
        type: "Credit",
        description: `Payment for booking ${bookingId} after commission`,
        reference: `booking:${bookingId}`,
        metadata: { userId, commissionDeducted: adminCommission }
      })
    ];

    // Save all transactions and create booking in parallel
    const [savedBooking] = await Promise.all([
      new Booking({
        _id: bookingId,
        salonId,
        userId,
        date,
        timeSlot,
        seatNumber,
        services,
        totalAmount,
        totalDuration: `${Math.floor(totalMinutes / 60) ? Math.floor(totalMinutes / 60) + " hr " : ""}${totalMinutes % 60} min`,
        status: "Confirmed",
        paymentStatus: "Paid",
        commissionDetails: {
          amount: adminCommission,
          rate: commission.commission,
          type: commission.type
        },
        bookingHistory: [{
          status: "Confirmed",
          changedAt: new Date(),
          note: "Payment completed via wallet",
        }],
      }).save({ session }),
      userTransaction.save({ session }),
      adminTransaction.save({ session }),
      salonTransaction.save({ session })
    ]);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Booking confirmed successfully",
      bookingId: savedBooking._id,
      newWalletBalance: userWalletUpdate.balance,
      commissionDeducted: adminCommission,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in createBooking:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
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

    // Fetch booking and admin in parallel
    const [booking, adminId] = await Promise.all([
      Booking.findById(bookingId).session(session),
      getAdminId(session)
    ]);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check booking status
    if (booking.status === "Cancelled") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    // Get all required data in parallel
    const [userWallet, salonOwnerWallet, adminWallet, commission] = await Promise.all([
      Wallet.findOne({ user: booking.userId }).session(session),
      Wallet.findOne({ user: booking.salonId }).session(session),
      Wallet.findOne({ user: adminId }).session(session),
      Commission.findOne({
        userId: booking.salonId,
        serviceType: "booking",
        minAmount: { $lte: booking.totalAmount },
        maxAmount: { $gte: booking.totalAmount },
      }).session(session)
    ]);

    // Validate all required records exist
    if (!userWallet || !salonOwnerWallet || !adminWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Required wallet records not found" });
    }

    if (!commission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "No commission package configured for this booking" });
    }

    const totalAmount = booking.totalAmount;
    const adminCommission = commission.type === "percentage" 
      ? Math.round((totalAmount * commission.commission) / 100 * 100) / 100
      : commission.commission;
    const ownerAmount = totalAmount - adminCommission;

    // Perform atomic wallet updates
    const [updatedUserWallet, updatedAdminWallet, updatedSalonWallet] = await Promise.all([
      Wallet.findOneAndUpdate(
        { _id: userWallet._id },
        { $inc: { balance: totalAmount } },
        { new: true, session }
      ),
      Wallet.findOneAndUpdate(
        { _id: adminWallet._id },
        { $inc: { balance: -adminCommission } },
        { new: true, session }
      ),
      Wallet.findOneAndUpdate(
        { _id: salonOwnerWallet._id },
        { $inc: { balance: -ownerAmount } },
        { new: true, session }
      )
    ]);

    // Create transaction records
    const [userTransaction, adminTransaction, salonTransaction] = [
      new WalletTransaction({
        wallet: userWallet._id,
        amount: totalAmount,
        type: "Credit",
        description: `Refund for cancelled booking ${bookingId}`,
        reference: `booking:${bookingId}`,
        metadata: {
          originalAmount: totalAmount,
          cancellationReason: cancelReason,
          salonId: booking.salonId
        }
      }),
      new WalletTransaction({
        wallet: adminWallet._id,
        amount: adminCommission,
        type: "Debit",
        description: `Commission reversal for cancelled booking ${bookingId}`,
        reference: `booking:${bookingId}`,
        metadata: {
          originalCommission: adminCommission,
          commissionType: commission.type,
          rate: commission.commission
        }
      }),
      new WalletTransaction({
        wallet: salonOwnerWallet._id,
        amount: ownerAmount,
        type: "Debit",
        description: `Payment reversal for cancelled booking ${bookingId}`,
        reference: `booking:${bookingId}`,
        metadata: {
          originalAmount: ownerAmount,
          commissionDeducted: adminCommission
        }
      })
    ];

    // Update booking status
    booking.status = "Cancelled";
    booking.paymentStatus = "Refunded";
    booking.cancelReason = cancelReason;
    booking.refundAmount = totalAmount;
    booking.commissionReversed = adminCommission;
    booking.bookingHistory.push({
      status: "Cancelled",
      changedAt: new Date(),
      note: `Booking cancelled: ${cancelReason}. Amount refunded: ${totalAmount}`
    });

    // Execute all operations in parallel
    await Promise.all([
      booking.save({ session }),
      userTransaction.save({ session }),
      adminTransaction.save({ session }),
      salonTransaction.save({ session })
    ]);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Booking cancelled successfully",
      bookingId: booking._id,
      refundAmount: totalAmount,
      newWalletBalance: updatedUserWallet.balance,
      commissionReversed: adminCommission
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in cancelBooking:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
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