const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Salon = require("../models/salon");
const User = require("../models/User");
const { Wallet, WalletTransaction } = require("../models/Wallet");
const referralService = require("../services/referralService");
const Commission = require("../models/commissionModel");


// let cachedAdminId = null;

// async function getAdminId(session) {
//   if (!cachedAdminId) {
//     const admin = await User.findOne({ role: "admin" }).session(session).select("_id");
//     cachedAdminId = admin?._id;
//   }
//   return cachedAdminId;
// }

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

    // Check seat availability
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
          ? parseInt(matches[1]) * 60 + (parseInt(matches[2])) || 0
          : parseInt(matches[3]) || 0;
      }
    });

    // Fetch admin, user, and salon data
    const [admin, user, salon] = await Promise.all([
      User.findOne({ role: "admin" }).session(session).select("_id name mobileNumber email"),
      User.findById(userId).session(session),
      Salon.findById(salonId).session(session).populate("salonowner"),
    ]);

    if (!admin || !user || !salon) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Admin, user, or salon not found" });
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

    // Get commission
    const commission = await Commission.findOne({
      userId: userId,
      serviceType: "booking",
      minAmount: { $lte: totalAmount },
      maxAmount: { $gte: totalAmount },
    }).session(session).lean();

    if (!commission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "No commission package configured for user" });
    }

    const adminCommission = commission.type === "percentage" 
      ? Math.round((totalAmount * commission.commission) / 100 * 100) / 100
      : commission.commission;
    const ownerAmount = totalAmount - adminCommission;

    // Process wallet updates
    const [adminWalletUpdate, salonOwnerWalletUpdate] = await Promise.all([
      Wallet.findOneAndUpdate(
        { user: admin._id },
        { $inc: { balance: adminCommission } },
        { new: true, session }
      ),
      Wallet.findOneAndUpdate(
        { user: salonId}, // Assuming salon has a `userId` field
        { $inc: { balance: ownerAmount } },
        { new: true, session }
      )
    ]);

    // Create transaction records
    const bookingId = new mongoose.Types.ObjectId();
    const timestamp = Date.now();

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
        totalDuration: `${Math.floor(totalMinutes / 60) > 0 ? Math.floor(totalMinutes / 60) + " hr " : ""}${totalMinutes % 60} min`,
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
      new PayOut({
        userId,
        amount: totalAmount,
        name: user.name,
        mobile: user.mobileNumber,
        email: user.email,
        status: "Approved",
        utr: `BOOKING-USER-${timestamp}`,
        trans_mode: "wallet",
      }).save({ session }),
      new PayIn({
        userId: salonId,
        amount: ownerAmount,
        name: salon.name,
        mobile: salon.mobileNumber,
        email: salon.email,
        status: "Approved",
        utr: `BOOKING-OWNER-${timestamp}`,
        trans_mode: "wallet",
      }).save({ session }),
      new PayIn({
        userId: admin._id,
        amount: adminCommission,
        name: admin.name,
        mobile: admin.mobileNumber,
        email: admin.email,
        status: "Approved",
        utr: `BOOKING-ADMIN-${timestamp}`,
        trans_mode: "wallet",
      }).save({ session })
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

    // Fetch booking, admin, user, and salon in parallel
    const [booking, admin] = await Promise.all([
      Booking.findById(bookingId).session(session),
      User.findOne({ role: "admin" }).session(session).select("_id name mobileNumber email"),
    ]);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "Cancelled") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    const [user, salon] = await Promise.all([
      User.findById(booking.userId).session(session),
      Salon.findById(booking.salonId).populate('salonowner').session(session),
    ]);

    // Get all required data in parallel
    const [userWallet, salonOwnerWallet, adminWallet, commission] = await Promise.all([
      Wallet.findOne({ user: booking.userId }).session(session),
      Wallet.findOne({ user: salon.userId._id }).session(session), // Use salon.userId
      Wallet.findOne({ user: admin._id }).session(session),
      Commission.findOne({
        userId: booking.salonId,
        serviceType: "booking",
        minAmount: { $lte: booking.totalAmount },
        maxAmount: { $gte: booking.totalAmount },
      }).session(session)
    ]);

    // Validate all required records
    if (!userWallet || !salonOwnerWallet || !adminWallet || !commission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        error: "Required records not found",
        details: !commission ? "No commission package configured" : undefined
      });
    }

    const totalAmount = booking.totalAmount;
    const adminCommission = commission.type === "percentage" 
      ? Math.round((totalAmount * commission.commission) / 100 * 100) / 100
      : commission.commission;
    const ownerAmount = totalAmount - adminCommission;

    // Atomic wallet updates
    const timestamp = Date.now();
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

    // Prepare transactions with unique UTRs
    const [userPayIn, adminPayOut, ownerPayOut] = await Promise.all([
      new PayIn({
        userId: booking.userId,
        amount: totalAmount,
        name: user.name,
        mobile: user.mobileNumber,
        email: user.email,
        status: "Approved",
        utr: `CANCEL-USER-${timestamp}`,
        trans_mode: "wallet",
      }).save({ session }),
      new PayOut({
        userId: admin._id,
        amount: adminCommission,
        name: admin.name,
        mobile: admin.mobileNumber,
        email: admin.email,
        status: "Approved",
        utr: `CANCEL-ADMIN-${timestamp}`,
        trans_mode: "wallet",
      }).save({ session }),
      new PayOut({
        userId: salon.userId._id,
        amount: ownerAmount,
        name: salon.name,
        mobile: salon.mobileNumber,
        email: salon.email,
        status: "Approved",
        utr: `CANCEL-OWNER-${timestamp}`,
        trans_mode: "wallet",
      }).save({ session })
    ]);

    // Update booking
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

    await booking.save({ session });

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