const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const {generateOtp, verifyOtp , sendOtp } = require("../utils/otpService");
const bcrypt = require("bcryptjs");
const OTP = require("../models/otpModel");
const crypto = require("crypto");
const referralService = require("../services/referralService");
const { addReferralBonus } = require("../services/referralService");
const Salon = require("../models/salon");
const mongoose = require('mongoose');


exports.sendOtpController = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

   
    const otp = await generateOtp(mobileNumber);
    const smsResult = await sendOtp(mobileNumber, otp);

    return smsResult.success
      ? res.status(200).json({ message: "OTP sent successfully" })
      : res.status(400).json({ message: smsResult.message });
  } catch (error) {
    console.error("Error in sendOtpController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const generateReferralCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();

exports.verifyOTPController = async (req, res) => {
  try {
    const { mobileNumber, otp, referralCode } = req.body;
    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

  
    const verificationResult = await verifyOtp(mobileNumber, otp);
    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    let user = await User.findOne({ mobileNumber });

    if (!user) {
      let referredByUser = null;

      
      if (referralCode) {
        referredByUser = await User.findOne({ referralCode });
        if (!referredByUser) {
          return res.status(400).json({ message: "Invalid referral code" });
        }
      }

     
      const newReferralCode = `SALON${Math.floor(1000 + Math.random() * 9000)}`;

     
      user = new User({
        mobileNumber,
        role: "user",
        referralCode: newReferralCode,
        referredBy: referredByUser ? referredByUser._id : null,
      });

      await user.save();

     
      const wallet = new Wallet({
        user: user._id,
        balance: 100,
      });

      await wallet.save();

     
      user.wallet = wallet._id;
      await user.save();

     
      if (referredByUser) {
        await addReferralBonus(referredByUser._id, user._id);
      }
    }

   
    const token = jwt.sign(
      { userId: user._id, mobileNumber: user.mobileNumber },
      process.env.JWT_SECRET
    );

    
    user.token = token;
    await user.save();

    return res.status(200).json({
      message: "OTP verified successfully",
      user,
      wallet: await Wallet.findOne({ user: user._id }),
      token,
    });
  } catch (error) {
    console.error("Error in verifyOTPController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};  


exports.updateLocation = async (req, res) => {
  try {
    console.log("Received request body:", req.body);

    const { mobileNumber, latitude, longitude } = req.body;

    if (!mobileNumber || !latitude || !longitude) {
      console.log("Missing fields:", { mobileNumber, latitude, longitude });
      return res.status(400).json({ error: "Mobile number and location required" });
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
      console.log("Same location, no update needed.");
      return res.json({ message: "Location is already up to date", location: user.location });
    }

    
    user.location = { latitude, longitude };
    await user.save();

    res.json({ message: "Location updated successfully", location: user.location });
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

    const user = await User.findByIdAndUpdate(
      id,
      { name, email, gender },
      { new: true }
  ).populate("wallet");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const userId = req.user.userId;

   
    const user = await User.findById(userId).select("-password").populate('wallet', "balance");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User details fetched successfully",
      user
    });
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("wallet");
    res.json(users);
  } catch (error) {
    console.error("Get All Users Error:", error);
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

    const user = await User.findById(userId).select('name email profilePhoto');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    const salons = await Salon.find({
      "reviews.userId": new mongoose.Types.ObjectId(userId)
    })
    .select('salonName salonPhotos salonAddress reviews')
    .populate('reviews.userId', 'name profilePhoto');

    const userReviews = [];
    
    salons.forEach(salon => {
      salon.reviews.forEach(review => {
        if (
          (review.userId?._id?.toString() || review.userId?.toString()) === userId
        ) {
          userReviews.push({
            salon: {
              id: salon._id,
              name: salon.salonName,
              address: salon.salonAddress,
              mainPhoto: salon.salonPhotos[0] || null
            },
            review: {
              id: review._id,
              rating: review.rating,
              comment: review.comment,
              date: review.createdAt
            },
            user: {
              name: user.name,
              photo: user.profilePhoto
            }
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
        email: user.email
      },
      totalReviews: userReviews.length,
      reviews: userReviews
    });

  } catch (error) {
    console.error("Error fetching user reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user reviews",
      error: error.message
    });
  }
};