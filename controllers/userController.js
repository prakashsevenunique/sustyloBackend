const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateOtp, verifyOtp, sendOtp } = require("../utils/otpService");
const crypto = require("crypto");
const Salon = require("../models/salon");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const payin = require("../models/payin");
const fs = require("fs").promises;

exports.sendOtpController = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }
    let user = await User.findOne({ mobileNumber });

    const otp = await generateOtp(mobileNumber);
    const smsResult = await sendOtp(mobileNumber, otp);

    return smsResult.success
      ? res
        .status(200)
        .json({
          message: "OTP sent successfully",
          existing: user ? true : false,
        })
      : res.status(400).json({ message: smsResult.message });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.verifyOTPController = async (req, res) => {
  try {
    const { mobileNumber, otp, referralCode, role } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

    const userRole = role || "user";

    const verificationResult = await verifyOtp(mobileNumber, otp);
    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    let user = await User.findOne({ mobileNumber });

    if (user) {
      const token = jwt.sign(
        { userId: user._id, mobileNumber: user.mobileNumber, role: user.role },
        process.env.JWT_SECRET
      );
      user.token = token;
      await user.save();

      return res.status(200).json({
        message: "OTP verified successfully",
        user,
        token
      });
    }

    let referredByUser = null;

    if (userRole === "user" && referralCode) {
      referredByUser = await User.findOne({ referralCode });
      if (!referredByUser) {
        return res.status(400).json({ message: "Invalid referral code" });
      }
    }

    const newReferralCode = userRole === "user" ? `SALON${Math.floor(1000 + Math.random() * 9000)}` : null;

    user = new User({
      mobileNumber,
      role: userRole,
      referralCode: newReferralCode,
      referredBy: referredByUser ? referredByUser._id : null,
    });

    await user.save();

    const wallet = new Wallet({
      user: user._id,
      balance: referredByUser ? 100 : 0,
    });
    await wallet.save();

    if (referredByUser) {
      await payin.create({
        userId: user._id,
        amount: 100,
        reference: crypto.randomUUID(),
        name: user.name || "Unnamed",
        mobile: user.mobileNumber || "N/A",
        email: user.email || "N/A",
        description: "Referral Bonus",
        status: "Approved",
        trans_mode: "Wallet",
        utr: null
      });
    }

    user.wallet = wallet._id;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, mobileNumber: user.mobileNumber, role: user.role },
      process.env.JWT_SECRET
    );

    user.token = token;
    await user.save();

    return res.status(200).json({
      message: "OTP verified successfully",
      user,
      token,
    });

  } catch (error) {
    console.error("Error in verifyOTPController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateLocation = async (req, res) => {
  try {

    const { mobileNumber, latitude, longitude, notificationToken } = req.body;

    if (!mobileNumber || !latitude || !longitude) {
      console.log("Missing fields:", { mobileNumber, latitude, longitude });
      return res
        .status(400)
        .json({ error: "Mobile number and location required" });
    }

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      console.log("User not found for mobile number:", mobileNumber);
      return res.status(404).json({ error: "User not found" });
    }

    if (
      user.location &&
      user.location.latitude === latitude &&
      user.location.longitude === longitude
    ) {
      return res.json({
        message: "Location is already up to date",
        location: user.location,
      });
    }

    if (notificationToken) {
      user.notificationToken = notificationToken || "";
    }
    user.location = { latitude, longitude };
    await user.save();

    res.json({
      message: "Location updated successfully",
      location: user.location,
    });
  } catch (error) {
    console.error("Update Location Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, gender } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json("No user found");
    }

    const updateData = {
      name,
      email,
      gender,
    };

    const userData = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("wallet");

    if (!userData) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile updated successfully", userData });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.addProfilePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.files || !req.files["profileImage"]) {
      return res.status(400).json({ error: "Profile photo is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newPhotoPath = req.files["profileImage"][0].path;

    // If there's an old photo, delete it
    const deleteOldPhoto = user.profilePhoto
      ? fs.unlink(user.profilePhoto).catch((err) => {
        console.warn("Old photo deletion warning:", err.message);
      })
      : Promise.resolve();

    // Set the new photo path
    user.profilePhoto = newPhotoPath;

    // Save user and delete old photo in parallel
    await Promise.all([user.save(), deleteOldPhoto]);

    res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      photoPath: newPhotoPath,
    });
  } catch (error) {
    console.error("Add Profile Photo Error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId)
      .select("-password")
      .populate("wallet", "balance");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    let salon = null;
    if (user.role === "shop_owner") {
      salon = await Salon.findOne({ salonowner: user._id }).populate("salonowner");
    }

    return res.status(200).json({
      message: "User details fetched successfully",
      user,
      salon
    });
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      role,
      mobileNumber,
      name,
    } = req.query;

    const filter = {};

    if (role) filter.role = role;
    if (mobileNumber) filter.mobileNumber = new RegExp(mobileNumber, "i");
    if (name) filter.name = new RegExp(name, "i");

    const users = await User.find(filter)
      .populate("wallet")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      users,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("wallet");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Get User by ID Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getReferralCode = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ referralCode: user.referralCode });
  } catch (error) {
    console.error("Error fetching referral code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("name email profilePhoto");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const salons = await Salon.find({
      "reviews.userId": new mongoose.Types.ObjectId(userId),
    })
      .select("salonName salonPhotos salonAddress reviews")
      .populate("reviews.userId", "name profilePhoto");

    const userReviews = [];

    salons.forEach((salon) => {
      salon.reviews.forEach((review) => {
        if (
          (review.userId?._id?.toString() || review.userId?.toString()) ===
          userId
        ) {
          userReviews.push({
            salon: {
              id: salon._id,
              name: salon.salonName,
              address: salon.salonAddress,
              mainPhoto: salon.salonPhotos[0] || null,
            },
            review: {
              id: review._id,
              rating: review.rating,
              comment: review.comment,
              date: review.createdAt,
            },
            user: {
              name: user.name,
              photo: user.profilePhoto,
            },
          });
        }
      });
    });

    userReviews.sort((a, b) => b.review.date - a.review.date);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      totalReviews: userReviews.length,
      reviews: userReviews,
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user reviews",
      error: error.message,
    });
  }
};
