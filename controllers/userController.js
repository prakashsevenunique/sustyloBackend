const User = require("../models/User");
const {generateOtp, verifyOtp , sendOtp } = require("../utils/otpService");
const bcrypt = require("bcryptjs");
const OTP = require("../models/otpModel");

// ✅ Send OTP
// Send OTP to the user
exports.sendOtpController = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // ✅ Generate and Send OTP
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

// ✅ OTP Verify & User Login API
exports.verifyOTPController = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

    // ✅ Verify OTP (अब 5 मिनट एक्सपायरी भी चेक होगी)
    const verificationResult = await verifyOtp(mobileNumber, otp);

    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    // ✅ Check if user exists, else create new user
    let user = await User.findOne({ mobileNumber });

    if (!user) {
      user = new User({ mobileNumber, role: "user" });
      await user.save();
    }

    return res.status(200).json({ message: "OTP verified successfully", user });
  } catch (error) {
    console.error("Error in verifyOTPController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Update User Location (Every login)
exports.updateLocation = async (req, res) => {
  try {
    console.log("Received request body:", req.body); // Debugging log

    const { mobileNumber, latitude, longitude } = req.body;

    if (!mobileNumber || !latitude || !longitude) {
      console.log("Missing fields:", { mobileNumber, latitude, longitude }); // Debug log
      return res.status(400).json({ error: "Mobile number and location required" });
    }

    const user = await User.findOneAndUpdate(
      { mobileNumber },
      { location: { latitude, longitude } },
      { new: true }
    );

    if (!user) {
      console.log("User not found for mobile number:", mobileNumber);
      return res.status(404).json({ error: "User not found" });
    }

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

