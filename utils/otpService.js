const axios = require("axios");
const OTP = require("../models/otpModel"); // ✅ OTP model import karein

// ✅ Generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// ✅ Send OTP via Fast2SMS
const sendOtp = async (mobileNumber, otp) => {
  try {
    const apiKey = "8Ke0teaW2mo5i6yh7A06YzMookM9RjGrTKSsd5AlJEm2gOozuql50GOqKm4e"; // 🔹 Replace with actual API Key
    const senderId = "FINUNI"; // 🔹 Replace with approved sender ID
    const message = `Dear user, Your OTP for login is ${otp}. Do not share with anyone - Finunique Small Pvt. Ltd.`;

    if (!apiKey || !senderId) {
      console.error("❌ Missing API Key or Sender ID");
      throw new Error("Fast2SMS API key or Sender ID is missing");
    }

    const params = {
      route: "q",
      sender_id: senderId,
      message,
      language: "english",
      numbers: mobileNumber,
    };

    console.log("📤 Sending OTP with Params:", params); // ✅ Debugging log

    const response = await axios.post("https://www.fast2sms.com/dev/bulkV2", params, {
      headers: { authorization: apiKey }, // ✅ API key in the header
    });

    console.log("✅ Fast2SMS Response:", response.data);

    if (response.data.return) {
      // ✅ Save OTP in DB with Expiry (5 mins)
      await OTP.create({ mobileNumber, otp, createdAt: new Date() });
      return { success: true, message: "OTP sent successfully" };
    } else {
      return { success: false, message: response.data.message || "Failed to send OTP" };
    }
  } catch (error) {
    if (error.response) {
      console.error("❌ Error in sendOtp - Response Error:", error.response.data);
      return { success: false, message: error.response.data.message || "Failed to send OTP" };
    } else {
      console.error("❌ Error in sendOtp - General Error:", error.message);
      return { success: false, message: "Error sending OTP" };
    }
  }
};

// ✅ Verify OTP Function
const verifyOtp = async (mobileNumber, otp) => {
  try {
    const storedOtp = await OTP.findOne({ mobileNumber });

    if (!storedOtp) {
      return { success: false, message: "OTP has expired or is invalid, request a new one" };
    }

    // ✅ Check OTP Expiry (5 minutes)
    const now = new Date();
    const otpAge = (now - storedOtp.createdAt) / 60000; // Convert milliseconds to minutes
    if (otpAge > 5) {
      await OTP.deleteOne({ mobileNumber }); // Expired OTP delete karna
      return { success: false, message: "OTP has expired, request a new one" };
    }

    if (storedOtp.otp !== otp) {
      return { success: false, message: "Invalid OTP" };
    }

    // ✅ Delete OTP after successful verification
    await OTP.deleteOne({ mobileNumber });

    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error("❌ Error in verifyOtp:", error);
    return { success: false, message: "Error verifying OTP" };
  }
};

// ✅ Export Functions
module.exports = { generateOtp, sendOtp, verifyOtp };
