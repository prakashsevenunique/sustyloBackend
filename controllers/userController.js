const User = require("../models/User");
const {generateOtp, verifyOtp , sendOtp } = require("../utils/otpService");
const bcrypt = require("bcryptjs");

// ✅ Send OTP
// Send OTP to the user
exports.sendOtpController = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Generate OTP
    const otp = await generateOtp(mobileNumber);

    // Send OTP via SMS
    const smsResult = await sendOtp(mobileNumber, otp);
    //console.log("otp", smsResult);

    if (smsResult.success) {
      return res.status(200).json({ message: "OTP sent successfully" });
    } else {
      return res.status(400).json({ message: smsResult.message });
    }
  } catch (error) {
    console.error("Error in sendOtpController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Verify OTP controller
exports.verifyOTPController = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

    // ✅ Verify OTP
    const verificationResult = await verifyOtp(mobileNumber, otp);

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    // ✅ Check if user already exists
    let user = await User.findOne({ phone: mobileNumber });

    if (!user) {
      // ✅ Create a new user if not found
      user = new User({
        phone: mobileNumber,
        role: "user", // Default role
      });
      await user.save();
    }

    return res.status(200).json({
      message: "OTP verified successfully",
      user,
    });
  } catch (error) {
    console.error("Error in verifyOTPController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Update User Location (Every login)
exports.updateLocation = async (req, res) => {
  try {
    const { phone, latitude, longitude } = req.body;

    if (!phone || !latitude || !longitude) {
      return res.status(400).json({ error: "Phone number and location required" });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { location: { latitude, longitude } },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Location updated successfully", location: user.location });
  } catch (error) {
    console.error("Update Location Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Update User Profile
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
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("wallet");
    res.json(users);
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get User by ID
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
