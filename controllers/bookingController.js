const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Salon = require("../models/salon");
const User = require("../models/User");
const referralService = require("../services/referralService");
const Commission = require("../models/commissionModel");
const Wallet = require("../models/Wallet");
const payout = require("../models/payout");
const payin = require("../models/payin");


exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { salonId, userId, date, timeSlot, seatNumber, services } = req.body;
      const timestamp = Date.now();

      if (!salonId || !userId || !date || !timeSlot || !seatNumber || !services?.length) {
        throw new Error("All fields and at least one service are required");
      }

      const [existingBooking, admin, user, salon] = await Promise.all([
        Booking.findOne({
          salonId,
          date,
          timeSlot,
          seatNumber,
          status: { $in: ["Confirmed", "Pending"] },
        }).session(session).lean(),
        User.findOne({ role: "admin" }).session(session).select("_id name mobileNumber email"),
        User.findById(userId).session(session),
        Salon.findById(salonId).session(session)
      ]);

      if (existingBooking) throw new Error("This seat is already booked for the selected time slot");
      if (!admin || !user || !salon) throw new Error("User, salon, or admin not found");

      const { totalAmount, totalMinutes } = services.reduce((acc, service) => {
        const effectiveRate = service.discount ?
          service.price - (service.price * service.discount) / 100 :
          service.price;
        acc.totalAmount += effectiveRate;

        const matches = service.duration.match(/(\d+)\s*hr[s]?\s*(\d+)?\s*min[s]?|(\d+)\s*min[s]?/i);
        if (matches) {
          acc.totalMinutes += matches[1] ?
            parseInt(matches[1]) * 60 + (parseInt(matches[2]) || 0) :
            parseInt(matches[3]) || 0;
        }
        return acc;
      }, { totalAmount: 0, totalMinutes: 0 });

      const durationString = `${Math.floor(totalMinutes / 60) > 0 ? Math.floor(totalMinutes / 60) + " hr " : ""}${totalMinutes % 60} min`;

      // Checkcommission
      const commission = await Commission.findOne({
        userId: salon.salonowner,
        serviceType: "booking"
      }).session(session);

      if (!commission) throw new Error("No commission package configured for user");

      // Process wallet transaction
      const userWalletUpdate = await Wallet.findOneAndUpdate(
        { user: userId, balance: { $gte: totalAmount } },
        { $inc: { balance: -totalAmount } },
        { new: true, session }
      );
      if (!userWalletUpdate) throw new Error("Insufficient wallet balance");

      // Calculate commissions
      const adminCommission = commission.type === "percentage" ?
        Math.round((totalAmount * commission.commission) / 100) :
        commission.commission;
      const ownerAmount = totalAmount - adminCommission;

      // Create booking
      const savedBooking = await new Booking({
        salonId,
        userId,
        date,
        timeSlot,
        seatNumber,
        services,
        totalAmount,
        totalDuration: durationString,
        status: "Confirmed",
        paymentStatus: "Paid",
      }).save({ session });

      // Process all transactions
      await Promise.all([
        // Payment records
        new payout({
          userId,
          bookingId: savedBooking._id,
          amount: totalAmount,
          name: user.name || "User",
          mobile: user.mobileNumber || "N/A",
          email: user.email,
          status: "Approved",
          utr: null,
          trans_mode: "wallet",
          reference: savedBooking._id,
          description: `Paid for booking`,
        }).save({ session }),

        new payin({
          userId: salon.salonowner,  // Fixed: was salonId.salonowner
          bookingId: savedBooking._id,
          amount: ownerAmount,
          name: salon.name || "Salon Owner",
          mobile: salon.mobileNumber || "N/A",
          email: salon.email,
          status: "Approved",
          utr: null,
          trans_mode: "wallet",
          description: `Payment received for booking #${savedBooking._id}`,
        }).save({ session }),

        new payin({
          userId: admin._id,
          bookingId: savedBooking._id,
          amount: adminCommission,
          name: admin.name || "Admin",
          mobile: admin.mobileNumber || "N/A",
          email: admin.email,
          status: "Approved",
          utr: null,
          trans_mode: "wallet",
          description: `Commission for booking #${savedBooking._id}`,
        }).save({ session }),

        // Wallet updates
        Wallet.findOneAndUpdate(
          { user: admin._id },
          { $inc: { balance: adminCommission } },
          { new: true, session }
        ),
        Wallet.findOneAndUpdate(
          { user: salon.salonowner },
          { $inc: { balance: ownerAmount } },
          { new: true, session }
        )
      ]);

      res.status(201).json({
        message: "Booking confirmed successfully",
        bookingId: savedBooking._id,
        newWalletBalance: userWalletUpdate.balance,
        duration: durationString
      });
    });
  } catch (error) {
    console.error("Error in createBooking:", error);
    const statusCode = error.message.includes("not found") ? 404 :
      error.message.includes("already booked") ? 400 :
        error.message.includes("Insufficient") ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  } finally {
    session.endSession();
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
  try {
    await session.withTransaction(async () => {
      const { bookingId } = req.params;
      const { cancelReason } = req.body;

      if (!cancelReason) {
        throw new Error("Cancel reason is required");
      }

      const [booking, admin] = await Promise.all([
        Booking.findById(bookingId).session(session),
        User.findOne({ role: "admin" }).session(session).select("_id name mobileNumber email"),
      ]);

      if (!booking) throw new Error("Booking not found");
      if (booking.status === "Cancelled") throw new Error("Booking is already cancelled");

      const [user, salon] = await Promise.all([
        User.findById(booking.userId).session(session),
        Salon.findById(booking.salonId).populate('salonowner').session(session),
      ]);

      const [userWallet, salonOwnerWallet, adminWallet, commission] = await Promise.all([
        Wallet.findOne({ user: booking.userId }).session(session),
        Wallet.findOne({ user: salon.salonowner._id }).session(session),
        Wallet.findOne({ user: admin._id }).session(session),
        Commission.findOne({
          userId: salon.salonowner._id,
          serviceType: "booking"
        }).session(session)
      ]);

      if (!userWallet || !salonOwnerWallet || !adminWallet || !commission) {
        throw new Error(!commission ? "No commission package configured" : "Required wallet records not found");
      }

      const totalAmount = booking.totalAmount;
      const adminCommission = commission.type === "percentage"
        ? Math.round((totalAmount * commission.commission) / 100 * 100) / 100
        : commission.commission;
      const ownerAmount = totalAmount - adminCommission;

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
        ),

        // Payment records
        new payin({
          userId: booking.userId,
          bookingId: booking._id,
          amount: totalAmount,
          name: user.name || "User",
          mobile: user.mobileNumber || "N/A",
          email: user.email,
          status: "Approved",
          utr: `CANCEL-USER-${timestamp}`,
          trans_mode: "wallet",
          reference: booking._id,
          description: `Refund for cancelled booking`,
        }).save({ session }),

        new payout({
          userId: admin._id,
          bookingId: booking._id,
          amount: adminCommission,
          name: admin.name || "Admin",
          mobile: admin.mobileNumber || "N/A",
          email: admin.email,
          status: "Approved",
          utr: `CANCEL-ADMIN-${timestamp}`,
          trans_mode: "wallet",
          reference: booking._id,
          description: `Commission reversed for cancelled booking #${booking._id}`,
        }).save({ session }),

        new payout({
          userId: salon.salonowner._id,
          bookingId: booking._id,
          amount: ownerAmount,
          name: salon.name || "Salon Owner",
          mobile: salon.mobileNumber || "N/A",
          email: salon.email,
          status: "Approved",
          utr: `CANCEL-OWNER-${timestamp}`,
          trans_mode: "wallet",
          reference: booking._id,
          description: `Payment reversed for cancelled booking #${booking._id}`,
        }).save({ session })
      ]);

      booking.status = "Cancelled";
      booking.paymentStatus = "Paid";
      booking.cancelReason = cancelReason;
      booking.refundAmount = totalAmount;
      await booking.save({ session });

      res.status(200).json({
        message: "Booking cancelled successfully",
        bookingId: booking._id,
        refundAmount: totalAmount,
        newWalletBalance: updatedUserWallet.balance,
        commissionReversed: adminCommission
      });
    });
  } catch (error) {
    console.error("Error in cancelBooking:", error);
    const statusCode = error.message.includes("not found") ? 404 :
      error.message.includes("already") ? 400 : 500;
    res.status(statusCode).json({
      error: error.message,
    });
  } finally {
    session.endSession();
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