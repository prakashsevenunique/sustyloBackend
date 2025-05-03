const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Salon = require("../models/salon");
const User = require("../models/User");
const referralService = require("../services/referralService");
const Commission = require("../models/commissionModel");
const Wallet = require("../models/Wallet");
const payout = require("../models/payout");
const payin = require("../models/payin");
const { sendPushNotification } = require("../utils/pushNotification");
const { handleReferralReward, cancelReferralReward } = require("../utils/firstOrderReferal");


exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { salonId, userId, date, timeSlot, seatNumber, services } = req.body;

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
        new payout({
          userId,
          bookingId: savedBooking._id,
          amount: totalAmount,
          name: user.name || "User",
          mobile: user.mobileNumber || "N/A",
          email: user.email || "N/A",
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
          email: salon.email || "N/A",
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
          email: admin.email || "N/A",
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
      if (user.notificationToken) {
        sendPushNotification(user.notificationToken, "Booking Confirmed", `Your booking at ${salon.salonName} is confirmed for ${date} at ${timeSlot}.`, {
          "id": savedBooking._id,
          "type": "booking",
        });
      }
      if(user.referredBy) {
        handleReferralReward(savedBooking);
      }
      res.status(201).json({
        message: "Booking confirmed successfully",
        bookingId: savedBooking._id,
        newWalletBalance: userWalletUpdate.balance,
        duration: durationString
      });
    });
  } catch (error) {
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
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
    } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(`${startDate}T00:00:00Z`);
      }
      if (endDate) {
        query.date.$lte = new Date(`${endDate}T23:59:59Z`);
      }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let bookingsQuery = Booking.find(query)
      .populate("userId", "name email mobileNumber")
      .populate("salonId", "salonName salonAddress salonPhotos")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    let bookings = await bookingsQuery.exec();

    if (search) {
      const searchRegex = new RegExp(search, "i");
      bookings = bookings.filter((booking) =>
        booking.userId?.name?.match(searchRegex)
      );
    }
    const totalBookings = await Booking.countDocuments(query);

    res.status(200).json({
      bookings,
      totalBookings,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalBookings / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.find({ userId: userId }).populate(
      "salonId",
      "salonName salonAddress salonTitle salonPhotos"
    );
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
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
    } = req.query;

    const query = { salonId };
    if (status) {
      query.status = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(`${startDate}T00:00:00Z`);
      }
      if (endDate) {
        query.date.$lte = new Date(`${endDate}T23:59:59Z`);
      }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let bookingsQuery = Booking.find(query)
      .populate({
        path: "userId",
        select: "name mobileNumber email",
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    let bookings = await bookingsQuery.exec();
    if (search) {
      const searchRegex = new RegExp(search, "i");
      bookings = bookings.filter((booking) =>
        booking.userId?.name?.match(searchRegex)
      );
    }
    const totalBookings = await Booking.countDocuments(query);
    res.status(200).json({
      bookings,
      totalBookings,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalBookings / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = "Confirmed";
    booking.paymentStatus = "Paid";
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

        new payin({
          userId: booking.userId,
          amount: totalAmount,
          name: user.name || "User",
          mobile: user.mobileNumber || "N/A",
          email: user.email || "N/A",
          status: "Approved",
          utr: null,
          trans_mode: "wallet",
          description: `Refund for cancelled booking`,
        }).save({ session }),

        new payout({
          userId: admin._id,
          amount: adminCommission,
          name: admin.name || "Admin",
          mobile: admin.mobileNumber || "N/A",
          email: admin.email || "N/A",
          status: "Approved",
          utr: null,
          trans_mode: "wallet",
          description: `Commission reversed for cancelled booking #${booking._id}`,
        }).save({ session }),

        new payout({
          userId: salon.salonowner._id,
          amount: ownerAmount,
          name: salon.name || "Salon Owner",
          mobile: salon.mobileNumber || "N/A",
          email: salon.email || "N/A",
          status: "Approved",
          utr: null,
          trans_mode: "wallet",
          description: `Payment reversed for cancelled booking #${booking._id}`,
        }).save({ session })
      ]);

      booking.status = "Cancelled";
      booking.paymentStatus = "Paid";
      booking.cancelReason = cancelReason;
      booking.refundAmount = totalAmount;
      await booking.save({ session });

      if (user.notificationToken) {
        sendPushNotification(user.notificationToken, "Book Cancelled", `Your booking at ${salon.salonName} is Cancelled for ${booking?.date} at ${booking?.timeSlot}.`, {
          "id": math.random().toString(36).substring(2, 15),
          "type": "appointment",
        });
      }
      if(user.referredBy) {
        cancelReferralReward(savedBooking);
      }
      res.status(200).json({
        message: "Booking cancelled successfully",
        bookingId: booking._id,
        refundAmount: totalAmount,
      });
    });
  } catch (error) {
    console.log (error)
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
      }
    }
    booking.status = "Completed";
    await booking.save();

    if (user.notificationToken) {
      sendPushNotification(user.notificationToken, "Booking Completed", `Your booking at ${booking.salonId} is completed.`, {
        "id": booking._id,
        "type": "booking",
      });
    }
    res
      .status(200)
      .json({
        message:
          "Booking completed successfully, referral bonus applied if eligible",
        booking,
      });
  } catch (error) {
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
    await booking.save();

    res.status(200).json({
      message: "Booking marked as completed successfully by owner.",
      booking,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};