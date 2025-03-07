const User = require("../models/User");
const { generateOTP, sendOTP } = require("../utils/otpService");

// Send OTP for Registration/Login
exports.sendOTP = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const otp = generateOTP();

  let user = await User.findOne({ phone });

  if (!user) {
    user = new User({ phone, role: "user", otp, otpExpiry: new Date(Date.now() + 5 * 60000) });
  } else {
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60000);
  }

  await user.save();
  const otpResponse = await sendOTP(phone, otp);
  res.json(otpResponse);
};

// Verify OTP & Login
exports.verifyOTP = async (req, res) => {
  const { phone, otp, latitude, longitude } = req.body;

  const user = await User.findOne({ phone });
  if (!user || user.otp !== otp || new Date() > user.otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  // Clear OTP after successful login
  user.otp = null;
  user.otpExpiry = null;

  // Update location if provided
  if (latitude && longitude) {
    user.location = { latitude, longitude };
  }

  await user.save();
  res.json({ message: "Login successful", user });
};

// Update User Location (Called when app opens)
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
