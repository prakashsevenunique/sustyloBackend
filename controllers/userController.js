// userController.js
const User = require("../models/User");
const { generateOTP, sendOTP } = require("../utils/otpService");

// sendOTP method
exports.sendOTP = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const otp = generateOTP();
  let user = await User.findOne({ phone });

  if (!user) {
    user = new User({
      phone,
      role: "user",
      otp,
      otpExpiry: new Date(Date.now() + 5 * 60000), // OTP expires in 5 minutes
     
    });
  } else {
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60000);``
  }

  await user.save();

  try {
    const otpResponse = await sendOTP(phone, otp);
    if (!otpResponse.success) {
      return res.status(500).json({ error: "Failed to send OTP. Try again later." });
    }
    res.json({ success: true, message: "OTP sent successfully", phone });
  } catch (error) {
    return res.status(500).json({ error: "OTP service temporarily unavailable" });
  }
};

exports.verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.otp !== otp || new Date() > user.otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  res.json({ success: true, message: "Login successful", user });
};

// ✅ Update User Location (Every login)
exports.updateLocation = async (req, res) => {
  const { phone, latitude, longitude } = req.body;

  if (!phone || !latitude || !longitude) {
    return res.status(400).json({ error: "Phone number and location required" });
  }

  const user = await User.findOneAndUpdate(
    { phone },
    { location: { latitude, longitude } },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ message: "Location updated successfully", location: user.location });
};

// ✅ Update user profile
exports.updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { name, email, gender } = req.body;

  if (!name || !email) return res.status(400).json({ error: "Name and email required" });

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { name, email, gender },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("wallet");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("wallet");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
