const axios = require("axios");

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Fast2SMS
const sendOTP = async (phone, otp) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "dlt", // Correct route
        sender_id: "FINUNI", // Required sender ID
        message: "178946", // Template ID from Fast2SMS
        variables_values: otp, // OTP to be sent
        flash: 0,
        numbers: phone, // User's phone number
      },
      {
        headers: {
          Authorization: "tzg6ZUWkBAIUwoDHyL9vIJcMGnFqUPbkvL2Jw8irMZZ4GDCenBXBsbODOez5",
          "Content-Type": "application/json", // Required for JSON requests
        },
      }
    );

    return { success: true, message: "OTP sent successfully", response: response.data };
  } catch (error) {
    console.error("OTP sending failed:", error.response?.data || error.message);
    return { success: false, message: "Failed to send OTP" };
  }
};

module.exports = { generateOTP, sendOTP };